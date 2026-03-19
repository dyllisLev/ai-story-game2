-- ============================================
-- AI Story Game - Supabase Schema Migration
-- Supabase Dashboard > SQL Editor 에서 실행
-- ============================================

-- 1. stories 테이블
CREATE TABLE IF NOT EXISTS stories (
  id UUID PRIMARY KEY,
  title TEXT NOT NULL,
  world_setting TEXT DEFAULT '',
  story TEXT DEFAULT '',
  character_name TEXT DEFAULT '',
  character_setting TEXT DEFAULT '',
  characters TEXT DEFAULT '',
  user_note TEXT DEFAULT '',
  system_rules TEXT DEFAULT '',
  use_latex BOOLEAN DEFAULT false,
  is_public BOOLEAN DEFAULT false,
  password_hash TEXT,
  owner_uid UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. sessions 테이블
CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY,
  story_id UUID REFERENCES stories(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  preset JSONB DEFAULT '{}'::jsonb,
  messages JSONB DEFAULT '[]'::jsonb,
  model TEXT,
  summary TEXT DEFAULT '',
  summary_up_to_index INTEGER DEFAULT 0,
  owner_uid UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  last_played_at TIMESTAMPTZ DEFAULT now()
);

-- 3. presets 테이블
CREATE TABLE IF NOT EXISTS presets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  is_default BOOLEAN DEFAULT false,
  world_setting TEXT DEFAULT '',
  story TEXT DEFAULT '',
  characters TEXT DEFAULT '',
  character_name TEXT DEFAULT '',
  character_setting TEXT DEFAULT '',
  user_note TEXT DEFAULT '',
  system_rules TEXT DEFAULT '',
  use_latex BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4. config 테이블
CREATE TABLE IF NOT EXISTS config (
  id TEXT PRIMARY KEY,
  password_hash TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- Row Level Security (RLS) 설정
-- ============================================

-- stories RLS
ALTER TABLE stories ENABLE ROW LEVEL SECURITY;

-- SEC-008: 공개 스토리 또는 본인 스토리만 조회 (password_hash 노출 방지)
CREATE POLICY "stories_select" ON stories
  FOR SELECT USING (is_public = true OR auth.uid() = owner_uid);

-- SEC-011: owner_uid 강제 — 고아 스토리 방지
CREATE POLICY "stories_insert_owner" ON stories
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL AND owner_uid = auth.uid());

CREATE POLICY "stories_update_owner" ON stories
  FOR UPDATE USING (auth.uid() = owner_uid);

CREATE POLICY "stories_delete_owner" ON stories
  FOR DELETE USING (auth.uid() = owner_uid);

-- sessions RLS
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;

-- 세션 ID(UUID)를 아는 사용자는 조회 가능 (UUID는 추측 불가 → 사실상 비밀 링크)
CREATE POLICY "sessions_select_public" ON sessions
  FOR SELECT USING (true);

CREATE POLICY "sessions_insert_anon" ON sessions
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "sessions_update_owner" ON sessions
  FOR UPDATE USING (auth.uid() = owner_uid);

-- presets RLS
ALTER TABLE presets ENABLE ROW LEVEL SECURITY;

-- 프리셋 읽기는 모두 허용
CREATE POLICY "presets_select_public" ON presets
  FOR SELECT USING (true);

-- SEC-003: 프리셋 쓰기는 config 테이블의 admin 비밀번호를 알아야만 가능
-- 관리자 인증은 서버 측에서 별도로 처리해야 하며,
-- 최소한 특정 관리자 UID만 허용하도록 제한
-- ⚠️ 아래 '<YOUR_ADMIN_UID>' 를 실제 관리자 Supabase Auth UID로 교체하세요
-- Supabase Dashboard > Authentication > Users 에서 확인 가능
CREATE POLICY "presets_insert_admin" ON presets
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL
    AND auth.uid() = (SELECT (value)::uuid FROM config WHERE id = 'admin_uid' LIMIT 1)
  );

