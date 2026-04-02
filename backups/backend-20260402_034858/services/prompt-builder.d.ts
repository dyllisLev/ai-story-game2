import type { PromptConfig, SessionMemory } from '@story-game/shared';
interface StatusAttribute {
    name: string;
    type: 'bar' | 'percent' | 'number' | 'text' | 'list';
    max?: string;
}
interface StoryData {
    world_setting?: string;
    story?: string;
    character_name?: string;
    character_setting?: string;
    characters?: string;
    user_note?: string;
    system_rules?: string;
    use_latex?: boolean;
    preset?: {
        useStatusWindow?: boolean;
        statusAttributes?: StatusAttribute[];
    };
}
interface PresetData {
    characterName?: string;
    characterSetting?: string;
    useLatex?: boolean;
    narrativeLength?: number;
}
export declare function buildPrompt(story: StoryData, preset: PresetData, promptConfig: PromptConfig): string;
export declare function buildMemoryPrompt(memory: SessionMemory | null): string;
export {};
