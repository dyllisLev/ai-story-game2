export interface SafetySetting {
    category: string;
    threshold: string;
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
}
export interface StatusWindowDefaults {
    enabled: boolean;
    default_preset_genre: string;
}
export interface AppConfig {
    promptConfig: PromptConfig;
    gameplayConfig: GameplayConfig;
    genreList: string[];
    statusWindowDefaults: StatusWindowDefaults;
}
//# sourceMappingURL=config.d.ts.map