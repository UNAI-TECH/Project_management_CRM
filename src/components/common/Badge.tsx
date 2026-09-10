import React from 'react';
import { CheckCircle2, AlertCircle, XCircle, ShieldCheck, Clock, Sparkles } from 'lucide-react';

interface BadgeProps {
  status?: string;
  children?: React.ReactNode;
  className?: string;
  variant?: 'solid' | 'subtle' | 'outline';
}

export const Badge: React.FC<BadgeProps> = ({ status, children, className = '', variant = 'subtle' }) => {
  const normalizedStatus = (status || '').toLowerCase().trim();

  if (children) {
    return (
      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${className}`}>
        {children}
      </span>
    );
  }

  switch (normalizedStatus) {
    case 'active':
    case 'verified':
    case 'approved':
    case 'on track':
      return (
        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 shadow-[0_0_12px_rgba(16,185,129,0.1)] ${className}`}>
          <CheckCircle2 size={12} className="text-emerald-500 shrink-0" />
          <span>{status}</span>
        </span>
      );

    case 'pending':
    case 'pending_review':
    case 'pending review':
    case 'open':
    case 'in progress':
    case 'at risk':
      return (
        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-600 border border-amber-500/20 shadow-[0_0_12px_rgba(245,158,11,0.1)] ${className}`}>
          <AlertCircle size={12} className="text-amber-500 shrink-0" />
          <span>{status || 'Pending Review'}</span>
        </span>
      );

    case 'rejected':
    case 'delayed':
    case 'reopened':
    case 'high':
      return (
        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-600 border border-rose-500/20 shadow-[0_0_12px_rgba(244,63,94,0.1)] ${className}`}>
          <XCircle size={12} className="text-rose-500 shrink-0" />
          <span>{status || 'Rejected'}</span>
        </span>
      );

    case 'onboarded':
    case 'submitted':
    case 'completed':
      return (
        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-electric-500/10 text-electric-600 border border-electric-500/20 shadow-[0_0_12px_rgba(13,130,255,0.1)] ${className}`}>
          <ShieldCheck size={12} className="text-electric-500 shrink-0" />
          <span>{status || 'Onboarded'}</span>
        </span>
      );

    case 'in review':
    case 'special':
      return (
        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-purple-500/10 text-purple-600 border border-purple-500/20 shadow-[0_0_12px_rgba(168,85,247,0.1)] ${className}`}>
          <Clock size={12} className="text-purple-500 shrink-0" />
          <span>{status}</span>
        </span>
      );

    default:
      return (
        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200 ${className}`}>
          <span>{status}</span>
        </span>
      );
  }
};

export default Badge;
