import React from 'react';

const Loader: React.FC<{ label?: string; inline?: boolean; className?: string }>= ({ label='Cargando…', inline=false, className='' }) => {
  const content = (
    <div role="status" aria-live="polite" className={`flex items-center gap-2 text-slate-600 dark:text-slate-300 ${className}`}>
      <svg className="animate-spin h-5 w-5 text-sky-600" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
      </svg>
      <span className="text-sm">{label}</span>
    </div>
  );
  return inline ? content : <div className="grid place-items-center py-8">{content}</div>;
};

export default Loader;
