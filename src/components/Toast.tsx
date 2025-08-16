import React from 'react';
import { ToastItem } from '../state/ToastContext';

const colorByType: Record<ToastItem['type'], string> = {
  success: 'bg-emerald-600',
  error: 'bg-red-600',
  info: 'bg-slate-700',
};

const Toast: React.FC<{ toast: ToastItem; onClose?: (id: string) => void }> = ({ toast, onClose }) => {
  return (
    <div
      role="status"
      className={`text-white ${colorByType[toast.type]} rounded-xl shadow-soft px-4 py-3 flex items-start gap-3`}
      aria-live="polite"
    >
      <span aria-hidden>🔔</span>
      <div className="text-sm leading-snug">{toast.message}</div>
      {onClose && (
        <button aria-label="Cerrar" className="ml-auto opacity-80 hover:opacity-100" onClick={() => onClose(toast.id)}>
          ✕
        </button>
      )}
    </div>
  );
};

export default Toast;
