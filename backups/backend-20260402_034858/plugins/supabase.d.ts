import { SupabaseClient } from '@supabase/supabase-js';
import type { FastifyInstance } from 'fastify';
declare module 'fastify' {
    interface FastifyInstance {
        supabase: SupabaseClient;
        supabaseAdmin: SupabaseClient;
    }
}
declare const _default: (app: FastifyInstance) => Promise<void>;
export default _default;
