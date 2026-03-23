import { type FC } from 'react';

interface NarratorBlockProps {
  /** Pre-rendered HTML from renderMarkdown() */
  html: string;
  animDelay?: number;
  onRegenerate?: () => void;
  onCopy?: () => void;
}

export const NarratorBlock: FC<NarratorBlockProps> = ({
  html,
  animDelay,
  onRegenerate,
  onCopy,
}) => {
  return (
    <div
      className="narr-block"
      style={animDelay !== undefined ? { animationDelay: `${animDelay}s` } : undefined}
    >
      {(onRegenerate || onCopy) && (
        <div className="msg-actions">
          {onRegenerate && (
            <button className="msg-action-btn" title="재생성" onClick={onRegenerate}>
              ↺
            </button>
          )}
          {onCopy && (
            <button className="msg-action-btn" title="복사" onClick={onCopy}>
              ⧉
            </button>
          )}
        </div>
      )}
      {/* dangerouslySetInnerHTML is safe here: html is already DOMPurify-sanitized */}
      <div
        className="narr-text"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  );
};
