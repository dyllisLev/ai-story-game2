// components/editor/WorldSetting.tsx

import { type FC } from 'react';
import { EditorTextarea } from './EditorTextarea';

interface WorldSettingProps {
  value: string;
  onChange: (v: string) => void;
}

export const WorldSetting: FC<WorldSettingProps> = ({ value, onChange }) => (
  <EditorTextarea
    sectionId="section-world"
    headingId="world-heading"
    heading="세계관"
    description="게임이 펼쳐지는 세계의 배경과 설정을 상세히 기술하세요."
    label="세계관 설명"
    textareaId="worldDesc"
    counterId="world-count"
    value={value}
    onChange={onChange}
    placeholder="세계관, 지리, 주요 세력, 마법/기술 체계 등을 자유롭게 기술하세요..."
    warnThreshold={3000}
  />
);
