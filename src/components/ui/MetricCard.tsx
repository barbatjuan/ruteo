import React from 'react';

type Variant = 'emerald' | 'sky' | 'amber' | 'rose' | 'slate';

type Palette = {
  bg: string; ring: string; text: string; iconBg: string; iconRing: string; iconText: string;
  darkBg: string; darkRing: string; darkText: string; darkIconBg: string; darkIconRing: string; darkIconText: string;
};

const VARIANT_MAP: Record<Variant, Palette> = {
  emerald: {
    bg: 'bg-emerald-50', ring: 'ring-emerald-200', text: 'text-emerald-900', iconBg: 'bg-emerald-100', iconRing: 'ring-emerald-200', iconText: 'text-emerald-700',
    darkBg: 'dark:bg-emerald-900/15', darkRing: 'dark:ring-emerald-800', darkText: 'dark:text-emerald-200', darkIconBg: 'dark:bg-emerald-900/25', darkIconRing: 'dark:ring-emerald-800', darkIconText: 'dark:text-emerald-300',
  },
  sky: {
    bg: 'bg-sky-50', ring: 'ring-sky-200', text: 'text-sky-900', iconBg: 'bg-sky-100', iconRing: 'ring-sky-200', iconText: 'text-sky-700',
    darkBg: 'dark:bg-sky-900/15', darkRing: 'dark:ring-sky-800', darkText: 'dark:text-sky-200', darkIconBg: 'dark:bg-sky-900/25', darkIconRing: 'dark:ring-sky-800', darkIconText: 'dark:text-sky-300',
  },
  amber: {
    bg: 'bg-amber-50', ring: 'ring-amber-200', text: 'text-amber-900', iconBg: 'bg-amber-100', iconRing: 'ring-amber-200', iconText: 'text-amber-700',
    darkBg: 'dark:bg-amber-900/15', darkRing: 'dark:ring-amber-800', darkText: 'dark:text-amber-200', darkIconBg: 'dark:bg-amber-900/25', darkIconRing: 'dark:ring-amber-800', darkIconText: 'dark:text-amber-300',
  },
  rose: {
    bg: 'bg-rose-50', ring: 'ring-rose-200', text: 'text-rose-900', iconBg: 'bg-rose-100', iconRing: 'ring-rose-200', iconText: 'text-rose-700',
    darkBg: 'dark:bg-rose-900/15', darkRing: 'dark:ring-rose-800', darkText: 'dark:text-rose-200', darkIconBg: 'dark:bg-rose-900/25', darkIconRing: 'dark:ring-rose-800', darkIconText: 'dark:text-rose-300',
  },
  slate: {
    bg: 'bg-slate-50', ring: 'ring-slate-200', text: 'text-slate-900', iconBg: 'bg-slate-100', iconRing: 'ring-slate-200', iconText: 'text-slate-700',
    darkBg: 'dark:bg-slate-900/15', darkRing: 'dark:ring-slate-800', darkText: 'dark:text-slate-200', darkIconBg: 'dark:bg-slate-900/25', darkIconRing: 'dark:ring-slate-800', darkIconText: 'dark:text-slate-300',
  },
};

export interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: React.ReactNode;
  variant?: Variant;
  loading?: boolean;
}

const MetricCard: React.FC<MetricCardProps> = ({ title, value, subtitle, icon, variant = 'slate', loading }) => {
  const v = VARIANT_MAP[variant];
  return (
    <div className={`rounded-xl ${v.bg} ${v.darkBg} ring-1 ${v.ring} ${v.darkRing} p-4 flex items-start gap-4`}> 
      {icon ? (
        <div className={`h-11 w-11 ${v.iconBg} ${v.darkIconBg} ${v.iconRing} ${v.darkIconRing} ${v.iconText} ${v.darkIconText} ring-1 rounded-lg grid place-items-center`}>{icon}</div>
      ) : null}
      <div className="flex-1 min-w-0">
        <div className="text-sm text-slate-600 dark:text-slate-400 truncate">{title}</div>
        {loading ? (
          <div className="mt-2 h-7 w-24 bg-white/60 rounded animate-pulse" />
        ) : (
          <div className={`mt-1 text-2xl font-semibold ${v.text} ${v.darkText}`}>{value}</div>
        )}
        {subtitle ? <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">{subtitle}</div> : null}
      </div>
    </div>
  );
};

export default MetricCard;
