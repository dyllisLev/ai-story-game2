import { type FC } from 'react';

interface UserMessageProps {
  text: string;
  animDelay?: number;
  onCopy?: () => void;
}

export const UserMessage: FC<UserMessageProps> = ({ text, animDelay, onCopy }) => {
  return (
    <div
      className="narr-user"
      style={animDelay !== undefined ? { animationDelay: `${animDelay}s` } : undefined}
    >
      {onCopy && (
        <div className="msg-actions">
          <button className="msg-action-btn" title="복사" onClick={onCopy}>
            ⧉
          </button>
        </div>
      )}
      <div className="narr-user-bubble">{text}</div>
      <div className="narr-user-avatar">⚔️</div>
    </div>
  );
};
