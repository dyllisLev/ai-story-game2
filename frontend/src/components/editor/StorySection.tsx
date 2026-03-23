// components/editor/StorySection.tsx

import { type FC } from 'react';
import { EditorTextarea } from './EditorTextarea';

interface StorySectionProps {
  value: string;
  onChange: (v: string) => void;
}

export const StorySection: FC<StorySectionProps> = ({ value, onChange }) => (
  <EditorTextarea
    sectionId="section-story"
    headingId="story-heading"
    heading="스토리"
    description="메인 줄거리와 시작 상황을 작성하세요."
    label="메인 스토리 / 줄거리"
    textareaId="mainStory"
    counterId="story-count"
    value={value}
    onChange={onChange}
    placeholder="메인 줄거리, 주요 목표, 시작 장면 등을 작성하세요..."
    warnThreshold={3000}
  />
);
