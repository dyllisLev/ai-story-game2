import { type FC, useState, useRef, useEffect } from 'react';
import { fetchGeminiModels, type GeminiModel } from '@/lib/sse';

interface TopBarProps {
  storyTitle: string;
  genre?: string;
  apiKey: string;
  onApiKeyChange: (key: string) => void;
  model: string;
  onModelChange: (model: string) => void;
  leftPanelOpen: boolean;
  rightPanelOpen: boolean;
  onToggleLeft: () => void;
  onToggleRight: () => void;
  onOpenCharModal: () => void;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
  username?: string;
  showApiKeyInput?: boolean;
  isLoadingApiKey?: boolean;
}

export const TopBar: FC<TopBarProps> = ({
  storyTitle,
  genre,
  apiKey,
  onApiKeyChange,
  model,
  onModelChange,
  leftPanelOpen,
  rightPanelOpen,
  onToggleLeft,
  onToggleRight,
  onOpenCharModal,
  theme,
  onToggleTheme,
  username,
  showApiKeyInput = true,
  isLoadingApiKey = false,
}) => {
  const [models, setModels] = useState<GeminiModel[]>([]);
  const [loadingModels, setLoadingModels] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const saved = sessionStorage.getItem('gemini-api-key');
    if (saved) loadModels(saved);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadModels = async (key: string) => {
    if (!key) return;
    setLoadingModels(true);
    try {
      const list = await fetchGeminiModels(key);
      setModels(list);
      if (list.length > 0 && !model) {
        onModelChange(list[0].id);
      }
    } catch {
      setModels([]);
    } finally {
      setLoadingModels(false);
    }
  };

  const handleApiKeyInput = (val: string) => {
    onApiKeyChange(val);
    if (val) sessionStorage.setItem('gemini-api-key', val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => loadModels(val), 800);
  };

  const initials = username ? username.slice(0, 1) : '?';

  return (
    <header className="play-topbar">
      <a href="/" className="topbar-logo">
        <div className="topbar-logo-mark">✦</div>
        스토리아
      </a>
      <span className="topbar-sep">/</span>

      <div className="topbar-center">
        <span className="topbar-story-title">{storyTitle || '스토리 선택'}</span>
        {genre && <span className="topbar-badge">{genre}</span>}
      </div>

      <div className="topbar-actions">
        {/* API Key */}
        {showApiKeyInput && (
          <div className="api-key-wrap" title="Gemini API 키">
            <span className="api-key-icon">🔑</span>
            <input
              className="api-key-input"
              type="password"
              placeholder="Gemini API Key"
              maxLength={80}
              value={apiKey}
              onChange={(e) => handleApiKeyInput(e.target.value)}
              aria-label="Gemini API 키 입력"
            />
          </div>
        )}

        {/* Model select */}
        <select
          className="model-select"
          value={model}
          onChange={(e) => onModelChange(e.target.value)}
          disabled={loadingModels || models.length === 0}
          aria-label="AI 모델 선택"
        >
          {loadingModels && <option value="">모델 목록 조회 중...</option>}
          {!loadingModels && models.length === 0 && (
            <option value="">API 키를 입력하세요</option>
          )}
          {models.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </select>

        {/* Panel toggles */}
        <button
          className={`btn-icon${leftPanelOpen ? ' active' : ''}`}
          onClick={onToggleLeft}
          title="세션 목록 토글"
          aria-label="왼쪽 패널 토글"
        >
          ☰
        </button>

        <button
          className="btn-icon"
          onClick={onOpenCharModal}
          title="등장인물"
          aria-label="등장인물 보기"
        >
          📒
        </button>

        <button
          className={`btn-icon${rightPanelOpen ? ' active' : ''}`}
          onClick={onToggleRight}
          title="정보 패널 토글"
          aria-label="오른쪽 패널 토글"
        >
          ⊞
        </button>

        <button
          className="btn-icon"
          onClick={onToggleTheme}
          title="테마 전환"
          aria-label="테마 전환"
        >
          {theme === 'dark' ? '🌙' : '☀️'}
        </button>

        {/* User */}
        <div className="topbar-user">
          <div className="topbar-avatar" aria-label="사용자 아바타">
            {initials}
          </div>
          {username && <span className="topbar-username">{username}</span>}
        </div>
      </div>
    </header>
  );
};
