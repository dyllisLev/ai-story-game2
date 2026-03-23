import { type FC, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { api } from '../../lib/api';

/* ── Confirm dialog ── */
interface ConfirmProps {
  message: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

const ConfirmDialog: FC<ConfirmProps> = ({
  message, confirmLabel = '확인', onConfirm, onCancel,
}) => (
  <div className="a-confirm-overlay">
    <div className="a-confirm-card">
      <div style={{ fontFamily: 'var(--a-font-ui)', fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--a-ink-red-soft)', marginBottom: '12px' }}>
        위험한 작업
      </div>
      <div style={{ fontSize: '14px', color: 'var(--a-ink-primary)', marginBottom: '8px' }}>
        {message}
      </div>
      <div style={{ fontFamily: 'var(--a-font-ui)', fontSize: '10px', color: 'var(--a-ink-faint)', marginBottom: '20px' }}>
        이 작업은 되돌릴 수 없습니다.
      </div>
      <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
        <button className="a-btn" onClick={onCancel} type="button">취소</button>
        <button className="a-btn-danger" onClick={onConfirm} type="button">{confirmLabel}</button>
      </div>
    </div>
  </div>
);

/* ── Danger action row ── */
interface DangerRowProps {
  label: string;
  desc: string;
  buttonLabel: string;
  onAction: () => void;
  isPending?: boolean;
}

const DangerRow: FC<DangerRowProps> = ({ label, desc, buttonLabel, onAction, isPending }) => {
  const [confirming, setConfirming] = useState(false);

  return (
    <>
      <div className="a-danger-row">
        <div>
          <div className="a-danger-label">{label}</div>
          <div className="a-danger-desc">{desc}</div>
        </div>
        <button
          className="a-btn-danger"
          onClick={() => setConfirming(true)}
          disabled={isPending}
          type="button"
        >
          {isPending ? '처리 중...' : buttonLabel}
        </button>
      </div>
      {confirming && (
        <ConfirmDialog
          message={`${label}을(를) 진행하시겠습니까?`}
          confirmLabel={buttonLabel}
          onConfirm={() => { setConfirming(false); onAction(); }}
          onCancel={() => setConfirming(false)}
        />
      )}
    </>
  );
};

/* ── Main component ── */

export const DangerZone: FC = () => {
  const clearSessionsMutation = useMutation({
    mutationFn: () => api.delete('/admin/danger-zone/sessions'),
  });

  const clearLogsMutation = useMutation({
    mutationFn: () => api.delete('/admin/danger-zone/logs'),
  });

  const clearAllMutation = useMutation({
    mutationFn: () => api.delete('/admin/danger-zone/all'),
  });

  const ACTIONS: Array<DangerRowProps> = [
    {
      label: '전체 세션 초기화',
      desc: '모든 게임 세션 데이터를 삭제합니다. 사용자의 게임 기록이 사라집니다.',
      buttonLabel: '세션 초기화',
      onAction: () => clearSessionsMutation.mutate(),
      isPending: clearSessionsMutation.isPending,
    },
    {
      label: '모든 로그 삭제',
      desc: '서비스 로그와 API 로그를 모두 삭제합니다.',
      buttonLabel: '로그 삭제',
      onAction: () => clearLogsMutation.mutate(),
      isPending: clearLogsMutation.isPending,
    },
    {
      label: '전체 DB 초기화',
      desc: '세션과 모든 로그를 포함한 전체 데이터를 삭제합니다. 스토리 및 설정은 유지됩니다.',
      buttonLabel: '전체 초기화',
      onAction: () => clearAllMutation.mutate(),
      isPending: clearAllMutation.isPending,
    },
  ];

  return (
    <div className="a-danger-zone">
      <div className="a-danger-title">위험 구역 — Danger Zone</div>
      {ACTIONS.map(action => (
        <DangerRow key={action.label} {...action} />
      ))}
    </div>
  );
};
