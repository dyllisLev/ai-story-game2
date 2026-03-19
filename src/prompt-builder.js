/**
 * 시스템 프롬프트 조합
 * @param {object} story - DB의 stories row (world_setting, story, characters, system_rules 등)
 * @param {object} preset - 세션의 preset (characterName, characterSetting, useLatex, narrativeLength 등)
 * @param {object} promptConfig - config 테이블의 prompt_config value
 * @returns {string}
 */
export function buildPrompt(story, preset, promptConfig) {
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

/**
 * 메모리 데이터를 시스템 프롬프트용 텍스트로 변환
 */
export function buildMemoryPrompt(memory) {
  if (!memory) return '';

  const sections = [];

  if (memory.longTerm && memory.longTerm.length > 0) {
    const items = memory.longTerm.map(e => `- ${e.title}: ${e.content}`).join('\n');
    sections.push(`## 장기기억\n${items}`);
  }

  if (memory.shortTerm && memory.shortTerm.length > 0) {
    const items = memory.shortTerm.map(e => `- ${e.title}: ${e.content}`).join('\n');
    sections.push(`## 단기기억\n${items}`);
  }

  if (memory.characters && memory.characters.length > 0) {
    const items = memory.characters.map(c => `- ${c.name} (${c.role}): ${c.description}`).join('\n');
    sections.push(`## 등장인물 현황\n${items}`);
  }

  if (memory.goals && memory.goals.trim()) {
    sections.push(`## 현재 목표\n${memory.goals}`);
  }

  return sections.length > 0 ? `\n\n[메모리]\n${sections.join('\n\n')}` : '';
}
