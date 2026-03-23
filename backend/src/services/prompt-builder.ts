// backend/src/services/prompt-builder.ts
import type { PromptConfig, SessionMemory } from '@story-game/shared';

interface StoryData {
  world_setting?: string;
  story?: string;
  character_name?: string;
  character_setting?: string;
  characters?: string;
  user_note?: string;
  system_rules?: string;
  use_latex?: boolean;
}

interface PresetData {
  characterName?: string;
  characterSetting?: string;
  useLatex?: boolean;
  narrativeLength?: number;
}

export function buildPrompt(story: StoryData, preset: PresetData, promptConfig: PromptConfig): string {
  const w = (story.world_setting || '').trim();
  const s = (story.story || '').trim();
  const cn = (preset.characterName || story.character_name || '').trim();
  const cs = (preset.characterSetting || story.character_setting || '').trim();
  const ch = (story.characters || '').trim();
  const un = (story.user_note || '').trim();
  const sr = (story.system_rules || '').trim();

  let prompt = promptConfig.system_preamble;

  if (preset.narrativeLength) {
    const nl = String(preset.narrativeLength);
    prompt += '\n\n' + promptConfig.narrative_length_template.replaceAll('{nl}', nl);
  }

  if (sr) prompt += `\n\n[시스템 규칙]\n${sr}`;
  if (w) prompt += `\n\n[세계관]\n${w}`;
  if (s) prompt += `\n\n[스토리]\n${s}`;
  if (ch) prompt += `\n\n[등장인물]\n${ch}`;
  if (cn || cs) {
    prompt += `\n\n[주인공]`;
    if (cn) prompt += `\n이름: ${cn}`;
    if (cs) prompt += `\n설정: ${cs}`;
  }
  if (un) prompt += `\n\n[유저노트]\n${un}`;

  const useLatex = preset.useLatex !== undefined ? preset.useLatex : story.use_latex;
  if (useLatex) {
    prompt += `\n\n${promptConfig.latex_rules}`;
  }

  if (cn) prompt = prompt.replaceAll('{{user}}', cn);

  return prompt;
}

export function buildMemoryPrompt(memory: SessionMemory | null): string {
  if (!memory) return '';

  const sections: string[] = [];

  if (memory.longTerm?.length > 0) {
    const items = memory.longTerm.map(e => `- ${e.title}: ${e.content}`).join('\n');
    sections.push(`## 장기기억\n${items}`);
  }

  if (memory.shortTerm?.length > 0) {
    const items = memory.shortTerm.map(e => `- ${e.title}: ${e.content}`).join('\n');
    sections.push(`## 단기기억\n${items}`);
  }

  if (memory.characters?.length > 0) {
    const items = memory.characters.map(c => `- ${c.name} (${c.role}): ${c.description}`).join('\n');
    sections.push(`## 등장인물 현황\n${items}`);
  }

  if (memory.goals?.trim()) {
    sections.push(`## 현재 목표\n${memory.goals}`);
  }

  return sections.length > 0 ? `\n\n[메모리]\n${sections.join('\n\n')}` : '';
}
