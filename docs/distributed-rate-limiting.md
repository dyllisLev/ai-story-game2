# Distributed Rate Limiting - Implementation Guide

**Version:** 1.0.0
**Implemented:** 2026-04-01
**Status:** ✅ Production Ready

## Overview

Implemented distributed rate limiting with Redis backend to support multi-instance deployments. The system includes graceful fallback to memory-based rate limiting for development environments.

## Architecture

### Rate Limiting Flow

```
Request → Fastify → @fastify/rate-limit → Redis (if configured)
                                                  ↓
                                            Memory (fallback)
```

### Current Status

- **Development:** Memory-based rate limiting (default)
- **Production:** Redis-backed rate limiting (when REDIS_URL is configured)
- **Behavior:** 60 requests per minute per IP address
- **Health Check:** Excluded from rate limiting

## Implementation Details

### Files Created

1. **backend/src/lib/redis.ts** - Redis client factory with graceful fallback
   - Connection management
   - Error handling
   - Graceful shutdown hooks

### Files Modified

1. **backend/package.json** - Added `ioredis` dependency
2. **backend/src/config.ts** - Added optional `REDIS_URL` configuration
3. **backend/src/server.ts** - Updated rate limiting to use Redis with fallback

### Configuration

**Environment Variables:**

```bash
# Optional - Redis connection URL
# If not provided, falls back to memory-based rate limiting
REDIS_URL=redis://localhost:6379

# Or for production with authentication:
REDIS_URL=redis://username:password@redis.example.com:6379
```

**Rate Limiting Configuration:**

```typescript
// backend/src/server.ts
await app.register(rateLimit, {
  max: 60,                    // Max requests per time window
  timeWindow: '1 minute',     // Time window
  allowList: (req) => req.url === API_HEALTH_ENDPOINT, // Exclude health endpoint
  redis: redisClient,         // Redis client (or undefined for memory)
  skipOnError: true,          // Don't block requests if Redis fails
});
```

## Graceful Fallback Strategy

### Development Environment (No REDIS_URL)

```
Server starts → No REDIS_URL → Use memory storage → Log warning message
```

**Behavior:**
- Rate limiting works using in-memory storage
- Warning logged: "Rate limiting: Using memory storage (not distributed)"
- Suitable for single-instance development

### Production Environment (REDIS_URL configured)

```
Server starts → REDIS_URL found → Connect to Redis → Use Redis storage
                                                    ↓
                                              If connection fails → Fallback to memory + log error
```

**Behavior:**
- Rate limiting uses Redis for distributed storage
- Success message logged: "Rate limiting: Using Redis storage (distributed)"
- If Redis fails, falls back to memory without blocking requests
- Supports multi-instance deployments

## Testing

### Verify Rate Limiting is Active

```bash
# Check rate limit headers
curl -I http://localhost:3000/api/v1/stories/stats

# Expected output:
# x-ratelimit-limit: 60
# x-ratelimit-remaining: 59
# x-ratelimit-reset: <seconds>
```

### Test Rate Limit Exceeded

```bash
# Make 61 requests (exceeds limit)
for i in {1..61}; do
  curl -s http://localhost:3000/api/v1/stories/stats
done

# Expected: Last request returns 429 status code
# {"error":{"code":"INTERNAL_ERROR","message":"Rate limit exceeded, retry in X seconds"}}
```

### Verify Redis Connection

```bash
# Check backend logs for Redis connection message
tail -f logs/backend.log

# Expected output when Redis is configured:
# "Rate limiting: Using Redis storage (distributed)"

# Expected output when Redis is not configured:
# "Rate limiting: Using memory storage (not distributed - configure REDIS_URL for production)"
```

## Deployment Configuration

### Development (Local)

```bash
# .env
# No REDIS_URL needed - uses memory-based rate limiting
```

### Production (Single Instance)

```bash
# .env
REDIS_URL=redis://localhost:6379
```

### Production (Multi-Instance)

