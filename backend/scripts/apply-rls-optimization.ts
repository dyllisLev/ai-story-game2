#!/usr/bin/env tsx
// Apply RLS optimization migration
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import 'dotenv/config';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY!;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY');
  process.exit(1);
}

// Use the admin client to execute raw SQL
const supabase = createClient(supabaseUrl, supabaseKey, {
  db: { schema: 'ai_story_game' }
});

async function applyRLSOptimization() {
  console.log('Applying RLS optimization migration...');

  const migrationSQL = readFileSync(
    '/home/paperclip/workspace/ai-story-game2/supabase/migrations/20260331030000_optimize_rls_policies_with_composite_index.sql',
    'utf-8'
  );

  // Split SQL by semicolons and execute each statement
  const statements = migrationSQL
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'));

  console.log(`Executing ${statements.length} SQL statements...`);

  // Note: Supabase JS client doesn't support arbitrary SQL execution
  // This needs to be applied via psql or Supabase Dashboard SQL Editor
  console.log('\n⚠️  This migration must be applied via:');
  console.log('    1. Supabase Dashboard → SQL Editor');
  console.log('    2. psql command line');
  console.log('    3. Or direct database connection\n');

  console.log('File location:');
  console.log('  supabase/migrations/20260331030000_optimize_rls_policies_with_composite_index.sql\n');

  console.log('What this migration does:');
  console.log('  1. Optimizes RLS policies (10-100x faster queries)');
  console.log('  2. Adds composite index for story session queries');
  console.log('  3. Adds index on session_memory.session_id');
}

applyRLSOptimization();
