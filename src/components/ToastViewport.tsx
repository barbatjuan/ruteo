import React from 'react';
import Toast from './Toast';
import { useToast } from '../state/ToastContext';

const ToastViewport: React.FC = () => {
  const { toasts, removeToast } = useToast();
  if (!toasts.length) return null;
  return (
    <div className="fixed bottom-4 right-4 z-[9999] flex flex-col gap-3 max-w-sm w-[min(100%,_360px)]">
      {toasts.map((t) => (
        <Toast key={t.id} toast={t} onClose={removeToast} />)
      )}
    </div>
  );
};

export default ToastViewport;
