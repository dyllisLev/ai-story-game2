// backend/src/routes/auth.ts
// POST /api/auth/signup  — create account
// POST /api/auth/login   — sign in
// POST /api/auth/logout  — invalidate session (requires auth)
// POST /api/auth/refresh — exchange refresh token
import type { FastifyInstance } from 'fastify';
import type {
  AuthSignupInput,
  AuthLoginInput,
  AuthResponse,
} from '@story-game/shared';

export default async function authRoutes(app: FastifyInstance) {
  // Tighter rate limit for auth endpoints
  const authRateConfig = { max: 5, timeWindow: '1 minute' };

  // POST /api/auth/signup
  app.post<{ Body: AuthSignupInput }>(
    '/api/auth/signup',
    { config: { rateLimit: authRateConfig } },
    async (request, reply) => {
      const { email, password, nickname } = request.body;
      if (!email || !password) {
        return reply.status(400).send({
          error: { code: 'VALIDATION_ERROR', message: 'email and password required' },
        });
      }

      const { data, error } = await app.supabase.auth.signUp({ email, password });
      if (error) {
        return reply.status(400).send({
          error: { code: 'VALIDATION_ERROR', message: error.message },
        });
      }
      if (!data.user || !data.session) {
        return reply.status(400).send({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Sign-up incomplete — email confirmation may be required',
          },
        });
      }

      if (nickname) {
        await app.supabaseAdmin
          .from('user_profiles')
          .update({ nickname })
          .eq('id', data.user.id);
      }

      const response: AuthResponse = {
        user: {
          id: data.user.id,
          email: data.user.email!,
          nickname: nickname ?? null,
          role: 'user',
        },
        accessToken: data.session.access_token,
        refreshToken: data.session.refresh_token,
      };

      return reply.status(201).send(response);
    }
  );

  // POST /api/auth/login
  app.post<{ Body: AuthLoginInput }>(
    '/api/auth/login',
    { config: { rateLimit: authRateConfig } },
    async (request, reply) => {
      const { email, password } = request.body;
      if (!email || !password) {
        return reply.status(400).send({
          error: { code: 'VALIDATION_ERROR', message: 'email and password required' },
        });
      }

      const { data, error } = await app.supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) {
        return reply.status(401).send({
          error: { code: 'UNAUTHORIZED', message: error.message },
        });
      }

      const { data: profile } = await app.supabaseAdmin
        .from('user_profiles')
        .select('nickname')
        .eq('id', data.user.id)
        .single();

      const isAdmin = data.user.app_metadata?.role === 'admin';

      const response: AuthResponse = {
        user: {
          id: data.user.id,
          email: data.user.email!,
          nickname: profile?.nickname ?? null,
          role: isAdmin ? 'admin' : 'user',
        },
        accessToken: data.session.access_token,
        refreshToken: data.session.refresh_token,
      };

      return reply.send(response);
    }
  );

  // POST /api/auth/logout
  app.post(
    '/api/auth/logout',
    async (_request, reply) => {
      await app.supabase.auth.signOut();
      return reply.status(204).send();
    }
  );

  // POST /api/auth/refresh
  app.post<{ Body: { refreshToken: string } }>(
    '/api/auth/refresh',
    { config: { rateLimit: authRateConfig } },
    async (request, reply) => {
      const { refreshToken } = request.body ?? {};
      if (!refreshToken) {
        return reply.status(400).send({
          error: { code: 'VALIDATION_ERROR', message: 'refreshToken required' },
        });
      }

      const { data, error } = await app.supabase.auth.refreshSession({
        refresh_token: refreshToken,
      });
      if (error || !data.session) {
        return reply.status(401).send({
          error: {
            code: 'UNAUTHORIZED',
            message: error?.message ?? 'Session refresh failed',
          },
        });
      }

      return reply.send({
        accessToken: data.session.access_token,
        refreshToken: data.session.refresh_token,
      });
    }
  );
}
