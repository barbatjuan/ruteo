import React from 'react';

const SectionHeader: React.FC<{ title: string; children?: React.ReactNode; className?: string }> = ({ title, children, className = '' }) => (
  <div className={["flex items-center justify-between gap-3 p-4 pb-0", className].join(' ')}>
    <h2 className="text-sm font-semibold tracking-wide text-slate-900 dark:text-slate-200">{title}</h2>
    <div className="flex items-center gap-2">{children}</div>
  </div>
);

export default SectionHeader;
