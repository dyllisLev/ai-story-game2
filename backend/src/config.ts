// backend/src/config.ts
import { config } from 'dotenv';
import { resolve } from 'path';

// Load .env from project root (parent of backend/)
config({ path: resolve(import.meta.dirname, '../../.env') });

export interface EnvConfig {
  PORT: number;
  NODE_ENV: 'development' | 'production';
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
  SUPABASE_SERVICE_KEY: string;
  API_KEY_ENCRYPTION_SECRET: string;
  CORS_ORIGIN: string;
  ADMIN_BASIC_AUTH_USERNAME: string;
  ADMIN_BASIC_AUTH_PASSWORD: string;
  REDIS_URL?: string; // Optional - if not provided, falls back to memory-based rate limiting
  SENTRY_DSN?: string; // Optional - if not provided, error tracking is disabled
  SENTRY_ENVIRONMENT?: string; // Optional - defaults to NODE_ENV
}

function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) throw new Error(`Missing required environment variable: ${key}`);
  return value;
}

export function loadConfig(): EnvConfig {
  return {
    PORT: parseInt(process.env.PORT || '3000', 10),
    NODE_ENV: (process.env.NODE_ENV || 'development') as EnvConfig['NODE_ENV'],
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
