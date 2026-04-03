-- ============================================================
-- Genre-Specific Status Presets
--
-- This migration documents and formalizes the genre-specific
-- status_presets that were added to enhance gameplay for each genre.
--
-- Genres covered:
-- - 판타지 (Fantasy), 현대 (Modern), 무협 (Martial Arts)
-- - 로맨스 (Romance), 공포 (Horror), SF (Science Fiction)
-- - 미스터리 (Mystery), 역사 (History), 심리 (Psychological)
--
-- Author: DBA (7cae7e20-0d32-4073-8968-0c95c6f6fb00)
-- Date: 2026-04-02
-- Issue: AI-220
-- Related: AI-39 Future Enhancement #1
-- ============================================================

-- Note: These presets were already created in the database.
-- Using ON CONFLICT DO NOTHING to prevent errors if re-run.

-- 1. Fantasy (판타지) - created 2026-04-01 09:49:00
INSERT INTO ai_story_game.status_presets (id, title, genre, description, attributes, is_default)
VALUES (
  '6ae774d6-eaff-474f-86b8-6682215a9446',
  '판타지 기본',
  '판타지',
  '판타지 장르 기본 상태창',
  '[
    {"name": "HP", "type": "gauge", "max_value": 100},
    {"name": "MP", "type": "gauge", "max_value": 100},
    {"name": "레벨", "type": "number", "max_value": null},
    {"name": "직업", "type": "text", "max_value": null},
    {"name": "칭호", "type": "text", "max_value": null}
  ]'::jsonb,
  false
) ON CONFLICT (id) DO NOTHING;

-- 2. Modern (현대) - created 2026-04-01 09:49:00
INSERT INTO ai_story_game.status_presets (id, title, genre, description, attributes, is_default)
VALUES (
  '6cba1cb1-ba33-492e-8934-2264fe5a58b3',
  '현대 기본',
  '현대',
  '현대 장르 기본 상태창',
  '[
    {"name": "체력", "type": "gauge", "max_value": 100},
    {"name": "정신력", "type": "gauge", "max_value": 100},
    {"name": "직업", "type": "text", "max_value": null},
    {"name": "평판", "type": "number", "max_value": null}
  ]'::jsonb,
  false
) ON CONFLICT (id) DO NOTHING;

-- 3. Martial Arts (무협) - created 2026-04-01 09:48:45
INSERT INTO ai_story_game.status_presets (id, title, genre, description, attributes, is_default)
VALUES (
  'a7dab642-80c4-4ffa-ab88-fa383714f534',
  '무협 기본',
  '무협',
  '무협 장르 기본 상태창',
  '[
    {"name": "내공", "type": "gauge", "max_value": 100},
    {"name": "무공 경험", "type": "number", "max_value": null},
    {"name": "경신술", "type": "number", "max_value": null},
    {"name": "신체 상태", "type": "text", "max_value": null},
    {"name": "적대력", "type": "list", "max_value": null}
  ]'::jsonb,
  false
) ON CONFLICT (id) DO NOTHING;

-- 4. Romance (로맨스) - created 2026-04-02 15:58:19
INSERT INTO ai_story_game.status_presets (id, title, genre, description, attributes, is_default)
VALUES (
  '15e275dd-3e69-4235-b3ae-ffdedbe115c1',
  '로맨스 기본',
  '로맨스',
  '로맨스 장르 기본 상태창',
  '[
    {"name": "업무 성과", "type": "gauge", "max_value": 100},
    {"name": "연애도", "type": "number", "max_value": 5},
    {"name": "스트레스", "type": "gauge", "max_value": 100},
    {"name": "커리어 포인트", "type": "number", "max_value": null},
    {"name": "관계", "type": "list", "max_value": null}
  ]'::jsonb,
  false
) ON CONFLICT (id) DO NOTHING;

-- 5. Horror (공포) - created 2026-04-02 15:58:19
INSERT INTO ai_story_game.status_presets (id, title, genre, description, attributes, is_default)
VALUES (
  '92b85ef1-361e-4b4e-8e97-249260d52e33',
  '공포 기본',
  '공포',
  '공포 장르 기본 상태창',
  '[
    {"name": "체력", "type": "gauge", "max_value": 100},
    {"name": "정신", "type": "gauge", "max_value": 100},
    {"name": "조명", "type": "number", "max_value": null},
    {"name": "단서", "type": "list", "max_value": null},
    {"name": "생존자", "type": "list", "max_value": null}
  ]'::jsonb,
  false
) ON CONFLICT (id) DO NOTHING;

