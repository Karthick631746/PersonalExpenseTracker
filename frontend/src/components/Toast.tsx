import { ReactNode, useState, useEffect } from 'react';
import { CheckCircle, XCircle, AlertCircle, Info, X } from 'lucide-react';

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface ToastProps {
  message: string;
  type?: ToastType;
  onClose: () => void;
}

const icons: Record<ToastType, ReactNode> = {
  success: <CheckCircle size={18} color="#22c55e" />,
  error: <XCircle size={18} color="#f43f5e" />,
  warning: <AlertCircle size={18} color="#f59e0b" />,
  info: <Info size={18} color="#0ea5e9" />,
};

export function Toast({ message, type = 'success', onClose }: ToastProps) {
  useEffect(() => {
    const t = setTimeout(onClose, 4000);
    return () => clearTimeout(t);
  }, [onClose]);

  return (
    <div className="toast" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      {icons[type]}
      <span style={{ flex: 1, fontSize: 14 }}>{message}</span>
      <button
        onClick={onClose}
        style={{ background: 'none', border: 0, color: '#8b92a5', cursor: 'pointer', padding: '2px 4px' }}
      >
        <X size={14} />
      </button>
    </div>
  );
}

interface ToastState {
  id: number;
  message: string;
  type: ToastType;
}

let addToastFn: ((message: string, type?: ToastType) => void) | null = null;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastState[]>([]);

  addToastFn = (message, type = 'success') => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
  };

  const remove = (id: number) => setToasts((prev) => prev.filter((t) => t.id !== id));

  return (
    <>
      {children}
      <div style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 9999, display: 'flex', flexDirection: 'column', gap: 8, maxWidth: 340 }}>
        {toasts.map((t) => (
          <Toast key={t.id} message={t.message} type={t.type} onClose={() => remove(t.id)} />
        ))}
      </div>
    </>
  );
}

export const toast = (message: string, type?: ToastType) => {
  if (addToastFn) addToastFn(message, type);
};
