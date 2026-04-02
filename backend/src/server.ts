// backend/src/server.ts
import Fastify, { type FastifyError } from 'fastify';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import { loadConfig, type EnvConfig } from './config.js';
import { API_V1_PREFIX, API_HEALTH_ENDPOINT } from './constants.js';
import { getRedisClient } from './lib/redis.js';

const config = loadConfig();

declare module 'fastify' {
  interface FastifyInstance {
    config: EnvConfig;
    redisClient?: import('ioredis').Redis | null;
    cache: import('./services/cache.js').CacheService;
  }
}

const app = Fastify({
  logger: {
    level: config.NODE_ENV === 'production' ? 'info' : 'debug',
    transport: config.NODE_ENV === 'development'
      ? { target: 'pino-pretty' }
      : undefined,
    redact: ['req.headers["x-gemini-key"]', 'req.headers["authorization"]'],
  },
  trustProxy: true,
});

// config 데코레이터 (플러그인에서 app.config 접근용)
app.decorate('config', config);

// 에러 핸들러
app.setErrorHandler((error: FastifyError, request, reply) => {
  if (error.statusCode) {
    return reply.status(error.statusCode).send({
      error: {
        code: (error as any).code || 'INTERNAL_ERROR',
        message: error.message,
      },
    });
  }
  app.log.error(error);
  return reply.status(500).send({
    error: { code: 'INTERNAL_ERROR', message: 'Internal server error' },
  });
});

// CORS
await app.register(cors, {
  origin: config.NODE_ENV === 'development' ? config.CORS_ORIGIN : false,
  credentials: true, // Required for cookies
});

// Cookie support for httpOnly auth cookies
import cookie from '@fastify/cookie';
await app.register(cookie, {
  secret: config.API_KEY_ENCRYPTION_SECRET, // Use existing secret for cookie signing
});

// Swagger/OpenAPI documentation
import swagger from '@fastify/swagger';
import swaggerUI from '@fastify/swagger-ui';

await app.register(swagger, {
  openapi: {
    info: {
      title: 'AI Story Game API',
      description: 'Interactive AI-powered storytelling platform API',
      version: '1.0.0',
      contact: {
        name: 'API Support',
        email: 'api@example.com',
      },
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Development server',
      },
      {
        url: 'https://api.example.com',
        description: 'Production server',
      },
    ],
    tags: [
      { name: 'Stories', description: 'Story management endpoints' },
      { name: 'Sessions', description: 'Game session endpoints' },
      { name: 'Game', description: 'Gameplay endpoints' },
      { name: 'Auth', description: 'Authentication endpoints' },
      { name: 'User', description: 'User profile endpoints' },
      { name: 'Config', description: 'Configuration endpoints' },
      { name: 'Admin', description: 'Admin dashboard endpoints' },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
  },
});

await app.register(swaggerUI, {
  routePrefix: '/docs',
  uiConfig: {
    docExpansion: 'list',
    deepLinking: false,
    persistAuthorization: true,
  },
  staticCSP: true,
});

// Rate limiting - Redis-backed with graceful fallback to memory
const redisClient = getRedisClient(config);
const rateLimitStorage = redisClient ? { redis: redisClient } : {};

if (redisClient) {
  app.log.info('Rate limiting: Using Redis storage (distributed)');
} else {
  app.log.warn('Rate limiting: Using memory storage (not distributed - configure REDIS_URL for production)');
}

await app.register(rateLimit, {
  max: 60,
  timeWindow: '1 minute',
  allowList: (req) => req.url === API_HEALTH_ENDPOINT,
  ...rateLimitStorage,
  skipOnError: true, // Don't block requests if Redis fails
});

// Cache service initialization (for data caching)
import { initCache } from './services/cache.js';
const cacheService = initCache(app);

// Decorate app with redis client for cache service
app.decorate('redisClient', redisClient);

// Supabase 플러그인
import supabasePlugin from './plugins/supabase.js';
await app.register(supabasePlugin);

// Config 캐시 플러그인
import configCachePlugin from './plugins/config-cache.js';
await app.register(configCachePlugin);

// Correlation ID 플러그인
import correlationPlugin from './plugins/correlation.js';
await app.register(correlationPlugin);

// Metrics collection 플러그인
import metricsPlugin from './plugins/metrics.js';
await app.register(metricsPlugin);

// Sentry 에러 트래킹 플러그인
import sentryPlugin from './plugins/sentry.js';
await app.register(sentryPlugin);

// Auth 플러그인
import authPlugin from './plugins/auth.js';
await app.register(authPlugin);

// Request logging plugin (Phase 2-B)
import requestLoggerPlugin from './plugins/request-logger.js';
await app.register(requestLoggerPlugin);

// Startup check: validate required config
try {
  const config = await app.getAppConfig();
  app.log.info('Config validation passed');
} catch (err) {
  app.log.error('Config validation failed: %s', err);
  process.exit(1);
}

// Health check endpoint (no rate limit, unversioned for monitoring)
app.get(API_HEALTH_ENDPOINT, async () => {
  let supabaseStatus = 'disconnected';
  try {
    const { error } = await app.supabaseAdmin.from('config').select('id').limit(1);
    supabaseStatus = error ? 'disconnected' : 'connected';
  } catch { /* disconnected */ }

  return {
    status: supabaseStatus === 'connected' ? 'ok' : 'degraded',
    supabase: supabaseStatus,
    uptime: process.uptime(),
    version: '1.0.0',
  };
});

// Routes - all versioned under /api/v1
import configRoutes from './routes/config.js';
await app.register(configRoutes, { prefix: API_V1_PREFIX });

import authRoutes from './routes/auth.js';
await app.register(authRoutes, { prefix: API_V1_PREFIX });

import gameRoutes from './routes/game/index.js';
await app.register(gameRoutes, { prefix: API_V1_PREFIX });

import sessionsRoutes from './routes/sessions/index.js';
await app.register(sessionsRoutes, { prefix: API_V1_PREFIX });

import meRoutes from './routes/me.js';
await app.register(meRoutes, { prefix: API_V1_PREFIX });

// Phase 2-B routes: stories CRUD, admin, presets
import { registerRoutes as registerPhase2Routes } from './routes/index.js';
await registerPhase2Routes(app);

// Start server
try {
  await app.listen({ port: config.PORT, host: '0.0.0.0' });
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
