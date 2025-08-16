import React from 'react';

const EmptyState: React.FC<{ title: string; description?: string; action?: React.ReactNode }>= ({ title, description, action }) => {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 p-8 text-center">
      <div className="text-2xl">🗂️</div>
      <h3 className="mt-2 text-lg font-semibold">{title}</h3>
      {description && <p className="mt-1 text-slate-600 dark:text-slate-300">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
};

export default EmptyState;
