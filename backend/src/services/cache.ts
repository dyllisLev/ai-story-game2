// backend/src/services/cache.ts
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
 * Cache entry structure
 */
interface CacheEntry<T> {
  data: T;
  expires: number;
  tags: string[];
}

/**
 * In-memory cache fallback
 */
class MemoryCache {
  private cache = new Map<string, CacheEntry<any>>();
  private tagIndex = new Map<string, Set<string>>();

  set<T>(key: string, value: T, ttl: number, tags: string[]): void {
    const expires = Date.now() + ttl * 1000;
    this.cache.set(key, { data: value, expires, tags });

    // Update tag index
    for (const tag of tags) {
      if (!this.tagIndex.has(tag)) {
        this.tagIndex.set(tag, new Set());
      }
      this.tagIndex.get(tag)!.add(key);
    }
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    // Check expiration
    if (Date.now() > entry.expires) {
      this.delete(key);
      return null;
    }

    return entry.data as T;
  }

  delete(key: string): void {
    const entry = this.cache.get(key);
    if (entry) {
      // Remove from tag index
      for (const tag of entry.tags) {
        this.tagIndex.get(tag)?.delete(key);
      }
      this.cache.delete(key);
    }
  }

  invalidateByTag(tag: string): number {
    const keys = this.tagIndex.get(tag);
    if (!keys) return 0;

    let count = 0;
    for (const key of keys) {
      this.cache.delete(key);
      count++;
    }

    this.tagIndex.delete(tag);
    return count;
  }

  clear(): void {
    this.cache.clear();
    this.tagIndex.clear();
  }

  get size(): number {
    return this.cache.size;
  }
}

/**
 * Cache service with Redis backend and memory fallback
 */
export class CacheService {
  private redis: Redis | null;
  private memory: MemoryCache;
  private enabled: boolean;
  private prefix: string;

  constructor(
    private app: FastifyInstance,
    redis: Redis | null,
    options: { prefix?: string; enabled?: boolean } = {}
  ) {
    this.redis = redis;
    this.memory = new MemoryCache();
    this.enabled = options.enabled ?? true;
    this.prefix = options.prefix ?? 'cache:';

    if (!redis) {
      app.log.warn('Cache: Using memory cache (Redis not available)');
    } else {
      app.log.info('Cache: Using Redis backend');
    }
  }

  /**
   * Generate cache key with prefix
   */
  private getKey(key: string): string {
    return `${this.prefix}${key}`;
  }

  /**
   * Parse cache key (remove prefix)
   */
  private parseKey(key: string): string {
    return key.startsWith(this.prefix) ? key.slice(this.prefix.length) : key;
  }

  /**
   * Get value from cache
   */
  async get<T>(key: string): Promise<T | null> {
    if (!this.enabled) return null;

    const fullKey = this.getKey(key);

    // Try Redis first
    if (this.redis) {
      try {
        const value = await this.redis.get(fullKey);
        if (value) {
          return JSON.parse(value) as T;
        }
      } catch (error) {
        this.app.log.error({ error, key }, 'Cache: Redis get failed, falling back to memory');
      }
    }

    // Fallback to memory cache
    return this.memory.get<T>(key);
  }

  /**
   * Set value in cache
   */
  async set<T>(key: string, value: T, config: CacheConfig = {}): Promise<void> {
    if (!this.enabled) return;

    const { ttl = 3600, tags = [] } = config; // Default 1 hour TTL
    const fullKey = this.getKey(key);
    const serialized = JSON.stringify(value);

    // Try Redis first
    if (this.redis) {
      try {
        const pipeline = this.redis.pipeline();
        pipeline.set(fullKey, serialized, 'EX', ttl);

        // Add tags to Redis set for invalidation
        for (const tag of tags) {
          pipeline.sadd(this.getTagKey(tag), fullKey);
          pipeline.expire(this.getTagKey(tag), ttl + 60); // Keep tag sets alive longer
        }

        await pipeline.exec();
        return;
      } catch (error) {
        this.app.log.error({ error, key }, 'Cache: Redis set failed, using memory cache');
      }
    }

    // Fallback to memory cache
    this.memory.set(key, value, ttl, tags);
  }

  /**
   * Delete specific key from cache
   */
  async delete(key: string): Promise<void> {
    if (!this.enabled) return;

    const fullKey = this.getKey(key);

    if (this.redis) {
      try {
        await this.redis.del(fullKey);
      } catch (error) {
        this.app.log.error({ error, key }, 'Cache: Redis delete failed');
      }
    }

    this.memory.delete(key);
  }

