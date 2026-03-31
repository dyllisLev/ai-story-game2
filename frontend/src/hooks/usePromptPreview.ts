// hooks/usePromptPreview.ts
// Real-time prompt assembly with token estimation
// Mirrors backend/src/services/prompt-builder.ts structure

import { useMemo } from 'react';
import type { EditorFormState, StatusAttribute, Character } from './useStoryEditor';

function estimateTokens(text: string): number {
  if (!text) return 0;
  const koreanChars = (text.match(/[\u3130-\u318F\uAC00-\uD7AF]/g) || []).length;
  const otherChars = text.length - koreanChars;
  return Math.ceil(koreanChars * 0.7 + otherChars / 4);
}

function buildStatusPrompt(attrs: StatusAttribute[]): string {
  if (!attrs.length) return '';
  const lines = attrs.map(a => {
    const typeDesc = a.type === 'bar' ? `0~${a.max || 100} 숫자`
      : a.type === 'number' ? '숫자'
      : a.type === 'list' ? '목록'
      : a.type === 'percent' ? '0~100 퍼센트'
      : '텍스트';
    return `${a.name}: (${typeDesc})`;
  });
  return `[상태창 규칙]\n매 응답 끝에 반드시 아래 형식으로 현재 상태를 출력하세요.\n\`\`\`status\n${lines.join('\n')}\n\`\`\`\n이야기 진행에 따라 값을 적절히 변경하세요.\n상태 블록 외에 본문에서 상태창을 텍스트로 출력하지 마세요.`;
}

function buildCharactersPrompt(chars: Character[]): string {
  const named = chars.filter(c => c.name.trim());
  if (!named.length) return '';
  const lines = named.map(c => {
    const parts: string[] = [c.name];
    if (c.role) parts.push(c.role);
    if (c.personality) parts.push(c.personality);
    if (c.ability) parts.push(`능력: ${c.ability}`);
    if (c.relation && c.relation !== '중립') parts.push(`관계: ${c.relation}`);
    if (c.description) parts.push(c.description);
    return `- ${parts.join(' / ')}`;
  });
  return `[등장인물]\n${lines.join('\n')}`;
}

export interface PromptPreviewConfig {
  systemPreamble: string;
  narrativeLengthTemplate: string;
  latexRules: string;
}

export interface PromptSection {
  label: string;
  content: string;
  tokens: number;
}

export interface PromptPreviewData {
  sections: PromptSection[];
  fullPrompt: string;
  totalTokens: number;
}

export function usePromptPreview(form: EditorFormState, config?: PromptPreviewConfig): PromptPreviewData {
  return useMemo(() => {
    const parts: PromptSection[] = [];

    // 1. 시스템 프리앰블 (DB config에서 가져옴)
    if (config?.systemPreamble) {
      parts.push({
        label: '시스템 프리앰블',
        content: config.systemPreamble,
        tokens: estimateTokens(config.systemPreamble),
      });
    }

    // 2. 서술 분량 템플릿 (DB config에서 가져옴)
    const nlTemplate = config?.narrativeLengthTemplate || '';
    const nlContent = nlTemplate.replaceAll('{nl}', String(form.narrativeLength));
    parts.push({
      label: '서술 분량',
      content: nlContent,
      tokens: estimateTokens(nlContent),
    });

    // 3. 시스템 규칙 (사용자 입력)
    if (form.systemRules.trim()) {
      const content = `[시스템 규칙]\n${form.systemRules.trim()}`;
      parts.push({ label: '시스템 규칙', content, tokens: estimateTokens(content) });
    }

    // 4. 세계관
    if (form.worldSetting.trim()) {
      const content = `[세계관]\n${form.worldSetting.trim()}`;
      parts.push({ label: '세계관', content, tokens: estimateTokens(content) });
    }

    // 5. 스토리
    if (form.story.trim()) {
      const content = `[스토리]\n${form.story.trim()}`;
      parts.push({ label: '스토리', content, tokens: estimateTokens(content) });
    }

    // 6. 등장인물 (전체 정보 포함)
    const charsContent = buildCharactersPrompt(form.characters);
    if (charsContent) {
      parts.push({ label: '등장인물', content: charsContent, tokens: estimateTokens(charsContent) });
    }

    // 7. 주인공
    if (form.characterName.trim()) {
      let content = `[주인공]\n이름: ${form.characterName.trim()}`;
      if (form.characterSetting.trim()) content += `\n설정: ${form.characterSetting.trim()}`;
      parts.push({ label: '주인공', content, tokens: estimateTokens(content) });
    }

    // 8. 유저노트
    if (form.userNote.trim()) {
      const content = `[유저노트]\n${form.userNote.trim()}`;
      parts.push({ label: '유저노트', content, tokens: estimateTokens(content) });
    }

    // 9. LaTeX 규칙 (토글 ON + DB config에 규칙이 있을 때)
    if (form.useLatex && config?.latexRules) {
      parts.push({
        label: 'LaTeX 규칙',
        content: config.latexRules,
        tokens: estimateTokens(config.latexRules),
      });
    }

    // 10. 상태창 규칙 (토글 ON + 속성 있을 때)
    if (form.useStatusWindow && form.statusAttributes.length > 0) {
      const statusContent = buildStatusPrompt(form.statusAttributes);
      parts.push({ label: '상태창 규칙', content: statusContent, tokens: estimateTokens(statusContent) });
    }

    const fullPrompt = parts.map(p => p.content).join('\n\n');
    const totalTokens = parts.reduce((sum, p) => sum + p.tokens, 0);

    return { sections: parts, fullPrompt, totalTokens };
  }, [form, config]);
}
