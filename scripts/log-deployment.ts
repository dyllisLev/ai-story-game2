#!/usr/bin/env tsx
/**
 * 배포 로그 기록 스크립트
 *
 * 사용법:
 *   tsx scripts/log-deployment.ts <commit_hash> <branch> <version> <build_time> <deployed_by> [status] [notes]
 *
 * 예시:
 *   tsx scripts/log-deployment.ts abc123 main "1.0.0" "2026-04-03T12:00:00Z" "admin" "success" "Initial deployment"
 */

import { execSync } from 'child_process';
import { createClient } from '@supabase/supabase-js';
import { loadConfig } from '../backend/src/config.js';

interface DeploymentLog {
  commit_hash: string;
  branch: string;
  version: string;
  build_time: string;
  deployed_by: string;
  status?: 'success' | 'failed' | 'rolled_back';
  notes?: string;
}

async function logDeployment(deployment: DeploymentLog) {
  try {
    // Supabase 클라이언트 생성
    const config = loadConfig();
    const supabase = createClient(config.SUPABASE_URL, config.SUPABASE_SERVICE_KEY);

    // 배포 로그 기록
    const { data, error } = await supabase
      .from('deployments')
      .insert({
        commit_hash: deployment.commit_hash,
        branch: deployment.branch,
        version: deployment.version,
        build_time: deployment.build_time,
        deployed_by: deployment.deployed_by,
        status: deployment.status || 'success',
        notes: deployment.notes,
      })
      .select()
      .single();

    if (error) {
      console.error('❌ 배포 로그 기록 실패:', error);
      process.exit(1);
    }

    console.log('✅ 배포 로그 기록 완료:', data);
    return data;
  } catch (error) {
    console.error('❌ 배포 로그 기록 중 오류 발생:', error);
    process.exit(1);
  }
}

// CLI 실행
const args = process.argv.slice(2);

if (args.length < 5) {
  console.error('사용법: tsx scripts/log-deployment.ts <commit_hash> <branch> <version> <build_time> <deployed_by> [status] [notes]');
  console.error('예시: tsx scripts/log-deployment.ts abc123 main "1.0.0" "2026-04-03T12:00:00Z" "admin" "success" "Initial deployment"');
  process.exit(1);
}

const [commit_hash, branch, version, build_time, deployed_by, status, notes] = args;

await logDeployment({
  commit_hash,
  branch,
  version,
  build_time,
  deployed_by,
  status: status as any,
  notes,
});
