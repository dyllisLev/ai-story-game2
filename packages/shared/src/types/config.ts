// packages/shared/src/types/config.ts
export interface SafetySetting {
  category: string;
  threshold: string;
}

export interface GenrePromptConfig {
  system_preamble_suffix: string;
  memory_system_instruction_suffix?: string;
  enabled: boolean;
  version: number;
  last_updated: string;
}

export type GenreType = '판타지' | '현대' | '무협' | '로맨스' | '공포' | 'SF' | '미스터리' | '역사' | '심리';

export interface GenrePrompts {
  [genre: string]: GenrePromptConfig;
}

export interface PromptConfig {
  system_preamble: string;
  latex_rules: string;
  narrative_length_template: string;
  memory_system_instruction: string;
  memory_request: string;
  safety_settings: SafetySetting[];
  game_start_message: string;
  cache_ttl: string;
  genre_prompts?: GenrePrompts;
}

// Available AI models
export interface AvailableModel {
  id: string;
  label: string;
  context_window: number;
  is_default?: boolean;
}

// Input mode for user actions
export interface InputMode {
  id: string;
  label: string;
  emoji: string;
  prefix: string;
}

// Status attribute type
export interface StatusAttributeType {
  id: string;
  label: string;
}

// Memory category configuration
export interface MemoryCategory {
  id: string;
  dbKey: string;
  label: string;
  icon: string;
}

// Editor default settings
export interface EditorDefaults {
  icon: string;
  aiModel: string;
  narrativeLength: number;
  useLatex: boolean;
  useCache: boolean;
  useStatusWindow: boolean;
  isPublic: boolean;
}

// Default labels for UI
export interface DefaultLabels {
  new_session: string;
  untitled_story: string;
}

export interface GameplayConfig {
  default_narrative_length: number;
  narrative_length_min: number;
  narrative_length_max: number;
  sliding_window_size: number;
  max_history: number;
  message_limit: number;
  message_warning_threshold: number;
  memory_short_term_max: number;
  auto_save_interval_ms: number;
  max_session_list: number;
  // Phase 1-B extension
  available_models: AvailableModel[];
  input_modes: InputMode[];
  status_attribute_types: StatusAttributeType[];
  default_suggestions: string[];
  character_relations: string[];
  story_icons: string[];
  character_icons: string[];
  memory_categories: MemoryCategory[];
  editor_defaults: EditorDefaults;
  default_labels: DefaultLabels;
}

// Genre styling configuration
export interface GenreStyle {
  id: string;
  name: string;
  color: string;
  bgColor: string;
  borderColor: string;
  icon: string;
}

export interface GenreConfig {
  genres: GenreStyle[];
}

export interface StatusWindowDefaults {
  enabled: boolean;
  default_preset_genre: string;
}

export interface AppConfig {
  promptConfig: PromptConfig;
  gameplayConfig: GameplayConfig;
  genreConfig: GenreConfig;
  statusWindowDefaults: StatusWindowDefaults;
}
