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

// Supabase Auth 영문 에러 → 한글 변환
const ERROR_KO: Record<string, string> = {
  'Invalid login credentials': '이메일 또는 비밀번호가 올바르지 않습니다',
  'Email not confirmed': '이메일 인증이 완료되지 않았습니다',
  'User already registered': '이미 가입된 이메일입니다',
  'Password should be at least 6 characters': '비밀번호는 6자 이상이어야 합니다',
  'Unable to validate email address: invalid format': '올바른 이메일 형식이 아닙니다',
  'Signup requires a valid password': '유효한 비밀번호를 입력해주세요',
  'User not found': '사용자를 찾을 수 없습니다',
  'Email rate limit exceeded': '요청이 너무 많습니다. 잠시 후 다시 시도해주세요',
  'For security purposes, you can only request this after': '보안상 잠시 후 다시 시도해주세요',
  'Error sending confirmation email': '확인 이메일 전송에 실패했습니다',
  'Signups not allowed for this instance': '현재 회원가입이 비활성화되어 있습니다',
};

function toKorean(msg: string): string {
  if (ERROR_KO[msg]) return ERROR_KO[msg];
  // 부분 매칭 (Supabase 에러 메시지가 추가 정보를 포함할 수 있음)
  for (const [en, ko] of Object.entries(ERROR_KO)) {
    if (msg.includes(en)) return ko;
  }
  return msg;
}

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
          error: { code: 'VALIDATION_ERROR', message: '이메일과 비밀번호를 입력해주세요' },
        });
      }

      const { data, error } = await app.supabase.auth.signUp({ email, password });
      if (error) {
        return reply.status(400).send({
          error: { code: 'VALIDATION_ERROR', message: toKorean(error.message) },
        });
      }
      if (!data.user || !data.session) {
        return reply.status(400).send({
          error: {
            code: 'VALIDATION_ERROR',
            message: '회원가입이 완료되지 않았습니다 — 이메일 인증이 필요할 수 있습니다',
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
          role: 'pending',
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
          error: { code: 'VALIDATION_ERROR', message: '이메일과 비밀번호를 입력해주세요' },
        });
      }

      const { data, error } = await app.supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) {
        return reply.status(401).send({
          error: { code: 'UNAUTHORIZED', message: toKorean(error.message) },
        });
      }

      const { data: profile } = await app.supabaseAdmin
        .from('user_profiles')
        .select('nickname, role')
        .eq('id', data.user.id)
        .single();

      const response: AuthResponse = {
        user: {
          id: data.user.id,
          email: data.user.email!,
          nickname: profile?.nickname ?? null,
          role: (profile?.role as AuthResponse['user']['role']) ?? 'pending',
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
          error: { code: 'VALIDATION_ERROR', message: '리프레시 토큰이 필요합니다' },
        });
      }

      const { data, error } = await app.supabase.auth.refreshSession({
        refresh_token: refreshToken,
      });
      if (error || !data.session) {
        return reply.status(401).send({
          error: {
            code: 'UNAUTHORIZED',
            message: toKorean(error?.message ?? '세션 갱신에 실패했습니다'),
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
