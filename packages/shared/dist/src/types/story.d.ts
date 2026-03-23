export interface Story {
    id: string;
    title: string;
    world_setting: string;
    story: string;
    character_name: string;
    character_setting: string;
    characters: string;
    user_note: string;
    system_rules: string;
    use_latex: boolean;
    is_public: boolean;
    has_password: boolean;
    owner_uid: string | null;
    created_at: string;
    updated_at: string;
    description: string;
    tags: string[];
    icon: string;
    banner_gradient: string;
    play_count: number;
    like_count: number;
    badge: 'new' | 'hot' | null;
    is_featured: boolean;
    owner_name: string;
}
export interface StoryListItem {
    id: string;
    title: string;
    description: string;
    tags: string[];
    icon: string;
    banner_gradient: string;
    play_count: number;
    like_count: number;
    badge: 'new' | 'hot' | null;
    is_featured: boolean;
    has_password: boolean;
    owner_name: string;
    created_at: string;
}
export interface StoryStats {
    total_stories: number;
    total_plays: number;
    total_authors: number;
}
export interface StoryCreateInput {
    title: string;
    world_setting?: string;
    story?: string;
    character_name?: string;
    character_setting?: string;
    characters?: string;
    user_note?: string;
    system_rules?: string;
    use_latex?: boolean;
    is_public?: boolean;
    password_hash?: string;
    description?: string;
    tags?: string[];
    icon?: string;
    banner_gradient?: string;
    owner_name?: string;
}
export type StoryUpdateInput = Partial<StoryCreateInput>;
export interface StoryPreset {
    characterName: string;
    characterSetting: string;
    useLatex: boolean;
    narrativeLength: number;
}
export interface Preset {
    id: string;
    title: string;
    is_default: boolean;
    world_setting: string;
    story: string;
    characters: string;
    character_name: string;
    character_setting: string;
    user_note: string;
    system_rules: string;
    use_latex: boolean;
    created_at: string;
    updated_at: string;
    genre: string;
    icon: string;
    status_preset_id: string | null;
}
export type PresetCreateInput = Omit<Preset, 'id' | 'created_at' | 'updated_at'>;
export type PresetUpdateInput = Partial<PresetCreateInput>;
//# sourceMappingURL=story.d.ts.map