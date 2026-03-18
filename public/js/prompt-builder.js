/**
 * 프롬프트 빌더
 * @param {object} fields - { worldSetting, story, characterName, characterSetting, characters, userNote, systemRules }
 * @param {object} options - { useLatex: boolean, narrativeLength?: number }
 * @param {object} promptConfig - { system_preamble, latex_rules, narrative_length_template }
 * @returns {string}
 */
export function buildPrompt(fields, options, promptConfig) {
  const { worldSetting, story, characterName, characterSetting, characters, userNote, systemRules } = fields;
  const w = (worldSetting || '').trim();
  const s = (story || '').trim();
  const cn = (characterName || '').trim();
  const cs = (characterSetting || '').trim();
  const ch = (characters || '').trim();
  const un = (userNote || '').trim();
  const sr = (systemRules || '').trim();

  let prompt = promptConfig.system_preamble;

  if (options.narrativeLength) {
    const nl = String(options.narrativeLength);
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

  if (options.useLatex) {
    prompt += `\n\n${promptConfig.latex_rules}`;
  }

  if (cn) prompt = prompt.replaceAll('{{user}}', cn);

  return prompt;
}
