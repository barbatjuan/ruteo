import React, { useEffect } from 'react';

const Modal: React.FC<{ open: boolean; onClose: () => void; title?: string; children: React.ReactNode } & React.HTMLAttributes<HTMLDivElement>> = ({ open, onClose, title, children }) => {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    if (open) document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-md mx-4 rounded-2xl bg-white dark:bg-slate-900 shadow-soft border border-slate-200 dark:border-slate-800">
        {title && (
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center">
            <h3 className="text-lg font-semibold">{title}</h3>
            <button className="ml-auto text-sm px-2 py-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800" onClick={onClose} aria-label="Cerrar">✕</button>
          </div>
        )}
        <div className="max-h-[70vh] overflow-auto">{children}</div>
      </div>
    </div>
  );
};

export default Modal;
