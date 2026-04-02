// Redis client factory with graceful fallback
import Redis from 'ioredis';
let redisClient = null;
/**
 * Creates or returns an existing Redis client instance
 * @param config - Environment configuration
 * @returns Redis client instance or null if REDIS_URL is not configured
 */
export function getRedisClient(config) {
    // Return existing client if already created
    if (redisClient) {
        return redisClient;
    }
    // If no REDIS_URL provided, return null (graceful fallback to memory)
    if (!config.REDIS_URL) {
        return null;
    }
    try {
        // Create new Redis client
        redisClient = new Redis(config.REDIS_URL, {
            maxRetriesPerRequest: 3,
            retryStrategy: (times) => {
                if (times > 3) {
                    console.error('Redis connection failed after 3 retries, falling back to memory-based rate limiting');
                    return null; // Stop retrying
                }
                return Math.min(times * 100, 2000); // Exponential backoff
            },
            enableReadyCheck: true,
        });
        // Handle connection errors gracefully
        redisClient.on('error', (err) => {
            console.error('Redis connection error:', err.message);
        });
        redisClient.on('connect', () => {
            console.log('Redis client connected successfully');
        });
        return redisClient;
    }
    catch (error) {
        console.error('Failed to create Redis client:', error);
        return null;
    }
}
/**
 * Closes the Redis connection if it exists
 */
export async function closeRedisClient() {
    if (redisClient) {
        try {
            await redisClient.quit();
            redisClient = null;
            console.log('Redis client closed successfully');
        }
        catch (error) {
            console.error('Error closing Redis client:', error);
        }
    }
}
// Graceful shutdown on process termination
process.on('SIGINT', async () => {
    await closeRedisClient();
    process.exit(0);
});
process.on('SIGTERM', async () => {
    await closeRedisClient();
    process.exit(0);
});
//# sourceMappingURL=redis.js.map