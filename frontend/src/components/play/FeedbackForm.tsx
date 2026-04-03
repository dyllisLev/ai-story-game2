// frontend/src/components/play/FeedbackForm.tsx
// AI-253: 사용자 피드백 수집 시스템
import { type FC, useState } from 'react';
import type {
  FeedbackRatings,
  FeedbackRatingCategory,
  FeedbackTag,
  Genre,
} from '@story-game/shared';

interface FeedbackFormProps {
  genre: Genre;
  onSubmit: (data: {
    ratings: Record<string, number>;
    comments: string;
    feedback_tags: string[];
  }) => void | Promise<void>;
  onCancel: () => void;
  isSubmitting?: boolean;
}

const RATING_CATEGORIES: { key: FeedbackRatingCategory; label: string }[] = [
  { key: 'story_quality', label: '스토리 품질' },
  { key: 'character_development', label: '캐릭터 개발' },
  { key: 'pacing', label: '전개 속도' },
  { key: 'engagement', label: '몰입감' },
  { key: 'writing_style', label: '문체' },
  { key: 'overall', label: '종합 평가' },
];

const FEEDBACK_TAGS: { tag: FeedbackTag; label: string }[] = [
  { tag: 'good_ending', label: '좋은 결말' },
  { tag: 'surprising_twist', label: '예상치 못한 반전' },
  { tag: 'engaging_plot', label: '흥미로운 줄거리' },
  { tag: 'realistic_dialogue', label: '현실적인 대화' },
  { tag: 'well_developed_characters', label: '잘 개발된 캐릭터' },
  { tag: 'immersive_world', label: '몰감감 넘치는 세계관' },
  { tag: 'emotional_impact', label: '감동적임' },
  { tag: 'creative_premise', label: '창의적인 설정' },
  { tag: 'pacing_issues', label: '전개 속도 문제' },
  { tag: 'confusing_plot', label: '혼란스러운 줄거리' },
  { tag: 'weak_characters', label: '약한 캐릭터' },
  { tag: 'poor_dialogue', label: '부족한 대화' },
  { tag: 'rushed_ending', label: '급격한 결말' },
];

const StarRating: FC<{
  value: number;
  onChange: (value: number) => void;
  label: string;
}> = ({ value, onChange, label }) => {
  return (
    <div className="feedback-rating-item">
      <label className="feedback-rating-label">{label}</label>
      <div className="star-rating">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            className={`star-button ${star <= value ? 'filled' : ''}`}
            onClick={() => onChange(star)}
            aria-label={`${label} ${star}점`}
          >
            ★
          </button>
        ))}
      </div>
    </div>
  );
};

export const FeedbackForm: FC<FeedbackFormProps> = ({
  genre,
  onSubmit,
  onCancel,
  isSubmitting = false,
}) => {
  const [ratings, setRatings] = useState<FeedbackRatings>({
    overall: 5,
  });
  const [comments, setComments] = useState('');
  const [selectedTags, setSelectedTags] = useState<FeedbackTag[]>([]);

  const handleRatingChange = (key: FeedbackRatingCategory, value: number) => {
    setRatings((prev) => ({ ...prev, [key]: value }));
  };

  const handleTagToggle = (tag: FeedbackTag) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      ratings: ratings as Record<string, number>,
      comments,
      feedback_tags: selectedTags,
    });
  };

  return (
    <form className="feedback-form" onSubmit={handleSubmit}>
      <div className="feedback-form-header">
        <h3>피드백 남기기</h3>
        <p className="feedback-form-subtitle">
          이 이야기에 대한 의견을 들려주세요. 소중한 피드백은 더 나은 서비스를 만드는 데
          도움이 됩니다.
        </p>
      </div>

      <div className="feedback-ratings">
        {RATING_CATEGORIES.map(({ key, label }) => (
          <StarRating
            key={key}
            label={label}
            value={ratings[key] || 0}
            onChange={(value) => handleRatingChange(key, value)}
          />
        ))}
      </div>

      <div className="feedback-tags-section">
        <label className="feedback-tags-label">키워드 선택 (복수 가능)</label>
        <div className="feedback-tags-grid">
          {FEEDBACK_TAGS.map(({ tag, label }) => (
            <button
              key={tag}
              type="button"
              className={`feedback-tag-button ${
                selectedTags.includes(tag) ? 'selected' : ''
              }`}
              onClick={() => handleTagToggle(tag)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="feedback-comments-section">
        <label className="feedback-comments-label">추가 의견</label>
        <textarea
          className="feedback-comments-textarea"
          value={comments}
          onChange={(e) => setComments(e.target.value)}
          placeholder="이야기에 대한 자유로운 의견을 남겨주세요..."
          rows={4}
          maxLength={1000}
        />
        <div className="feedback-char-count">{comments.length}/1000</div>
      </div>

      <div className="feedback-form-actions">
        <button
          type="button"
          className="feedback-button feedback-button-cancel"
          onClick={onCancel}
          disabled={isSubmitting}
        >
          취소
        </button>
        <button
          type="submit"
          className="feedback-button feedback-button-submit"
          disabled={isSubmitting || !ratings.overall}
        >
          {isSubmitting ? '저장 중...' : '피드백 제출'}
        </button>
      </div>
    </form>
  );
};
