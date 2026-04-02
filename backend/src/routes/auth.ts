// backend/src/routes/auth.ts
import type { FastifyReply, FastifyInstance } from 'fastify';
import type {
  AuthSignupInput,
  AuthLoginInput,
  AuthResponse,
} from '@story-game/shared';
import {
  AUTH_RATE_LIMITS,
  COOKIE_NAMES,
  TOKEN_EXPIRATION,
  extractCookieToken,
} from '../lib/auth-helpers.js';

/**
 * Set httpOnly authentication cookies
 * Access token expires in 1 hour, refresh token in 7 days
 */
function setAuthCookies(
  reply: FastifyReply,
  accessToken: string,
  refreshToken: string,
  isProduction: boolean
): void {
  const baseOptions = {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'strict' as const,
    path: '/' as const,
  };

  reply.setCookie(COOKIE_NAMES.ACCESS_TOKEN, accessToken, {
    ...baseOptions,
    maxAge: TOKEN_EXPIRATION.ACCESS,
  });

  reply.setCookie(COOKIE_NAMES.REFRESH_TOKEN, refreshToken, {
    ...baseOptions,
    maxAge: TOKEN_EXPIRATION.REFRESH,
  });
}

/**
 * Clear authentication cookies (logout)
 */
function clearAuthCookies(reply: FastifyReply): void {
  reply.clearCookie(COOKIE_NAMES.ACCESS_TOKEN, { path: '/' });
  reply.clearCookie(COOKIE_NAMES.REFRESH_TOKEN, { path: '/' });
}

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
  const authRateConfig = {
    max: AUTH_RATE_LIMITS.SIGNUP_MAX,
    timeWindow: AUTH_RATE_LIMITS.SIGNUP_WINDOW,
  };
  const refreshRateConfig = {
    max: AUTH_RATE_LIMITS.REFRESH_MAX,
    timeWindow: AUTH_RATE_LIMITS.REFRESH_WINDOW,
  };

  // POST /auth/signup
  app.post<{ Body: AuthSignupInput }>(
    '/auth/signup',
    {
      config: { rateLimit: authRateConfig },
      schema: {
        tags: ['Auth'],
        summary: 'Create a new user account',
        description: 'Register a new user account with email and password. Returns access and refresh tokens.',
        body: {
          type: 'object',
          required: ['email', 'password'],
          properties: {
            email: {
              type: 'string',
              format: 'email',
              description: 'User email address',
            },
            password: {
              type: 'string',
              minLength: 6,
              description: 'User password (minimum 6 characters)',
            },
            nickname: {
              type: 'string',
              description: 'Optional display name',
              minLength: 1,
              maxLength: 50,
            },
          },
        },
        response: {
          201: {
            description: 'Account created successfully. Tokens are set as httpOnly cookies.',
            type: 'object',
            properties: {
              user: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  email: { type: 'string' },
                  nickname: { type: ['string', 'null'] },
                  role: { type: 'string', enum: ['pending', 'user', 'admin'] },
                },
              },
            },
          },
          400: {
            description: 'Validation error or bad request',
            type: 'object',
            properties: {
              error: {
                type: 'object',
                properties: {
                  code: { type: 'string' },
                  message: { type: 'string' },
                },
              },
            },
          },
        },
      },
    },
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

      // Create user_profiles record with default role
      const { error: profileError } = await app.supabaseAdmin
        .from('user_profiles')
        .insert({
          id: data.user.id,
          nickname: nickname ?? null,
          role: 'pending',
        });

      if (profileError) {
        app.log.error(profileError, 'authRoutes POST /api/auth/signup: failed to create user_profiles');
      }

      const response: AuthResponse = {
        user: {
          id: data.user.id,
          email: data.user.email!,
          nickname: nickname ?? null,
          role: 'pending',
        },
      };

      setAuthCookies(reply, data.session.access_token, data.session.refresh_token, app.config.NODE_ENV === 'production');

      return reply.status(201).send(response);
    }
  );

  // POST /auth/login
  app.post<{ Body: AuthLoginInput }>(
    '/auth/login',
    {
      config: { rateLimit: authRateConfig },
      schema: {
        tags: ['Auth'],
        summary: 'Sign in with email and password',
        description: 'Authenticate a user and return access and refresh tokens.',
        body: {
          type: 'object',
          required: ['email', 'password'],
          properties: {
            email: {
              type: 'string',
              format: 'email',
              description: 'User email address',
            },
            password: {
              type: 'string',
              description: 'User password',
            },
          },
        },
        response: {
          200: {
            description: 'Login successful. Tokens are set as httpOnly cookies.',
            type: 'object',
            properties: {
              user: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  email: { type: 'string' },
                  nickname: { type: ['string', 'null'] },
                  role: { type: 'string', enum: ['pending', 'user', 'admin'] },
                },
              },
            },
          },
          401: {
            description: 'Authentication failed',
            type: 'object',
            properties: {
              error: {
                type: 'object',
                properties: {
                  code: { type: 'string' },
                  message: { type: 'string' },
                },
              },
            },
          },
          400: {
            description: 'Validation error',
            type: 'object',
            properties: {
              error: {
                type: 'object',
                properties: {
                  code: { type: 'string' },
                  message: { type: 'string' },
                },
              },
            },
          },
        },
      },
    },
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
      };

      setAuthCookies(reply, data.session.access_token, data.session.refresh_token, app.config.NODE_ENV === 'production');

      return reply.send(response);
    }
  );

  // POST /auth/logout
  app.post(
    '/auth/logout',
    async (_request, reply) => {
      const { error } = await app.supabase.auth.signOut();
      if (error) {
        return reply.status(500).send({
          error: { code: 'INTERNAL_ERROR', message: toKorean(error.message) },
        });
      }
      clearAuthCookies(reply);
      return reply.status(204).send();
    }
  );

  // POST /auth/refresh
  app.post<{ Body: { refreshToken: string } }>(
    '/auth/refresh',
    { config: { rateLimit: refreshRateConfig } },
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

      setAuthCookies(reply, data.session.access_token, data.session.refresh_token, app.config.NODE_ENV === 'production');

      return reply.send({});
    }
  );
}