  /**
   * Invalidate all cache entries with a specific tag
   */
  async invalidateByTag(tag: string): Promise<number> {
    if (!this.enabled) return 0;

    const tagKey = this.getTagKey(tag);
    let count = 0;

    if (this.redis) {
      try {
        // Get all keys with this tag
        const keys = await this.redis.smembers(tagKey);

        if (keys.length > 0) {
          // Delete all cached values
          await this.redis.del(...keys);
          // Delete the tag set
          await this.redis.del(tagKey);
          count = keys.length;
        }
      } catch (error) {
        this.app.log.error({ error, tag }, 'Cache: Redis tag invalidation failed');
        // Fallback to memory cache
        count = this.memory.invalidateByTag(tag);
      }
    } else {
      count = this.memory.invalidateByTag(tag);
    }

    this.app.log.debug({ tag, count }, 'Cache: Invalidated entries by tag');
    return count;
  }

  /**
   * Clear all cache entries
   */
  async clear(): Promise<void> {
    if (!this.enabled) return;

    if (this.redis) {
      try {
        // Get all keys with prefix
        const keys = await this.redis.keys(`${this.prefix}*`);

        if (keys.length > 0) {
          await this.redis.del(...keys);
        }
      } catch (error) {
        this.app.log.error({ error }, 'Cache: Redis clear failed');
      }
    }

    this.memory.clear();
    this.app.log.info('Cache: Cleared all entries');
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<{ backend: string; size: number; redisAvailable: boolean }> {
    const redisAvailable = this.redis !== null;

    if (redisAvailable) {
      try {
        const keys = await this.redis!.keys(`${this.prefix}*`);
        return {
          backend: 'redis',
          size: keys.length,
          redisAvailable: true,
        };
      } catch {
        // Redis failed, report memory stats
      }
    }

    return {
      backend: redisAvailable ? 'redis (failed)' : 'memory',
      size: this.memory.size,
      redisAvailable: false,
    };
  }

  /**
   * Generate tag key
   */
  private getTagKey(tag: string): string {
    return `${this.prefix}tag:${tag}`;
  }
}

/**
 * Cache service instance (initialized in server.ts)
 */
let cacheService: CacheService | null = null;

/**
 * Initialize cache service
 */
export function initCache(app: FastifyInstance): CacheService {
  const redis = (app as any).redisClient as Redis | null;
  cacheService = new CacheService(app, redis, {
    prefix: 'story-game:',
    enabled: true,
  });

  // Decorate app with cache service
  app.decorate('cache', cacheService);

  return cacheService;
}

/**
 * Get cache service instance
 */
export function getCache(): CacheService | null {
  return cacheService;
}

/**
 * Helper function to cache database queries
 */
export async function cachedQuery<T>(
  cache: CacheService,
  key: string,
  query: () => Promise<T>,
  config: CacheConfig = {}
): Promise<T> {
  // Try cache first
  const cached = await cache.get<T>(key);
  if (cached !== null) {
    return cached;
  }

  // Cache miss - execute query
  const result = await query();

  // Store in cache
  await cache.set(key, result, config);

  return result;
}

/**
 * Cache tag constants for invalidation
 */
export const CacheTags = {
  /** All config data */
  CONFIG: 'config',

  /** All status presets */
  STATUS_PRESETS: 'status_presets',

  /** All user profiles */
  USER_PROFILES: 'user_profiles',

  /** Specific user profile: user:{userId} */
  USER: (userId: string) => `user:${userId}`,

  /** All stories */
  STORIES: 'stories',

  /** Specific story: story:{storyId} */
  STORY: (storyId: string) => `story:${storyId}`,

  /** All sessions */
  SESSIONS: 'sessions',

  /** Specific session: session:{sessionId} */
  SESSION: (sessionId: string) => `session:${sessionId}`,
} as const;

/**
 * Cache TTL constants (in seconds)
 */
export const CacheTTL = {
  /** 5 minutes - frequently changing data */
  SHORT: 300,

  /** 1 hour - moderately changing data */
  MEDIUM: 3600,

  /** 1 day - rarely changing data */
  LONG: 86400,

  /** 1 week - almost static data */
  VERY_LONG: 604800,
} as const;
