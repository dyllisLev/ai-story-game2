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
    if (sr)
        prompt += `\n\n[시스템 규칙]\n${sr}`;
    if (w)
        prompt += `\n\n[세계관]\n${w}`;
    if (s)
        prompt += `\n\n[스토리]\n${s}`;
    if (ch)
        prompt += `\n\n[등장인물]\n${ch}`;
    if (cn || cs) {
        prompt += `\n\n[주인공]`;
        if (cn)
            prompt += `\n이름: ${cn}`;
        if (cs)
            prompt += `\n설정: ${cs}`;
    }
    if (un)
        prompt += `\n\n[유저노트]\n${un}`;
    const useLatex = preset.useLatex !== undefined ? preset.useLatex : story.use_latex;
    if (useLatex) {
        prompt += `\n\n${promptConfig.latex_rules}`;
    }
    // Status window instructions
    const storyPreset = story.preset;
    if (storyPreset?.useStatusWindow && storyPreset.statusAttributes?.length) {
        const attrs = storyPreset.statusAttributes;
        const attrLines = attrs.map((a) => {
            if (a.type === 'bar' || a.type === 'percent' || a.type === 'number') {
                return `${a.name}: <현재값>/${a.max || '100'}`;
            }
            if (a.type === 'list') {
                return `${a.name}: <항목1>, <항목2>, ...`;
            }
            return `${a.name}: <값>`;
        });
        prompt += `\n\n[상태창 규칙]
매 응답 끝에 반드시 아래 형식의 상태창 블록을 출력하세요.
상태창은 이야기 본문 뒤에 코드블록으로 작성합니다.
상태값은 이야기 진행에 따라 자연스럽게 변화시키세요.

\`\`\`status
${attrLines.join('\n')}
\`\`\``;
    }
    if (cn)
        prompt = prompt.replaceAll('{{user}}', cn);
    return prompt;
}
export function buildMemoryPrompt(memory) {
    if (!memory)
        return '';
    const sections = [];
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
//# sourceMappingURL=prompt-builder.js.map