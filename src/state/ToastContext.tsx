import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';

export type ToastType = 'success' | 'error' | 'info';
export type ToastItem = { id: string; type: ToastType; message: string };

type ToastContextType = {
  toasts: ToastItem[];
  addToast: (message: string, type?: ToastType) => void;
  removeToast: (id: string) => void;
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
};

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((t) => t.filter((x) => x.id !== id));
  }, []);

  const addToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = Math.random().toString(36).slice(2);
    const toast: ToastItem = { id, type, message };
    setToasts((t) => [...t, toast]);
    // Auto-hide after 3.5s
    setTimeout(() => removeToast(id), 3500);
  }, [removeToast]);

  const api = useMemo(
    () => ({
      toasts,
      addToast,
      removeToast,
      success: (m: string) => addToast(m, 'success'),
      error: (m: string) => addToast(m, 'error'),
      info: (m: string) => addToast(m, 'info'),
    }),
    [toasts, addToast, removeToast]
  );

  return <ToastContext.Provider value={api}>{children}</ToastContext.Provider>;
};

export const useToast = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
};
