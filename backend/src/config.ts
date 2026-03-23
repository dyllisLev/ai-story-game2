// backend/src/config.ts
import 'dotenv/config';

export interface EnvConfig {
  PORT: number;
  NODE_ENV: 'development' | 'production';
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
  SUPABASE_SERVICE_KEY: string;
  API_KEY_ENCRYPTION_SECRET: string;
  CORS_ORIGIN: string;
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
  };
}