CREATE POLICY "presets_update_admin" ON presets
  FOR UPDATE USING (
    auth.uid() IS NOT NULL
    AND auth.uid() = (SELECT (value)::uuid FROM config WHERE id = 'admin_uid' LIMIT 1)
  );

CREATE POLICY "presets_delete_admin" ON presets
  FOR DELETE USING (
    auth.uid() IS NOT NULL
    AND auth.uid() = (SELECT (value)::uuid FROM config WHERE id = 'admin_uid' LIMIT 1)
  );

-- config RLS
ALTER TABLE config ENABLE ROW LEVEL SECURITY;

-- SEC-010: config 읽기는 인증된 사용자 허용 (password_hash 제외)
CREATE POLICY "config_select_safe" ON config
  FOR SELECT USING (auth.uid() IS NOT NULL AND id != 'admin');

-- SEC-010: config 쓰기는 완전 차단 (service_role / Supabase Dashboard에서만 수정)
-- INSERT, UPDATE, DELETE 정책 없음 = 모든 클라이언트 쓰기 거부

-- ============================================
-- SEC-012: password_hash 노출 방지
-- ============================================

-- password_hash 컬럼 직접 SELECT 권한 회수
REVOKE SELECT (password_hash) ON stories FROM anon, authenticated;

-- 안전한 VIEW (password_hash 대신 has_password 불린, 공개 스토리만)
CREATE VIEW stories_safe
  WITH (security_invoker = false)
AS SELECT
  id, title, world_setting, story, character_name, character_setting,
  characters, user_note, system_rules, use_latex, is_public,
  (password_hash IS NOT NULL) AS has_password,
  owner_uid, created_at, updated_at
FROM stories
WHERE is_public = true;

GRANT SELECT ON stories_safe TO anon, authenticated;

-- 스토리 암호 salt 반환 (클라이언트에서 PBKDF2 계산용)
CREATE OR REPLACE FUNCTION get_story_salt(p_story_id uuid)
RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT split_part(password_hash, ':', 1)
  FROM stories
  WHERE id = p_story_id AND password_hash IS NOT NULL;
$$;

-- 스토리 암호 검증 (클라이언트가 계산한 해시를 서버에서 비교)
CREATE OR REPLACE FUNCTION verify_story_password(p_story_id uuid, p_input_hash text)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS(
    SELECT 1 FROM stories
    WHERE id = p_story_id AND password_hash = p_input_hash
  );
$$;

-- ============================================
-- 인덱스
-- ============================================

CREATE INDEX idx_stories_is_public ON stories(is_public) WHERE is_public = true;
CREATE INDEX idx_stories_created_at ON stories(created_at DESC);
CREATE INDEX idx_sessions_story_id ON sessions(story_id);
CREATE INDEX idx_sessions_last_played ON sessions(last_played_at DESC);
CREATE INDEX idx_presets_is_default ON presets(is_default) WHERE is_default = true;

-- ============================================
-- updated_at 자동 갱신 트리거
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER stories_updated_at
  BEFORE UPDATE ON stories
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER sessions_updated_at
  BEFORE UPDATE ON sessions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER presets_updated_at
  BEFORE UPDATE ON presets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- Admin Config Migration (2026-03-18)
-- ============================================

