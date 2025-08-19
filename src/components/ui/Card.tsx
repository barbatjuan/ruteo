import React from 'react';

const Card: React.FC<{ className?: string; children: React.ReactNode } & React.HTMLAttributes<HTMLDivElement>> = ({ className = '', children, ...rest }) => (
  <div
    className={[
      'rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm',
      'w-full max-w-full overflow-hidden',
      className,
    ].join(' ')}
    {...rest}
  >
    {children}
  </div>
);

export default Card;
