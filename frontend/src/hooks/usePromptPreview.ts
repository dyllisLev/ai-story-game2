// hooks/usePromptPreview.ts
// Real-time prompt assembly with token estimation

import { useMemo } from 'react';
import type { EditorFormState, StatusAttribute } from './useStoryEditor';

// Rough token estimate: ~4 chars per token (Korean chars count ~2 tokens each)
function estimateTokens(text: string): number {
  if (!text) return 0;
  // Count Korean characters separately (they cost ~2 tokens)
  const koreanChars = (text.match(/[\u3130-\u318F\uAC00-\uD7AF]/g) || []).length;
  const otherChars = text.length - koreanChars;
  return Math.ceil(koreanChars * 0.7 + otherChars / 4);
}

function buildStatusPrompt(attrs: StatusAttribute[]): string {
  if (!attrs.length) return '';
  const lines = attrs.map(a => `${a.name}: (${a.type === 'bar' ? `0~${a.max || 100} 숫자` : a.type === 'number' ? '숫자' : a.type === 'list' ? '목록' : a.type === 'percent' ? '0~100 퍼센트' : '텍스트'})`);
  return `[상태창 규칙]\n매 응답 끝에 반드시 아래 형식으로 현재 상태를 출력하세요.\n\`\`\`status\n${lines.join('\n')}\n\`\`\`\n이야기 진행에 따라 값을 적절히 변경하세요.\n상태 블록 외에 본문에서 상태창을 텍스트로 출력하지 마세요.`;
}

function buildNarrativeLengthPrompt(length: number): string {
  return `[서술 분량]\n반드시 매 응답마다 지문/묘사 문단을 정확히 ${length}문단으로 작성하세요.`;
}

function buildCharactersPrompt(chars: EditorFormState['characters']): string {
  if (!chars.length) return '';
  const lines = chars
    .filter(c => c.name)
    .map(c => {
      const parts = [c.name];
      if (c.role) parts.push(c.role);
      if (c.personality) parts.push(c.personality);
      return parts.join(' — ');
    });
  return lines.length ? `[등장인물]\n${lines.join('\n')}` : '';
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

export function usePromptPreview(form: EditorFormState): PromptPreviewData {
  return useMemo(() => {
    const parts: PromptSection[] = [];

    if (form.systemRules.trim()) {
      parts.push({
        label: '시스템 규칙',
        content: form.systemRules.trim(),
        tokens: estimateTokens(form.systemRules),
      });
    }

    if (form.worldSetting.trim()) {
      const content = `[세계관]\n${form.worldSetting.trim()}`;
      parts.push({ label: '세계관', content, tokens: estimateTokens(content) });
    }

    if (form.story.trim()) {
      const content = `[스토리]\n${form.story.trim()}`;
      parts.push({ label: '스토리', content, tokens: estimateTokens(content) });
    }

    const charsContent = buildCharactersPrompt(form.characters);
    if (charsContent) {
      parts.push({ label: '등장인물', content: charsContent, tokens: estimateTokens(charsContent) });
    }

    if (form.characterName.trim()) {
      const content = `[주인공]\n이름: ${form.characterName.trim()}${form.characterSetting.trim() ? `\n설정: ${form.characterSetting.trim()}` : ''}`;
      parts.push({ label: '주인공', content, tokens: estimateTokens(content) });
    }

    if (form.userNote.trim()) {
      const content = `[유저노트]\n${form.userNote.trim()}`;
      parts.push({ label: '유저노트', content, tokens: estimateTokens(content) });
    }

    const narrativeContent = buildNarrativeLengthPrompt(form.narrativeLength);
    parts.push({ label: '서술 분량', content: narrativeContent, tokens: estimateTokens(narrativeContent) });

    if (form.useStatusWindow && form.statusAttributes.length > 0) {
      const statusContent = buildStatusPrompt(form.statusAttributes);
      parts.push({ label: '상태창 규칙', content: statusContent, tokens: estimateTokens(statusContent) });
    }

    const fullPrompt = parts.map(p => p.content).join('\n\n');
    const totalTokens = parts.reduce((sum, p) => sum + p.tokens, 0);

    return { sections: parts, fullPrompt, totalTokens };
  }, [form]);
}
