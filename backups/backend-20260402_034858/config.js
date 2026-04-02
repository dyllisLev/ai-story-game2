// backend/src/config.ts
import { config } from 'dotenv';
import { resolve } from 'path';
// Load .env from project root (parent of backend/)
config({ path: resolve(import.meta.dirname, '../../.env') });
function requireEnv(key) {
    const value = process.env[key];
    if (!value)
        throw new Error(`Missing required environment variable: ${key}`);
    return value;
}
export function loadConfig() {
    return {
        PORT: parseInt(process.env.PORT || '3000', 10),
        NODE_ENV: (process.env.NODE_ENV || 'development'),
        SUPABASE_URL: requireEnv('SUPABASE_URL'),
        SUPABASE_ANON_KEY: requireEnv('SUPABASE_ANON_KEY'),
        SUPABASE_SERVICE_KEY: requireEnv('SUPABASE_SERVICE_KEY'),
        API_KEY_ENCRYPTION_SECRET: requireEnv('API_KEY_ENCRYPTION_SECRET'),
        CORS_ORIGIN: process.env.CORS_ORIGIN || 'http://localhost:5173',
        ADMIN_BASIC_AUTH_USERNAME: process.env.ADMIN_BASIC_AUTH_USERNAME || 'admin',
        ADMIN_BASIC_AUTH_PASSWORD: requireEnv('ADMIN_BASIC_AUTH_PASSWORD'),
        REDIS_URL: process.env.REDIS_URL, // Optional - graceful fallback to memory if not provided
        SENTRY_DSN: process.env.SENTRY_DSN, // Optional - error tracking disabled if not provided
        SENTRY_ENVIRONMENT: process.env.SENTRY_ENVIRONMENT, // Optional - defaults to NODE_ENV
    };
}
//# sourceMappingURL=config.js.map