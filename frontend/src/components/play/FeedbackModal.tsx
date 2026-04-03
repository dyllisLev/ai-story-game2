// frontend/src/components/play/FeedbackModal.tsx
// AI-253: 사용자 피드백 수집 시스템
import { type FC } from 'react';
import { FeedbackForm } from './FeedbackForm';

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  sessionId: string;
  storyId: string;
  genre: string;
  onSubmitSuccess?: () => void;
}

export const FeedbackModal: FC<FeedbackModalProps> = ({
  isOpen,
  onClose,
  sessionId,
  storyId,
  genre,
  onSubmitSuccess,
}) => {
  if (!isOpen) return null;

  const handleSubmit = async (data: {
    ratings: Record<string, number>;
    comments: string;
    feedback_tags: string[];
  }) => {
    try {
      const response = await fetch('/api/v1/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          session_id: sessionId,
          story_id: storyId,
          genre,
          ratings: data.ratings,
          comments: data.comments,
          feedback_tags: data.feedback_tags,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || '피드백 제출에 실패했습니다');
      }

      const result = await response.json();
      console.log('Feedback submitted:', result);

      // Show success message
      alert('피드백이 제출되었습니다. 소중한 의견 감사합니다!');

      onSubmitSuccess?.();
      onClose();
    } catch (error) {
      console.error('Failed to submit feedback:', error);
      alert(
        error instanceof Error ? error.message : '피드백 제출 중 오류가 발생했습니다'
      );
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content feedback-modal" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close-button" onClick={onClose} aria-label="닫기">
          ×
        </button>
        <FeedbackForm genre={genre as any} onSubmit={handleSubmit} onCancel={onClose} />
      </div>
    </div>
  );
};
