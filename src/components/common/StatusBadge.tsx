import React from 'react';
import { ProjectStatus, DocumentStatus, TaskStatus, Priority } from '../../types';

interface StatusBadgeProps {
  status: ProjectStatus | DocumentStatus | TaskStatus | Priority | string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'md', className = '' }) => {
  const sizeClasses = {
    sm: 'text-[11px] px-2.5 py-0.5',
    md: 'text-xs font-semibold px-3 py-1',
    lg: 'text-sm font-semibold px-3.5 py-1.5',
  }[size];

  // Colors mapping matching the UNAI Design System
  const getBadgeStyle = () => {
    switch (status) {
      // Project statuses
      case 'On Track':
        return 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20 shadow-[0_0_12px_rgba(16,185,129,0.08)]';
      case 'At Risk':
        return 'bg-amber-500/10 text-amber-600 border-amber-500/20 shadow-[0_0_12px_rgba(245,158,11,0.08)]';
      case 'Delayed':
        return 'bg-rose-500/10 text-rose-600 border-rose-500/20 shadow-[0_0_12px_rgba(244,63,94,0.08)]';
      case 'Completed':
        return 'bg-electric-500/10 text-electric-600 border-electric-500/20 shadow-[0_0_12px_rgba(13,130,255,0.08)]';
      case 'Planning':
        return 'bg-cyan-500/10 text-cyan-700 border-cyan-500/20 shadow-[0_0_12px_rgba(0,209,255,0.08)]';

      // Document statuses
      case 'Approved':
        return 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20 shadow-[0_0_12px_rgba(16,185,129,0.08)]';
      case 'In Progress':
        return 'bg-amber-500/10 text-amber-600 border-amber-500/20 shadow-[0_0_12px_rgba(245,158,11,0.08)]';
      case 'In Review':
        return 'bg-purple-500/10 text-purple-600 border-purple-500/20 shadow-[0_0_12px_rgba(168,85,247,0.08)]';
      case 'Draft':
        return 'bg-slate-100 text-slate-700 border-slate-200';

      // Task statuses
      case 'Verified':
        return 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20 shadow-[0_0_12px_rgba(16,185,129,0.08)]';
      case 'Submitted':
        return 'bg-electric-500/10 text-electric-600 border-electric-500/20 shadow-[0_0_12px_rgba(13,130,255,0.08)]';
      case 'Open':
        return 'bg-amber-500/10 text-amber-600 border-amber-500/20 shadow-[0_0_12px_rgba(245,158,11,0.08)]';
      case 'Reopened':
        return 'bg-rose-500/10 text-rose-600 border-rose-500/20 shadow-[0_0_12px_rgba(244,63,94,0.08)]';

      // Priority
      case 'High':
        return 'bg-rose-500/10 text-rose-600 border-rose-500/20 shadow-[0_0_12px_rgba(244,63,94,0.08)]';
      case 'Medium':
        return 'bg-amber-500/10 text-amber-600 border-amber-500/20 shadow-[0_0_12px_rgba(245,158,11,0.08)]';
      case 'Low':
        return 'bg-slate-100 text-slate-700 border-slate-200';

      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const getDotColor = () => {
    switch (status) {
      case 'On Track':
      case 'Approved':
      case 'Verified':
        return 'bg-emerald-500';
      case 'At Risk':
      case 'In Progress':
      case 'Open':
      case 'Medium':
        return 'bg-amber-500';
      case 'Delayed':
      case 'Reopened':
      case 'High':
        return 'bg-rose-500';
      case 'Completed':
      case 'Submitted':
        return 'bg-electric-500';
      case 'Planning':
        return 'bg-cyan-500';
      case 'In Review':
        return 'bg-purple-500';
      default:
        return 'bg-slate-400';
    }
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border transition-all duration-150 ${getBadgeStyle()} ${sizeClasses} ${className}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${getDotColor()}`} />
      <span>{status}</span>
    </span>
  );
};

export default StatusBadge;