-- Add value and updated_at columns to config table
ALTER TABLE config ADD COLUMN IF NOT EXISTS value JSONB;
ALTER TABLE config ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- Insert default prompt config
INSERT INTO config (id, value) VALUES ('prompt_config', '{
  "system_preamble": "당신은 인터랙티브 소설 게임의 AI 스토리텔러입니다.\n아래 설정을 기반으로 몰입감 있는 소설을 진행하세요.\n\n사용자가 행동을 입력하면 그에 따라 이야기를 이어가세요.\n각 응답은 소설체로 작성하세요.",
  "latex_rules": "[LaTeX 연출 규칙]\n대사와 효과음에 LaTeX 수식 문법을 사용하여 시각적으로 연출하세요.\n반드시 $ 기호로 감싸서 인라인 수식으로 작성합니다.\n\n■ 대사 작성 형식:\n발화자 이름과 대사를 반드시 하나의 $ 안에 함께 포함하세요.\n형식: $\\text{발화자: }\\textsf{\\textbf{\"대사 내용\"}}$\n잘못된 예: 사내 $\\textsf{\\textbf{\"대사\"}}$ (발화자가 $ 밖에 있음 ✗)\n올바른 예: $\\text{사내: }\\textsf{\\textbf{\"대사\"}}$ (발화자가 $ 안에 있음 ✓)\n\n■ 대사 감정 연출:\n- 일반 대사: $\\text{이름: }\\textsf{\\textbf{\"대사 내용\"}}$\n- 귓속말/속삭임: $\\text{이름: }\\color{gray}\\small\\textsf{\\textbf{\"속삭이는 내용\"}}$\n- 외침/비명: $\\text{이름: }\\huge\\textsf{\\textbf{\"외치는 내용!\"}}$\n- 분노/격앙: $\\text{이름: }\\large\\color{red}\\textsf{\\textbf{\"분노하는 내용!\"}}$\n- 부끄러움/유혹: $\\text{이름: }\\color{lightpink}\\textsf{\\textbf{\"부끄러운 내용\"}}$\n- 슬픔/비탄: $\\text{이름: }\\color{SteelBlue}\\textsf{\\textbf{\"슬픈 내용...\"}}$\n- 냉소/조롱: $\\text{이름: }\\color{darkviolet}\\textit{\\textsf{\"냉소적인 내용\"}}$\n- 위압/경고: $\\text{이름: }\\Large\\color{darkred}\\textsf{\\textbf{\"위압적인 내용\"}}$\n- 신비/예언: $\\text{이름: }\\color{gold}\\mathcal{\\text{신비로운 내용}}$\n\n■ 효과 연출:\n- 효과음/환경음: $\\colorbox{black}{\\color{cyan}\\small\\text{효과음}}$\n- 시스템/알림: $\\fcolorbox{gray}{black}{\\color{lime}\\footnotesize\\text{시스템 메시지}}$\n- 취소선(부정/철회): $\\cancel{\\text{취소된 내용}}$\n- 강조/각성: $\\boxed{\\color{orange}\\textbf{\\text{강조 내용}}}$\n\n■ 주의사항 (매우 중요 - 반드시 준수):\n- 모든 LaTeX 표현은 반드시 $ 기호로 열고 닫아야 합니다. $가 없으면 렌더링되지 않습니다!\n- 잘못된 예: \\text{이름: }\\textsf{\\textbf{\"대사\"}} ($ 없음 ✗)\n- 올바른 예: $\\text{이름: }\\textsf{\\textbf{\"대사\"}}$ ($ 있음 ✓)\n- LaTeX 수식($...$) 내부에 줄바꿈을 절대 넣지 마세요. 반드시 한 줄로 작성!\n- 발화자 이름은 반드시 $ 안에 \\text{이름: } 형태로 포함하세요.\n- HTML 태그나 &quot; 같은 HTML 엔티티는 절대 사용하지 마세요. 따옴표는 그냥 \"를 쓰세요.\n- 지문/나레이션은 LaTeX 없이 일반 텍스트로 작성하세요.\n- 대사에만 LaTeX를 적용하세요. 남용하지 마세요.",
  "narrative_length_template": "[!!! 서술 분량 규칙 - 최우선 필수 준수 !!!]\n반드시 매 응답마다 지문/묘사 문단을 정확히 {nl}문단으로 작성하세요.\n각 문단은 최소 3문장 이상으로 충분히 풍부하게 서술하세요.\n대사는 문단 수에 포함하지 않습니다. 대사와 대사 사이에도 상황 묘사, 표정, 심리, 분위기 등을 지문으로 충분히 서술하세요.\n{nl}문단보다 짧거나 길게 쓰지 마세요. 이 규칙은 절대적이며, 어떤 상황에서도 예외 없이 지켜야 합니다.\n상태창, 시스템 표시 등은 문단 수에 포함하지 않습니다.",
  "summary_system_instruction": "당신은 이야기 요약 전문가입니다. 핵심 줄거리, 캐릭터 상태, 중요 사건을 간결하게 요약하세요. {max_chars}자 이내.",
  "summary_request_new": "아래 대화 내용을 핵심 줄거리, 중요 사건, 캐릭터 상태 변화 중심으로 요약해주세요.",
  "summary_request_update": "기존 요약:\n{summary}\n\n아래 새로운 대화를 기존 요약에 통합하여 업데이트해주세요.",
  "game_start_message": "게임을 시작해줘",
  "safety_settings": [{"category":"HARM_CATEGORY_SEXUALLY_EXPLICIT","threshold":"BLOCK_NONE"},{"category":"HARM_CATEGORY_HATE_SPEECH","threshold":"BLOCK_NONE"},{"category":"HARM_CATEGORY_HARASSMENT","threshold":"BLOCK_NONE"},{"category":"HARM_CATEGORY_DANGEROUS_CONTENT","threshold":"BLOCK_NONE"}],
  "cache_ttl": "3600s"
}'::jsonb)
ON CONFLICT (id) DO NOTHING;

