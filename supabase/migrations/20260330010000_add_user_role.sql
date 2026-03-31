-- user_profiles에 role 컬럼 추가 (pending/user/admin)
-- 가입 직후 pending, 관리자 승인 후 user, 관리자 지정 시 admin

ALTER TABLE story_game.user_profiles
  ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'pending'
  CHECK (role IN ('pending', 'user', 'admin'));

-- 기존 사용자는 모두 user로 설정 (이미 활동 중인 계정)
UPDATE story_game.user_profiles SET role = 'user' WHERE role = 'pending';

-- admin_uid config가 있으면 해당 유저를 admin으로 승격
UPDATE story_game.user_profiles
  SET role = 'admin'
  WHERE id = (
    SELECT (value #>> '{}')::uuid
    FROM story_game.config
    WHERE id = 'admin_uid'
  );

-- 새 사용자 가입 트리거 업데이트 — role 기본값 'pending'
CREATE OR REPLACE FUNCTION story_game.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO story_game.user_profiles (id, role)
  VALUES (NEW.id, 'pending')
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
