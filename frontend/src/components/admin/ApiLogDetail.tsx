import { type FC, useState } from 'react';
import { type ApiLog } from '../../hooks/useLogs';

type TabId = 'req' | 'res' | 'err';

interface ApiLogDetailProps {
  log: ApiLog;
}

export const ApiLogDetail: FC<ApiLogDetailProps> = ({ log }) => {
  const [activeTab, setActiveTab] = useState<TabId>('req');

  const tabs = ([
    { id: 'req' as TabId, label: '요청', show: true },
    { id: 'res' as TabId, label: '응답', show: true },
    { id: 'err' as TabId, label: '에러', show: !log.success },
  ] satisfies Array<{ id: TabId; label: string; show: boolean }>).filter(t => t.show);

  return (
    <div className="a-expand-body">
      <div className="a-expand-tabs">
        {tabs.map(tab => (
          <button
            key={tab.id}
            className={`a-expand-tab${activeTab === tab.id ? ' active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
            type="button"
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Request tab */}
      {activeTab === 'req' && (
        <div>
          <div className="a-expand-meta">
            <div className="a-expand-meta-item">
              <span className="a-expand-meta-key">모델</span>
              <span className="a-expand-meta-val">{log.model}</span>
            </div>
            <div className="a-expand-meta-item">
              <span className="a-expand-meta-key">입력 토큰</span>
              <span className="a-expand-meta-val">{log.input_tokens.toLocaleString('ko-KR')}</span>
            </div>
          </div>

          {log.system_prompt && (
            <>
              <div className="a-expand-label">시스템 프롬프트</div>
              <pre className="a-expand-pre">{log.system_prompt}</pre>
            </>
          )}

          {log.messages && (
            <>
              <div className="a-expand-label">메시지 배열</div>
              <pre className="a-expand-pre">{log.messages}</pre>
            </>
          )}

          {log.request_payload && !log.system_prompt && !log.messages && (
            <>
              <div className="a-expand-label">요청 페이로드</div>
              <pre className="a-expand-pre">{log.request_payload}</pre>
            </>
          )}
        </div>
      )}

      {/* Response tab */}
      {activeTab === 'res' && (
        <div>
          {log.success ? (
            <>
              <div className="a-expand-meta">
                <div className="a-expand-meta-item">
                  <span className="a-expand-meta-key">입력 토큰</span>
                  <span className="a-expand-meta-val">{log.input_tokens.toLocaleString('ko-KR')}</span>
                </div>
                <div className="a-expand-meta-item">
                  <span className="a-expand-meta-key">출력 토큰</span>
                  <span className="a-expand-meta-val">{log.output_tokens.toLocaleString('ko-KR')}</span>
                </div>
                <div className="a-expand-meta-item">
                  <span className="a-expand-meta-key">소요시간</span>
                  <span className="a-expand-meta-val">{log.duration_ms.toLocaleString('ko-KR')}ms</span>
                </div>
              </div>
              {log.response_text && (
                <>
                  <div className="a-expand-label">응답 텍스트</div>
                  <pre className="a-expand-pre">{log.response_text}</pre>
                </>
              )}
            </>
          ) : (
            <div style={{ fontFamily: 'var(--a-font-ui)', fontSize: '11px', color: 'var(--a-ink-faint)', padding: '12px 0' }}>
              응답 없음 — {log.error_message ?? '타임아웃 발생'}
            </div>
          )}
        </div>
      )}

      {/* Error tab */}
      {activeTab === 'err' && !log.success && (
        <div>
          <pre className="a-expand-pre error">{log.error_message ?? '알 수 없는 오류'}</pre>
        </div>
      )}
    </div>
  );
};
