import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
  type FC,
} from 'react';

// ─── Types ───────────────────────────────────────────────────────────────────

type ToastType = 'default' | 'success' | 'error' | 'warning';

interface ToastMessage {
  id: number;
  message: string;
  type: ToastType;
}

interface ToastState {
  show: (message: string, type?: ToastType) => void;
}

// ─── Context ─────────────────────────────────────────────────────────────────

const ToastContext = createContext<ToastState | null>(null);

// ─── Provider ────────────────────────────────────────────────────────────────

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  let counter = 0;

  const show = useCallback((message: string, type: ToastType = 'default') => {
    const id = ++counter;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      <div aria-live="polite" aria-atomic="false" style={{ pointerEvents: 'none' }}>
        {toasts.map((toast) => (
          <Toast key={toast.id} message={toast.message} type={toast.type} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

// ─── Toast Item ──────────────────────────────────────────────────────────────

interface ToastProps {
  message: string;
  type: ToastType;
}

const borderColorMap: Record<ToastType, string> = {
  default: 'var(--border)',
  success: 'rgba(74,184,168,0.4)',
  error:   'rgba(224,90,122,0.4)',
  warning: 'rgba(197,168,74,0.4)',
};

const Toast: FC<ToastProps> = ({ message, type }) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Trigger enter animation on next frame
    const raf = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div
      role="status"
      style={{
        position: 'fixed',
        bottom: 24,
        left: '50%',
        transform: visible
          ? 'translateX(-50%) translateY(0)'
          : 'translateX(-50%) translateY(10px)',
        opacity: visible ? 1 : 0,
        background: 'var(--bg-card)',
        border: `1px solid ${borderColorMap[type]}`,
        borderRadius: 10,
        padding: '10px 18px',
        fontSize: 13,
        color: 'var(--text-primary)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
        transition: 'opacity 300ms ease, transform 300ms ease',
        pointerEvents: 'none',
        zIndex: 9999,
        whiteSpace: 'nowrap',
        fontFamily: "'Noto Sans KR', sans-serif",
      }}
    >
      {message}
    </div>
  );
};

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useToast(): ToastState {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within <ToastProvider>');
  return ctx;
}
