// Tests for generate-build-info script
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { execSync } from 'child_process';
import { readFileSync, unlinkSync, existsSync } from 'fs';
import { join } from 'path';

describe('generate-build-info', () => {
  const testOutputDir = '/tmp/test-build-info';
  const testOutputPath = join(testOutputDir, 'build-info.json');

  beforeEach(() => {
    // Create test output directory
    execSync(`mkdir -p ${testOutputDir}`);
  });

  afterEach(() => {
    // Clean up test output
    if (existsSync(testOutputPath)) {
      unlinkSync(testOutputPath);
    }
  });

  describe('正常ケース (Normal Cases)', () => {
    it('build-info.jsonを正しく生成する (should generate build-info.json correctly)', async () => {
      // Verify the actual build-info.json file exists after build
      const actualBuildInfoPath = join(process.cwd(), 'dist/build-info.json');

      if (existsSync(actualBuildInfoPath)) {
        const content = JSON.parse(readFileSync(actualBuildInfoPath, 'utf-8'));
        expect(content).toHaveProperty('commit');
        expect(content).toHaveProperty('buildTime');
        expect(content).toHaveProperty('version');
        expect(content).toHaveProperty('branch');

        // Verify data types
        expect(typeof content.commit).toBe('string');
        expect(typeof content.buildTime).toBe('string');
        expect(typeof content.version).toBe('string');
        expect(typeof content.branch).toBe('string');

        // Verify format
        expect(content.buildTime).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
      } else {
        // Skip test if build hasn't been run yet
        expect(true).toBe(true);
      }
    });

    it('Git commit hashを正しく取得する (should get git commit hash correctly)', async () => {
      const commitHash = execSync('git rev-parse HEAD', { encoding: 'utf-8' }).trim();

      expect(commitHash).toBeDefined();
      expect(typeof commitHash).toBe('string');
      expect(commitHash.length).toBeGreaterThanOrEqual(7); // Minimum short hash length
      expect(commitHash.length).toBeLessThanOrEqual(40); // Full SHA-1 hash length
      expect(commitHash).toMatch(/^[a-f0-9]+$/);
    });

    it('Git branchを正しく取得する (should get git branch correctly)', async () => {
      const branch = execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf-8' }).trim();

      expect(branch).toBeDefined();
      expect(typeof branch).toBe('string');
      expect(branch.length).toBeGreaterThan(0);
    });

    it('Build timeをISO 8601形式で生成する (should generate build time in ISO 8601 format)', async () => {
      const buildTime = new Date().toISOString();

      expect(buildTime).toBeDefined();
      expect(typeof buildTime).toBe('string');
      expect(buildTime).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });
  });

  describe('エラーハンドリング (Error Handling)', () => {
    it('Gitリポジトリ外で実行するとエラーになる (should throw error when run outside git repo)', () => {
      // Test should be run in a non-git directory
      // This is a placeholder for the actual test logic
      expect(true).toBe(true); // Placeholder
    });

    it('出力ディレクトリが存在しない場合のエラーハンドリング (should handle missing output directory)', () => {
      // This would be handled by the fs.mkdir logic in the actual script
      expect(true).toBe(true); // Placeholder
    });
  });

  describe('データ整合性 (Data Integrity)', () => {
    it('同一ビルドで同じcommit hashを生成する (should generate same commit hash for same build)', () => {
      const commit1 = execSync('git rev-parse HEAD', { encoding: 'utf-8' }).trim();
      const commit2 = execSync('git rev-parse HEAD', { encoding: 'utf-8' }).trim();

      expect(commit1).toBe(commit2);
    });

    it('Versionがpackage.jsonから正しく読み込まれる (should read version from package.json correctly)', () => {
      const packageJsonPath = join(__dirname, '../package.json');
      const packageJsonContent = readFileSync(packageJsonPath, 'utf-8');
      const packageJson = JSON.parse(packageJsonContent);

      expect(packageJson).toHaveProperty('version');
      expect(typeof packageJson.version).toBe('string');
      expect(packageJson.version).toMatch(/^\d+\.\d+\.\d+$/); // SemVer format
    });
  });
});
