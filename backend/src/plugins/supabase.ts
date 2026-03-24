// backend/src/plugins/supabase.ts
import fp from 'fastify-plugin';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { FastifyInstance } from 'fastify';

declare module 'fastify' {
  interface FastifyInstance {
    supabase: SupabaseClient;      // anon key (RLS 적용)
    supabaseAdmin: SupabaseClient; // service key (RLS 우회)
  }
}

export default fp(async (app: FastifyInstance) => {
  const url = app.config.SUPABASE_URL;
  const anonKey = app.config.SUPABASE_ANON_KEY;
  const serviceKey = app.config.SUPABASE_SERVICE_KEY;

  // Use 'public' schema for cloud Supabase, 'story_game' for self-hosted
  const schema = process.env.SUPABASE_SCHEMA || 'public';

  const supabase = createClient(url, anonKey, {
    db: { schema },
  });

  const supabaseAdmin = createClient(url, serviceKey, {
    db: { schema },
  });

  // 연결 확인
  const { error } = await supabaseAdmin.from('config').select('id').limit(1);
  if (error) {
    app.log.warn({ error }, 'Supabase connection check failed');
  }

  app.decorate('supabase', supabase as any);
  app.decorate('supabaseAdmin', supabaseAdmin as any);
}, { name: 'supabase' });
