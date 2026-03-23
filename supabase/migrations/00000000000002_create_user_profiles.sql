CREATE TABLE story_game.user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nickname TEXT,
  api_key_enc TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TRIGGER user_profiles_updated_at BEFORE UPDATE ON story_game.user_profiles
  FOR EACH ROW EXECUTE FUNCTION story_game.update_updated_at();

-- 새 사용자 가입 시 자동으로 user_profiles 생성
CREATE OR REPLACE FUNCTION story_game.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO story_game.user_profiles (id)
  VALUES (NEW.id)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION story_game.handle_new_user();
