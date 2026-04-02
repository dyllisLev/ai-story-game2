import Redis from 'ioredis';
import type { EnvConfig } from '../config.js';
/**
 * Creates or returns an existing Redis client instance
 * @param config - Environment configuration
 * @returns Redis client instance or null if REDIS_URL is not configured
 */
export declare function getRedisClient(config: EnvConfig): Redis | null;
/**
 * Closes the Redis connection if it exists
 */
export declare function closeRedisClient(): Promise<void>;
