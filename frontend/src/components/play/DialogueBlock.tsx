import { type FC } from 'react';

interface DialogueBlockProps {
  charName: string;
  charRole?: string;
  charColor?: string;
  charEmoji?: string;
  /** Pre-rendered HTML or plain text */
  html: string;
  animDelay?: number;
  onRegenerate?: () => void;
  onCopy?: () => void;
}

export const DialogueBlock: FC<DialogueBlockProps> = ({
  charName,
  charRole,
  charColor,
  charEmoji,
  html,
  animDelay,
  onRegenerate,
  onCopy,
}) => {
  const avatarStyle = charColor
    ? { background: charColor, borderColor: 'var(--prim-rose-500)' }
    : undefined;

  const nameLabelStyle = charColor
    ? { color: charColor }
    : undefined;

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
      <div className="narr-dialogue">
        <div className="narr-dialogue-char-bubble">
          <div className="char-avatar" style={avatarStyle}>
            {charEmoji ?? '👤'}
          </div>
          <div className="char-name-label" style={nameLabelStyle}>
            {charName}
            {charRole && (
              <>
                <br />
                {charRole}
              </>
            )}
          </div>
        </div>
        <div
          className="narr-dialogue-content"
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: html }}
        />
      </div>
    </div>
  );
};
