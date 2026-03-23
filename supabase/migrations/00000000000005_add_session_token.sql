ALTER TABLE story_game.sessions
  ADD COLUMN session_token UUID NOT NULL DEFAULT gen_random_uuid();

CREATE INDEX idx_sg_sessions_token ON story_game.sessions(session_token);