-- 6. Science Fiction (SF) - created 2026-04-02 15:58:19
INSERT INTO ai_story_game.status_presets (id, title, genre, description, attributes, is_default)
VALUES (
  '91a08d1b-c745-4e57-a643-2b2ecad053d9',
  'SF 기본',
  'SF',
  'SF 장르 기본 상태창',
  '[
    {"name": "산소", "type": "gauge", "max_value": 100},
    {"name": "해킹 스킬", "type": "number", "max_value": null},
    {"name": "추격도", "type": "gauge", "max_value": 100},
    {"name": "동지", "type": "list", "max_value": null},
    {"name": "진실 단서", "type": "list", "max_value": null}
  ]'::jsonb,
  false
) ON CONFLICT (id) DO NOTHING;

-- 7. Mystery (미스터리) - created 2026-04-02 15:58:19
INSERT INTO ai_story_game.status_presets (id, title, genre, description, attributes, is_default)
VALUES (
  '655d484a-8d50-4c1e-b295-0ca07ec372d3',
  '미스터리 기본',
  '미스터리',
  '미스터리 장르 기본 상태창',
  '[
    {"name": "추리력", "type": "number", "max_value": 10},
    {"name": "신뢰도", "type": "list", "max_value": null},
    {"name": "단서", "type": "list", "max_value": null},
    {"name": "시간", "type": "number", "max_value": 72},
    {"name": "추격도", "type": "gauge", "max_value": 100}
  ]'::jsonb,
  false
) ON CONFLICT (id) DO NOTHING;

-- 8. History (역사) - created 2026-04-02 15:58:19
INSERT INTO ai_story_game.status_presets (id, title, genre, description, attributes, is_default)
VALUES (
  'ec729922-1001-4e73-a986-75c696bac599',
  '역사 기본',
  '역사',
  '역사 장르 기본 상태창',
  '[
    {"name": "무공", "type": "number", "max_value": 10},
    {"name": "명성", "type": "number", "max_value": null},
    {"name": "복수심", "type": "gauge", "max_value": 100},
    {"name": "의병", "type": "list", "max_value": null},
    {"name": "역사적 사건", "type": "list", "max_value": null}
  ]'::jsonb,
  false
) ON CONFLICT (id) DO NOTHING;

-- 9. Psychological (심리) - created 2026-04-02 15:58:19
INSERT INTO ai_story_game.status_presets (id, title, genre, description, attributes, is_default)
VALUES (
  '9b859592-7437-4536-8b57-c2a6cc391808',
  '심리 기본',
  '심리',
  '심리 장르 기본 상태창',
  '[
    {"name": "정신", "type": "gauge", "max_value": 100},
    {"name": "진실 단서", "type": "list", "max_value": null},
    {"name": "의심", "type": "list", "max_value": null},
    {"name": "약물", "type": "list", "max_value": null},
    {"name": "신뢰", "type": "list", "max_value": null}
  ]'::jsonb,
  false
) ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- Verification (run manually after migration)
-- ============================================================

-- Verify all 9 genres are present:
-- SELECT genre, COUNT(*) FROM ai_story_game.status_presets GROUP BY genre;

-- ============================================================
-- Rollback Plan
-- ============================================================

-- To rollback this migration (remove all genre presets):
--
-- DELETE FROM ai_story_game.status_presets
-- WHERE id IN (
--   '6ae774d6-eaff-474f-86b8-6682215a9446',  -- 판타지
--   '6cba1cb1-ba33-492e-8934-2264fe5a58b3',  -- 현대
--   'a7dab642-80c4-4ffa-ab88-fa383714f534',  -- 무협
--   '15e275dd-3e69-4235-b3ae-ffdedbe115c1',  -- 로맨스
--   '92b85ef1-361e-4b4e-8e97-249260d52e33',  -- 공포
--   '91a08d1b-c745-4e57-a643-2b2ecad053d9',  -- SF
--   '655d484a-8d50-4c1e-b295-0ca07ec372d3',  -- 미스터리
--   'ec729922-1001-4e73-a986-75c696bac599',  -- 역사
--   '9b859592-7437-4536-8b57-c2a6cc391808'   -- 심리
-- );
--
-- Note: This will also remove the genre_prompts configuration if needed:
-- UPDATE ai_story_game.config
-- SET value = value - 'genre_prompts'
-- WHERE id = 'prompt_config';
