import type { Redis } from 'ioredis';
import type { FastifyInstance } from 'fastify';
/**
 * Cache configuration
 */
export interface CacheConfig {
    /** Time to live in seconds */
    ttl?: number;
    /** Cache tags for invalidation */
    tags?: string[];
}
/**
 * Cache service with Redis backend and memory fallback
 */
export declare class CacheService {
    private app;
    private redis;
    private memory;
    private enabled;
    private prefix;
    constructor(app: FastifyInstance, redis: Redis | null, options?: {
        prefix?: string;
        enabled?: boolean;
    });
    /**
     * Generate cache key with prefix
     */
    private getKey;
    /**
     * Parse cache key (remove prefix)
     */
    private parseKey;
    /**
     * Get value from cache
     */
    get<T>(key: string): Promise<T | null>;
    /**
     * Set value in cache
     */
    set<T>(key: string, value: T, config?: CacheConfig): Promise<void>;
    /**
     * Delete specific key from cache
     */
    delete(key: string): Promise<void>;
    /**
     * Invalidate all cache entries with a specific tag
     */
    invalidateByTag(tag: string): Promise<number>;
    /**
     * Clear all cache entries
     */
    clear(): Promise<void>;
    /**
     * Get cache statistics
     */
    getStats(): Promise<{
        backend: string;
        size: number;
        redisAvailable: boolean;
    }>;
    /**
     * Generate tag key
     */
    private getTagKey;
}
/**
 * Initialize cache service
 */
export declare function initCache(app: FastifyInstance): CacheService;
/**
 * Get cache service instance
 */
export declare function getCache(): CacheService | null;
/**
 * Helper function to cache database queries
 */
export declare function cachedQuery<T>(cache: CacheService, key: string, query: () => Promise<T>, config?: CacheConfig): Promise<T>;
/**
 * Cache tag constants for invalidation
 */
export declare const CacheTags: {
    /** All config data */
    readonly CONFIG: "config";
    /** All status presets */
    readonly STATUS_PRESETS: "status_presets";
    /** All user profiles */
    readonly USER_PROFILES: "user_profiles";
    /** Specific user profile: user:{userId} */
    readonly USER: (userId: string) => string;
    /** All stories */
    readonly STORIES: "stories";
    /** Specific story: story:{storyId} */
    readonly STORY: (storyId: string) => string;
    /** All sessions */
    readonly SESSIONS: "sessions";
    /** Specific session: session:{sessionId} */
    readonly SESSION: (sessionId: string) => string;
};
/**
 * Cache TTL constants (in seconds)
 */
export declare const CacheTTL: {
    /** 5 minutes - frequently changing data */
    readonly SHORT: 300;
    /** 1 hour - moderately changing data */
    readonly MEDIUM: 3600;
    /** 1 day - rarely changing data */
    readonly LONG: 86400;
    /** 1 week - almost static data */
    readonly VERY_LONG: 604800;
};
