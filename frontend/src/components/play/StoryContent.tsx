import { type FC, useEffect, useRef } from 'react';
import type { MessageBlock } from '@/types/play';
import { NarratorBlock } from './NarratorBlock';
import { UserMessage } from './UserMessage';
import { SystemEvent } from './SystemEvent';

interface StoryContentProps {
  storyTitle: string;
  genre?: string;
  messages: MessageBlock[];
  isGenerating: boolean;
  streamingText: string;
  onRegenerate: () => void;
  suggestions: string[];
  onSuggestionSelect: (text: string) => void;
}

export const StoryContent: FC<StoryContentProps> = ({
  storyTitle,
  genre,
  messages,
  isGenerating,
  streamingText,
  onRegenerate,
  suggestions,
  onSuggestionSelect,
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll on new messages or streaming
  useEffect(() => {
    const el = scrollRef.current;
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  }, [messages, streamingText]);

  const handleCopy = async (text: string) => {
    try {
      const plainText = text.replace(/<[^>]+>/g, '');
      await navigator.clipboard.writeText(plainText);
    } catch {
      // ignore
    }
  };

  return (
    <main className="panel-center" aria-label="스토리 내용">
      {/* Story header */}
      <div className="story-header">
        <div className="story-header-left">
          <div className="story-title-block">
            <div className="story-name">{storyTitle || '스토리를 선택하세요'}</div>
            {genre && <span className="story-genre-tag">{genre}</span>}
          </div>
        </div>
        <div className="story-header-actions" />
      </div>

      {/* Scrollable story area */}
      <div className="story-scroll" ref={scrollRef} id="storyScroll">
        {messages.length === 0 && !isGenerating && (
          <div
            style={{
              maxWidth: 680,
              margin: 'var(--space-12) auto',
              width: '100%',
              textAlign: 'center',
              color: 'var(--text-tertiary)',
              fontSize: 'var(--font-sm)',
            }}
          >
            <div style={{ fontSize: '2rem', marginBottom: 'var(--space-4)' }}>✦</div>
            <div>게임을 시작하려면 왼쪽 설정에서 API Key와 모델을 입력하고</div>
            <div>새 세션 시작 버튼을 누르세요.</div>
          </div>
        )}

        {messages.map((msg) => {
          if (msg.type === 'user') {
            return (
              <UserMessage
                key={msg.id}
                text={msg.text}
                onCopy={() => handleCopy(msg.text)}
              />
            );
          }
          if (msg.type === 'system') {
            return <SystemEvent key={msg.id} text={msg.text} />;
          }
          if (msg.type === 'streaming') {
            return (
              <div key={msg.id} className="narr-block">
                <div className="narr-text">
                  <span
                    // eslint-disable-next-line react/no-danger
                    dangerouslySetInnerHTML={{ __html: msg.text || '' }}
                  />
                  <span className="stream-cursor" />
                </div>
              </div>
            );
          }
          // narrator (rendered HTML)
          return (
            <NarratorBlock
              key={msg.id}
              html={msg.text}
              onRegenerate={onRegenerate}
              onCopy={() => handleCopy(msg.text)}
            />
          );
        })}

        {/* Suggestion chips after last message */}
        {!isGenerating && messages.length > 0 && suggestions.length > 0 && (
          <div className="suggestion-chips">
            {suggestions.map((s, i) => (
              <button
                key={i}
                className="suggestion-chip"
                onClick={() => onSuggestionSelect(s)}
              >
                {s}
              </button>
            ))}
          </div>
        )}
      </div>
    </main>
  );
};
