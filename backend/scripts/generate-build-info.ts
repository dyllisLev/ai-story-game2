#!/usr/bin/env tsx
import { execSync } from 'child_process';
import { writeFileSync, readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface BuildInfo {
  commit: string;
  buildTime: string;
  version: string;
  branch: string;
}

try {
  // Git 정보 수집
  const commit = execSync('git rev-parse HEAD', { encoding: 'utf-8' }).trim();
  const buildTime = new Date().toISOString();
  const branch = execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf-8' }).trim();

  // 버전 정보 (package.json에서 읽기)
  const packageJsonPath = join(__dirname, '../package.json');
  const packageJsonContent = readFileSync(packageJsonPath, 'utf-8');
  const packageJson = JSON.parse(packageJsonContent);
  const version = packageJson.version || '1.0.0';

  const buildInfo: BuildInfo = {
    commit,
    buildTime,
    version,
    branch,
  };

  // build-info.json 파일 생성 (dist 디렉토리)
  const outputPath = join(__dirname, '../dist/build-info.json');
  writeFileSync(outputPath, JSON.stringify(buildInfo, null, 2));

  console.log('✅ Build info generated:', outputPath);
  console.log('   Commit:', commit);
  console.log('   Build Time:', buildTime);
  console.log('   Version:', version);
  console.log('   Branch:', branch);
} catch (error) {
  console.error('❌ Error generating build info:', error);
  process.exit(1);
}
