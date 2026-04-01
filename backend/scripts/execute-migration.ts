#!/usr/bin/env node
/**
 * Execute Supabase Migration SQL File
 * Usage: npx tsx scripts/execute-migration.ts <migration-file.sql>
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { dirname } from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: `${__dirname}/../../.env` });

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function executeMigration(sqlFilePath: string) {
  console.log(`🔄 Executing migration: ${sqlFilePath}\n`);

  // Read SQL file
  const sql = readFileSync(sqlFilePath, 'utf-8');

  console.log('📄 SQL file loaded');
  console.log(`📏 Size: ${sql.length} characters\n`);

  // Use the Supabase REST API to execute SQL
  try {
    const response = await fetch(`${process.env.SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': process.env.SUPABASE_SERVICE_KEY!,
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_KEY!}`
      },
      body: JSON.stringify({ sql_query: sql })
    });

    if (response.ok) {
      console.log('✅ Migration executed successfully');
      return true;
    } else {
      const error = await response.text();
      console.log(`❌ Error executing migration: ${error}`);
      return false;
    }
  } catch (e: any) {
    console.log(`❌ Exception: ${e.message}`);
    return false;
  }
}

async function main() {
  const sqlFile = process.argv[2];
  if (!sqlFile) {
    console.error('Usage: npx tsx scripts/execute-migration.ts <migration-file.sql>');
    process.exit(1);
  }

  const fullPath = `${__dirname}/../../supabase/migrations/${sqlFile}`;
  const success = await executeMigration(fullPath);

  process.exit(success ? 0 : 1);
}

main().catch(console.error);
