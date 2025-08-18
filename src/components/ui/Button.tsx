import React from 'react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'pillGreen' | 'pillBlue' | 'pillRed' | 'pillGray' | 'pillYellow';

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
  // New pill variants: subtle background, colored border and text, rounded-xl already in base
  pillGreen: 'border border-emerald-200 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 focus:ring-emerald-600 dark:text-emerald-300 dark:border-emerald-800 dark:bg-emerald-900/20 dark:hover:bg-emerald-900/30',
  pillBlue: 'border border-indigo-200 text-indigo-700 bg-indigo-50 hover:bg-indigo-100 focus:ring-indigo-600 dark:text-indigo-300 dark:border-indigo-800 dark:bg-indigo-900/20 dark:hover:bg-indigo-900/30',
  pillRed: 'border border-rose-200 text-rose-700 bg-rose-50 hover:bg-rose-100 focus:ring-rose-600 dark:text-rose-300 dark:border-rose-800 dark:bg-rose-900/20 dark:hover:bg-rose-900/30',
  pillGray: 'border border-slate-300 text-slate-800 bg-white hover:bg-slate-50 focus:ring-slate-400 dark:text-slate-200 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800',
  pillYellow: 'border border-amber-200 text-amber-800 bg-amber-50 hover:bg-amber-100 focus:ring-amber-600 dark:text-amber-300 dark:border-amber-800 dark:bg-amber-900/20 dark:hover:bg-amber-900/30',
};

const Button: React.FC<Props> = ({ variant = 'primary', size = 'md', full, className = '', ...rest }) => (
  <button className={[base, sizes[size], variants[variant], full ? 'w-full' : '', className].join(' ')} {...rest} />
);

export default Button;