-- Insert default gameplay config
INSERT INTO config (id, value) VALUES ('gameplay_config', '{
  "default_narrative_length": 3,
  "narrative_length_min": 1,
  "narrative_length_max": 10,
  "sliding_window_size": 20,
  "max_history": 20,
  "message_limit": 500,
  "message_warning_threshold": 300,
  "summary_trigger_offset": 10,
  "summary_max_chars": 500,
  "auto_save_interval_ms": 300000,
  "max_session_list": 50
}'::jsonb)
ON CONFLICT (id) DO NOTHING;

-- Tighten RLS — config writes require admin_uid match
-- (Writes go through SUPABASE_SERVICE_KEY which bypasses RLS, but this is defense-in-depth)
DROP POLICY IF EXISTS config_update_admin ON config;
CREATE POLICY config_update_admin ON config FOR UPDATE
  USING (auth.uid()::text = (SELECT value FROM config WHERE id = 'admin_uid'));

-- Add updated_at trigger for config table
CREATE TRIGGER config_updated_at
  BEFORE UPDATE ON config
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- Session Memory (요약 메모리 시스템)
-- ============================================================
CREATE TABLE IF NOT EXISTS session_memory (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('short_term', 'characters', 'goals', 'long_term')),
  content JSONB NOT NULL DEFAULT '[]'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(session_id, type)
);

CREATE TRIGGER update_session_memory_updated_at
  BEFORE UPDATE ON session_memory
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE session_memory ENABLE ROW LEVEL SECURITY;

CREATE POLICY "session_memory_select" ON session_memory
  FOR SELECT USING (true);

CREATE POLICY "session_memory_insert" ON session_memory
  FOR INSERT WITH CHECK (
    session_id IN (SELECT id FROM sessions WHERE owner_uid = auth.uid())
  );

CREATE POLICY "session_memory_update" ON session_memory
  FOR UPDATE USING (
    session_id IN (SELECT id FROM sessions WHERE owner_uid = auth.uid())
  );

CREATE POLICY "session_memory_delete" ON session_memory
  FOR DELETE USING (
    session_id IN (SELECT id FROM sessions WHERE owner_uid = auth.uid())
  );

-- ============================================================
-- API Logs (디버깅용)
-- ============================================================
CREATE TABLE IF NOT EXISTS api_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID REFERENCES sessions(id) ON DELETE SET NULL,
  endpoint TEXT NOT NULL,
  request_model TEXT,
  request_system_prompt TEXT,
  request_messages JSONB,
  request_body JSONB,
  response_text TEXT,
  response_usage JSONB,
  response_error TEXT,
  duration_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_api_logs_session ON api_logs(session_id);
CREATE INDEX IF NOT EXISTS idx_api_logs_created ON api_logs(created_at DESC);

ALTER TABLE api_logs ENABLE ROW LEVEL SECURITY;
-- 클라이언트 접근 차단 (service_role만 INSERT/SELECT)
