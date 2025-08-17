import React from 'react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: 'sm' | 'md' | 'lg';
  full?: boolean;
};

const base = 'inline-flex items-center justify-center rounded-xl font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';
const sizes: Record<NonNullable<Props['size']>, string> = {
  sm: 'text-xs px-2.5 py-1.5',
  md: 'text-sm px-3 py-2',
  lg: 'text-base px-4 py-2.5',
};
const variants: Record<Variant, string> = {
  primary: 'bg-emerald-600 text-white hover:bg-emerald-700 focus:ring-emerald-600 dark:focus:ring-offset-slate-900',
  secondary: 'border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800 focus:ring-slate-400 dark:focus:ring-slate-700',
  ghost: 'text-slate-700 dark:text-slate-300 hover:bg-slate-100/70 dark:hover:bg-slate-800/60 focus:ring-slate-300 dark:focus:ring-slate-600',
  danger: 'bg-rose-600 text-white hover:bg-rose-700 focus:ring-rose-600',
};

const Button: React.FC<Props> = ({ variant = 'primary', size = 'md', full, className = '', ...rest }) => (
  <button className={[base, sizes[size], variants[variant], full ? 'w-full' : '', className].join(' ')} {...rest} />
);

export default Button;
