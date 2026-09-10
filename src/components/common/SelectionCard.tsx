import React from 'react';
import { LucideIcon } from 'lucide-react';

interface SelectionCardProps {
  selected?: boolean;
  onClick?: () => void;
  title: string;
  subtitle?: string;
  icon?: LucideIcon | React.ComponentType<{ className?: string; size?: number | string }>;
  badge?: string;
  className?: string;
}

export const SelectionCard: React.FC<SelectionCardProps> = ({
  selected = false,
  onClick,
  title,
  subtitle,
  icon: Icon,
  badge,
  className = '',
}) => {
  return (
    <div
      onClick={onClick}
      className={`
        relative p-5 rounded-2xl border-2 transition-all duration-200 cursor-pointer select-none
        ${selected
          ? 'border-electric-500 bg-electric-50/40 shadow-[0_0_20px_rgba(13,130,255,0.12)]'
          : 'border-slate-200/80 bg-white hover:border-electric-300 hover:bg-slate-50/50 shadow-sm'
        }
        ${className}
      `}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3.5">
          {Icon && (
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border transition-colors ${
                selected
                  ? 'bg-electric-500 text-white border-electric-500 shadow-md shadow-electric-500/20'
                  : 'bg-slate-100 text-slate-600 border-slate-200'
              }`}
            >
              <Icon size={20} />
            </div>
          )}
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-900 font-display">{title}</h3>
              {badge && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-electric-500/10 text-electric-600 border border-electric-500/20">
                  {badge}
                </span>
              )}
            </div>
            {subtitle && <p className="text-xs text-slate-500 mt-0.5 font-sans">{subtitle}</p>}
          </div>
        </div>

        {/* Checkmark indicator */}
        <div
          className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
            selected
              ? 'border-electric-500 bg-electric-500 text-white shadow-xs'
              : 'border-slate-300 bg-white'
          }`}
        >
          {selected && <span className="text-[11px] font-bold">✓</span>}
        </div>
      </div>
    </div>
  );
};

export default SelectionCard;