```bash
# .env (shared across all instances)
REDIS_URL=redis://redis-production.example.com:6379

# All instances will share the same rate limit state
```

### Production (Managed Redis Services)

**AWS ElastiCache:**
```bash
REDIS_URL=redis://user:password@my-cluster.xxxxxx.use1.cache.amazonaws.com:6379
```

**Redis Cloud:**
```bash
REDIS_URL=redis://default:password@redis-12345.c1.us-east-1-2.ec2.cloud.redislabs.com:6379
```

**Upstash (HTTP Redis):**
```bash
# Note: Upstash uses HTTP, not TCP
REDIS_URL=rediss://default:password@upstash-redis.upstash.io:6379
```

## Performance Considerations

### Memory-Based Rate Limiting
- **Pros:** Fast (no network overhead), simple setup
- **Cons:** Not distributed, lost on restart, doesn't scale
- **Use Case:** Development, single-instance deployments

### Redis-Based Rate Limiting
- **Pros:** Distributed, persists across restarts, scales horizontally
- **Cons:** Network latency (~1-5ms per request), requires Redis infrastructure
- **Use Case:** Production, multi-instance deployments

### Performance Impact

**Request Overhead:**
- Memory: < 1ms per request
- Redis: 1-5ms per request (depends on network latency)

**Scalability:**
- Memory: Limited to single instance
- Redis: Scales to unlimited instances

## Monitoring

### Rate Limit Metrics to Track

1. **Rate limit hits per endpoint**
   - Which endpoints are most rate-limited?
   - Are legitimate users being blocked?

2. **Redis connection health**
   - Connection errors
   - Reconnection attempts
   - Fallback to memory events

3. **Rate limit effectiveness**
   - DDoS mitigation
   - API abuse prevention

### Logging

The system logs the following events:

- `WARN` - Rate limiting using memory (development mode)
- `INFO` - Rate limiting using Redis (production mode)
- `ERROR` - Redis connection errors

## Troubleshooting

### Issue: Rate limiting not working

**Symptoms:** Requests not being limited even after 60+ requests

**Solutions:**
1. Check if rate limiting is enabled in server.ts
2. Verify rate limit headers in response: `curl -I http://localhost:3000/api/v1/stories/stats`
3. Check logs for rate limiting messages
4. Ensure health endpoint is not being tested (it's excluded from rate limiting)

### Issue: Redis connection failing

**Symptoms:** Error logs about Redis connection, falling back to memory

**Solutions:**
1. Verify REDIS_URL is correct: `echo $REDIS_URL`
2. Test Redis connection: `redis-cli -u $REDIS_URL ping`
3. Check Redis server is running: `systemctl status redis` or `docker ps | grep redis`
4. Verify network connectivity to Redis server
5. Check Redis authentication credentials

### Issue: High Redis latency

**Symptoms:** Slow API responses when using Redis rate limiting

**Solutions:**
1. Use Redis in the same region as your application servers
2. Use a Redis connection pool (handled automatically by ioredis)
3. Consider using a managed Redis service with low latency
4. Monitor Redis performance with Redis monitoring tools

## Future Enhancements

1. **Rate limit analytics dashboard** - Visualize rate limit usage
2. **Custom rate limits per endpoint** - Different limits for different endpoints
3. **User-based rate limiting** - Limit based on user ID, not IP
4. **Rate limit API** - Allow users to check their current rate limit status
5. **Dynamic rate limit adjustment** - Adjust limits based on system load

## Related Documentation

- API Versioning Policy: `docs/api-versioning-policy.md`
- Architecture State: `architectural_state_20260401.md`
- Environment Variables: `.env.example` (if it exists)

## Support

- **Fastify Rate Limit Docs:** https://github.com/fastify/fastify-rate-limit
- **ioredis Docs:** https://github.com/luin/ioredis
- **Redis Documentation:** https://redis.io/documentation

---

**Last Updated:** 2026-04-01
**Next Review:** When Redis connection issues occur or when scaling to multi-instance deployment
