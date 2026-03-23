// components/editor/SystemRules.tsx

import { type FC } from 'react';
import { EditorTextarea } from './EditorTextarea';

interface SystemRulesProps {
  value: string;
  onChange: (v: string) => void;
}

export const SystemRules: FC<SystemRulesProps> = ({ value, onChange }) => (
  <EditorTextarea
    sectionId="section-rules"
    headingId="rules-heading"
    heading="시스템 규칙"
    description="AI의 출력 방식과 금지사항, 대사 형식을 설정합니다."
    label="AI 출력 규칙 & 금지사항"
    textareaId="systemRules"
    counterId="rules-count"
    value={value}
    onChange={onChange}
    placeholder="예: 폭력적인 묘사는 간접적으로 표현하고, 19세 이상 콘텐츠는 금지합니다..."
    warnThreshold={3000}
  />
);
