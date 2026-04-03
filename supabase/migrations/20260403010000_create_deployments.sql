-- ============================================================
-- 배포 기록 테이블 생성
--
-- 배포 이력 추적 및 롤백 관리를 위한 테이블
--
-- Author: Fullstack Dev
-- Date: 2026-04-03
-- ============================================================

CREATE TABLE IF NOT EXISTS ai_story_game.deployments (
  id BIGSERIAL PRIMARY KEY,
  commit_hash TEXT NOT NULL,
  branch TEXT NOT NULL,
  version TEXT NOT NULL,
  build_time TIMESTAMPTZ NOT NULL,
  deployed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deployed_by TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'success', -- 'success', 'failed', 'rolled_back'
  rollback_from_id BIGINT REFERENCES ai_story_game.deployments(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 인덱스 생성 (프로젝트 명명 규칙: idx_sg_*)
CREATE INDEX IF NOT EXISTS idx_sg_deployments_commit_hash
  ON ai_story_game.deployments(commit_hash);

CREATE INDEX IF NOT EXISTS idx_sg_deployments_deployed_at
  ON ai_story_game.deployments(deployed_at DESC);

CREATE INDEX IF NOT EXISTS idx_sg_deployments_status
  ON ai_story_game.deployments(status);

CREATE INDEX IF NOT EXISTS idx_sg_deployments_rollback_from
  ON ai_story_game.deployments(rollback_from_id);

-- RLS (Row Level Security) 활성화
ALTER TABLE ai_story_game.deployments ENABLE ROW LEVEL SECURITY;

-- RLS 정책: admin만 모든 작업 가능
CREATE POLICY "Admins can view all deployments"
  ON ai_story_game.deployments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM ai_story_game.user_profiles
      WHERE ai_story_game.user_profiles.id = auth.uid()
      AND ai_story_game.user_profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can insert deployments"
  ON ai_story_game.deployments FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM ai_story_game.user_profiles
      WHERE ai_story_game.user_profiles.id = auth.uid()
      AND ai_story_game.user_profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can update deployments"
  ON ai_story_game.deployments FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM ai_story_game.user_profiles
      WHERE ai_story_game.user_profiles.id = auth.uid()
      AND ai_story_game.user_profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM ai_story_game.user_profiles
      WHERE ai_story_game.user_profiles.id = auth.uid()
      AND ai_story_game.user_profiles.role = 'admin'
    )
  );

-- updated_at 트리거
CREATE OR REPLACE FUNCTION ai_story_game.update_deployments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_deployments_updated_at
  BEFORE UPDATE ON ai_story_game.deployments
  FOR EACH ROW
  EXECUTE FUNCTION ai_story_game.update_deployments_updated_at();

-- 코멘트 추가
COMMENT ON TABLE ai_story_game.deployments IS '배포 기록 테이블';
COMMENT ON COLUMN ai_story_game.deployments.commit_hash IS 'Git commit hash';
COMMENT ON COLUMN ai_story_game.deployments.branch IS 'Git branch name';
COMMENT ON COLUMN ai_story_game.deployments.version IS '배포 버전';
COMMENT ON COLUMN ai_story_game.deployments.build_time IS '빌드 시간';
COMMENT ON COLUMN ai_story_game.deployments.deployed_at IS '배포 시간';
COMMENT ON COLUMN ai_story_game.deployments.deployed_by IS '배포 실행자';
COMMENT ON COLUMN ai_story_game.deployments.status IS '배포 상태 (success, failed, rolled_back)';
COMMENT ON COLUMN ai_story_game.deployments.rollback_from_id IS '롤백 대상 배포 ID';
COMMENT ON COLUMN ai_story_game.deployments.notes IS '배포 노트';

-- ============================================================
-- Rollback Plan
-- ============================================================
--
-- To rollback this migration:
--
-- DROP TABLE IF EXISTS ai_story_game.deployments CASCADE;
-- DROP FUNCTION IF EXISTS ai_story_game.update_deployments_updated_at();
--
