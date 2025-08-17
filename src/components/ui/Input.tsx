import React from 'react';

const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(function Input(
  { className = '', ...rest },
  ref
) {
  return (
    <input
      ref={ref}
      className={[
        'w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-transparent px-3 py-2 text-sm',
        'focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600',
        className,
      ].join(' ')}
      {...rest}
    />
  );
});

export default Input;
