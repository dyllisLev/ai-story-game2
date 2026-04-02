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
    REDIS_URL?: string;
    SENTRY_DSN?: string;
    SENTRY_ENVIRONMENT?: string;
}
export declare function loadConfig(): EnvConfig;
