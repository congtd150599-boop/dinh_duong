import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';

type ToastType = 'success' | 'error' | '';

interface ToastState {
  message: string;
  type: ToastType;
  show: boolean;
}

interface ToastContextValue {
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastState>({ message: '', type: '', show: false });
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();

  const showToast = useCallback((message: string, type: ToastType = '') => {
    setToast({ message, type, show: true });
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setToast((t) => ({ ...t, show: false })), 3500);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className={`toast ${toast.show ? 'show' : ''} ${toast.type}`}>{toast.message}</div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within a ToastProvider');
  return ctx;
}
