// packages/shared/src/types/session.ts
// Phase 1 base fields + Phase 2-A turn tracking extension fields

export interface SessionMessage {
  role: 'user' | 'model';
  content: string;
  timestamp: number;
}

export interface Session {
  // Phase 1 base fields
  id: string;
  story_id: string | null;
  title: string;
  preset: Record<string, unknown>;
  messages: SessionMessage[];
  model: string;
  summary: string;
  summary_up_to_index: number;
  session_token: string;
  owner_uid: string | null;
  created_at: string;
  updated_at: string;
  last_played_at: string;

  // Phase 2-A extension fields
  turn_count: number;
  progress_pct: number;
  chapter_label: string;
  preview_text: string;
}

export interface SessionListItem {
  // Phase 1 base fields
  id: string;
  story_id: string | null;
  title: string;
  model: string;
  message_count: number;
  last_played_at: string;
  created_at: string;

  // Phase 2-A extension fields
  turn_count: number;
  progress_pct: number;
  chapter_label: string;
  preview_text: string;
  story_icon: string;    // JOIN stories.icon
  story_tags: string[];  // JOIN stories.tags
}
