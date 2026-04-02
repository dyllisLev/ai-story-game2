import { type EnvConfig } from './config.js';
declare module 'fastify' {
    interface FastifyInstance {
        config: EnvConfig;
        redisClient?: import('ioredis').Redis | null;
        cache: import('./services/cache.js').CacheService;
    }
}
