-- 사용자 피드백 수집 테이블 생성
-- AI-253: 사용자 피드백 수집 시스템 기술 구현

-- story_feedback 테이블
CREATE TABLE ai_story_game.story_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES ai_story_game.sessions(id) ON DELETE CASCADE,
  story_id UUID NOT NULL REFERENCES ai_story_game.stories(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  -- 장르 정보 (세션/스토리에서 유추)
  genre TEXT NOT NULL CHECK (genre IN ('fantasy', 'modern', 'romance', 'mystery', 'horror', 'scifi', 'thriller', 'historical', 'comedy')),

  -- 평점 (1-5 별점)
  ratings JSONB NOT NULL DEFAULT '{}'::jsonb,
  -- 예: {"story_quality": 5, "character_development": 4, "pacing": 5, "overall": 5}

  -- 텍스트 피드백
  comments TEXT DEFAULT '',

  -- 선택적 피드백 카테고리
  feedback_tags JSONB DEFAULT '[]'::jsonb,
  -- 예: ["good_ending", "engaging_plot", "realistic_dialogue"]

  -- 메타데이터
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 인덱스 생성 (쿼리 성능 최적화)
CREATE INDEX idx_sg_feedback_session ON ai_story_game.story_feedback(session_id);
CREATE INDEX idx_sg_feedback_story ON ai_story_game.story_feedback(story_id);
CREATE INDEX idx_sg_feedback_user ON ai_story_game.story_feedback(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX idx_sg_feedback_genre ON ai_story_game.story_feedback(genre);
CREATE INDEX idx_sg_feedback_created ON ai_story_game.story_feedback(created_at DESC);

-- 복합 인덱스 (관리자 통계 쿼리 최적화)
CREATE INDEX idx_sg_feedback_genre_created ON ai_story_game.story_feedback(genre, created_at DESC);

-- RLS (Row Level Security) 정책
ALTER TABLE ai_story_game.story_feedback ENABLE ROW LEVEL SECURITY;

-- 읽기 권한: 모든 사용자가 피드백을 볼 수 있음 (공개 통계용)
CREATE POLICY "Allow read access to all feedback"
  ON ai_story_game.story_feedback
  FOR SELECT
  TO authenticated
  USING (true);

-- 쓰기 권한: 인증된 사용자만 피드백 작성 가능
CREATE POLICY "Allow users to create feedback"
  ON ai_story_game.story_feedback
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- 수정 권한: 본인이 작성한 피드백만 수정 가능
CREATE POLICY "Allow users to update own feedback"
  ON ai_story_game.story_feedback
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- 삭제 권한: 본인이 작성한 피드백만 삭제 가능
CREATE POLICY "Allow users to delete own feedback"
  ON ai_story_game.story_feedback
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- 관리자 권한: service_role 키로 모든 피드백 접근 가능
CREATE POLICY "Allow service role full access"
  ON ai_story_game.story_feedback
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- updated_at 자동 갱신 트리거
CREATE TRIGGER story_feedback_updated_at BEFORE UPDATE ON ai_story_game.story_feedback
  FOR EACH ROW EXECUTE FUNCTION ai_story_game.update_updated_at();

-- 중복 피드백 방지 제약조건 (같은 세션에 대해 하나의 피드백만)
CREATE UNIQUE INDEX idx_sg_feedback_unique_session
  ON ai_story_game.story_feedback(session_id)
  WHERE user_id IS NOT NULL;

-- 익명 피드백 허용을 위한 부분 인덱스 (user_id가 NULL인 경우 여러 개 허용)
-- 세션당 여러 익명 피드백을 허용하려면 위 제약조건을 수정하거나 제거

COMMENT ON TABLE ai_story_game.story_feedback IS '사용자 피드백 수집 테이블';
COMMENT ON COLUMN ai_story_game.story_feedback.ratings IS '별점 평가 (JSONB: 1-5)';
COMMENT ON COLUMN ai_story_game.story_feedback.comments IS '텍스트 피드백';
COMMENT ON COLUMN ai_story_game.story_feedback.feedback_tags IS '피드백 태그 배열';
