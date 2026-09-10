import React from 'react';
import { motion } from 'framer-motion';

export interface StatCardProps {
  title?: string;
  label?: string;
  value: number | string;
  sublabel?: string;
  description?: string;
  badgeText?: string;
  badgeColor?: 'emerald' | 'blue' | 'rose' | 'amber' | 'cyan' | 'purple';
  color?: 'blue' | 'amber' | 'emerald' | 'cyan' | 'purple' | 'rose';
  icon?: React.ReactNode;
  onClick?: () => void;
  accentColor?: string;
  className?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  label,
  value,
  sublabel,
  description,
  badgeText,
  badgeColor,
  color = 'blue',
  icon,
  onClick,
  className = '',
}) => {
  const displayTitle = title || label || '';
  const displayDescription = sublabel || description || '';
  const effectiveColor = badgeColor || color;

  const colorStyles = {
    emerald: {
      card: 'bg-emerald-50/60 border-emerald-200/80 hover:border-emerald-300 hover:shadow-emerald-500/10',
      badge: 'bg-emerald-100 text-emerald-800 border-emerald-300/80',
      iconBox: 'bg-white text-emerald-600 border-emerald-200/90 shadow-xs',
      title: 'text-emerald-900/70',
      value: 'text-slate-900',
      sublabel: 'text-emerald-700/70',
    },
    blue: {
      card: 'bg-blue-50/60 border-blue-200/80 hover:border-blue-300 hover:shadow-blue-500/10',
      badge: 'bg-blue-100 text-blue-800 border-blue-300/80',
      iconBox: 'bg-white text-blue-600 border-blue-200/90 shadow-xs',
      title: 'text-blue-900/70',
      value: 'text-slate-900',
      sublabel: 'text-blue-700/70',
    },
    amber: {
      card: 'bg-amber-50/60 border-amber-200/80 hover:border-amber-300 hover:shadow-amber-500/10',
      badge: 'bg-amber-100 text-amber-800 border-amber-300/80',
      iconBox: 'bg-white text-amber-600 border-amber-200/90 shadow-xs',
      title: 'text-amber-900/70',
      value: 'text-slate-900',
      sublabel: 'text-amber-700/70',
    },
    rose: {
      card: 'bg-rose-50/60 border-rose-200/80 hover:border-rose-300 hover:shadow-rose-500/10',
      badge: 'bg-rose-100 text-rose-800 border-rose-300/80',
      iconBox: 'bg-white text-rose-600 border-rose-200/90 shadow-xs',
      title: 'text-rose-900/70',
      value: 'text-slate-900',
      sublabel: 'text-rose-700/70',
    },
    cyan: {
      card: 'bg-cyan-50/60 border-cyan-200/80 hover:border-cyan-300 hover:shadow-cyan-500/10',
      badge: 'bg-cyan-100 text-cyan-800 border-cyan-300/80',
      iconBox: 'bg-white text-cyan-600 border-cyan-200/90 shadow-xs',
      title: 'text-cyan-900/70',
      value: 'text-slate-900',
      sublabel: 'text-cyan-700/70',
    },
    purple: {
      card: 'bg-purple-50/60 border-purple-200/80 hover:border-purple-300 hover:shadow-purple-500/10',
      badge: 'bg-purple-100 text-purple-800 border-purple-300/80',
      iconBox: 'bg-white text-purple-600 border-purple-200/90 shadow-xs',
      title: 'text-purple-900/70',
      value: 'text-slate-900',
      sublabel: 'text-purple-700/70',
    },
  }[effectiveColor] || {
    card: 'bg-white border-slate-200 hover:border-blue-300',
    badge: 'bg-blue-100 text-blue-800 border-blue-200',
    iconBox: 'bg-blue-50 text-blue-600 border-blue-200',
    title: 'text-slate-500',
    value: 'text-slate-900',
    sublabel: 'text-slate-400',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      onClick={onClick}
      className={`rounded-2xl border p-5 relative overflow-hidden transition-all duration-200 shadow-sm ${
        colorStyles.card
      } ${
        onClick ? 'cursor-pointer hover:shadow-md group' : ''
      } ${className}`}
    >
      <div className="flex items-center justify-between">
        <span className={`text-xs font-bold uppercase tracking-wider font-sans ${colorStyles.title}`}>
          {displayTitle}
        </span>
        {icon && (
          <div className={`p-2.5 rounded-xl border transition-transform duration-200 ${onClick ? 'group-hover:scale-105' : ''} ${colorStyles.iconBox}`}>
            {icon}
          </div>
        )}
      </div>

      <div className="mt-3 flex items-baseline justify-between gap-2">
        <span className={`text-3xl font-black font-display tracking-tight ${colorStyles.value}`}>
          {value}
        </span>
        {badgeText && (
          <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border shadow-xs ${colorStyles.badge}`}>
            {badgeText}
          </span>
        )}
      </div>

      {displayDescription && (
        <p className={`mt-1.5 text-xs font-medium font-sans ${colorStyles.sublabel}`}>
          {displayDescription}
        </p>
      )}
    </motion.div>
  );
};

export default StatCard;
