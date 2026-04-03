#!/usr/bin/env tsx
/**
 * 배포 상태 확인 스크립트
 *
 * 사용법:
 *   tsx scripts/verify-deployment.ts
 *
 * 기능:
 *   - 현재 배포된 커밋 해시 표시
 *   - 최근 배포 내역 표시
 *   - 헬스체크 상태 표시
 */

import { createClient } from '@supabase/supabase-js';
import { loadConfig } from '../backend/src/config.js';

interface BuildInfo {
  commit: string;
  buildTime: string;
  version: string;
  branch: string;
}

interface HealthResponse {
  status: string;
  supabase: string;
  uptime: number;
  build: BuildInfo;
}

async function checkHealth(): Promise<HealthResponse | null> {
  try {
    const config = loadConfig();
    const baseUrl = process.env.API_BASE_URL || `http://localhost:${config.PORT}`;
    const response = await fetch(`${baseUrl}/api/health`);

    if (!response.ok) {
      console.error('❌ 헬스체크 실패:', response.status, response.statusText);
      return null;
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('❌ 헬스체크 요청 실패:', error);
    return null;
  }
}

async function getRecentDeployments(limit = 5) {
  try {
    const config = loadConfig();
    const supabase = createClient(config.SUPABASE_URL, config.SUPABASE_SERVICE_KEY);

    const { data, error } = await supabase
      .from('deployments')
      .select('*')
      .order('deployed_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('❌ 배포 내역 조회 실패:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('❌ 배포 내역 조회 중 오류 발생:', error);
    return null;
  }
}

async function main() {
  console.log('\n📊 배포 상태 확인\n');
  console.log('='.repeat(60));

  // 1. 헬스체크
  console.log('\n🔍 헬스체크 상태:');
  const health = await checkHealth();

  if (health) {
    console.log(`   상태: ${health.status}`);
    console.log(`   Supabase: ${health.supabase}`);
    console.log(`   Uptime: ${Math.floor(health.uptime)}s`);

    if (health.build) {
      console.log('\n📦 현재 배포 정보:');
      console.log(`   커밋: ${health.build.commit}`);
      console.log(`   브랜치: ${health.build.branch}`);
      console.log(`   버전: ${health.build.version}`);
      console.log(`   빌드 시간: ${health.build.buildTime}`);
    }
  } else {
    console.log('   ❌ 헬스체크 실패');
  }

  // 2. 최근 배포 내역
  console.log('\n📋 최근 배포 내역:');
  const deployments = await getRecentDeployments(5);

  if (deployments && deployments.length > 0) {
    deployments.forEach((dep, index) => {
      console.log(`\n   ${index + 1}. ${dep.deployed_at}`);
      console.log(`      커밋: ${dep.commit_hash}`);
      console.log(`      브랜치: ${dep.branch}`);
      console.log(`      버전: ${dep.version}`);
      console.log(`      상태: ${dep.status}`);
      console.log(`      실행자: ${dep.deployed_by}`);
      if (dep.notes) {
        console.log(`      노트: ${dep.notes}`);
      }
    });
  } else {
    console.log('   ❌ 배포 내역 없음');
  }

  console.log('\n' + '='.repeat(60));
  console.log('\n✅ 확인 완료\n');
}

main().catch((error) => {
  console.error('❌ 오류 발생:', error);
  process.exit(1);
});
