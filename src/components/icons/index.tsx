import React from 'react';

interface IconProps {
  className?: string;
  onClick?: (e: React.MouseEvent) => void;
}

// Helper component for base SVG wraps
const SvgWrap: React.FC<IconProps & { children: React.ReactNode; viewBox?: string }> = ({
  className = 'w-5 h-5',
  viewBox = '0 0 24 24',
  onClick,
  children,
}) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox={viewBox}
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    onClick={onClick}
  >
    {children}
  </svg>
);

export const LayoutDashboard: React.FC<IconProps> = (props) => (
  <SvgWrap {...props}>
    <rect width="7" height="9" x="3" y="3" rx="1" />
    <rect width="7" height="5" x="14" y="3" rx="1" />
    <rect width="7" height="9" x="14" y="12" rx="1" />
    <rect width="7" height="5" x="3" y="16" rx="1" />
  </SvgWrap>
);

export const FolderKanban: React.FC<IconProps> = (props) => (
  <SvgWrap {...props}>
    <path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z" />
    <path d="M8 10v4" />
    <path d="M12 10v4" />
    <path d="M16 10v4" />
  </SvgWrap>
);

export const FileText: React.FC<IconProps> = (props) => (
  <SvgWrap {...props}>
    <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
    <path d="M14 2v4a2 2 0 0 0 2 2h4" />
    <path d="M10 9H8" />
    <path d="M16 13H8" />
    <path d="M16 17H8" />
  </SvgWrap>
);

export const CheckSquare: React.FC<IconProps> = (props) => (
  <SvgWrap {...props}>
    <rect width="18" height="18" x="3" y="3" rx="2" />
    <path d="m9 11 3 3L22 4" />
  </SvgWrap>
);

export const Users: React.FC<IconProps> = (props) => (
  <SvgWrap {...props}>
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </SvgWrap>
);

export const BarChart3: React.FC<IconProps> = (props) => (
  <SvgWrap {...props}>
    <line x1="18" x2="18" y1="20" y2="10" />
    <line x1="12" x2="12" y1="20" y2="4" />
    <line x1="6" x2="6" y1="20" y2="14" />
  </SvgWrap>
);

export const ShieldCheck: React.FC<IconProps> = (props) => (
  <SvgWrap {...props}>
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    <path d="m9 12 2 2 4-4" />
  </SvgWrap>
);

export const Settings: React.FC<IconProps> = (props) => (
  <SvgWrap {...props}>
    <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.1a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
    <circle cx="12" cy="12" r="3" />
  </SvgWrap>
);

export const Smartphone: React.FC<IconProps> = (props) => (
  <SvgWrap {...props}>
    <rect width="14" height="20" x="5" y="2" rx="2" ry="2" />
    <path d="M12 18h.01" />
  </SvgWrap>
);

export const LogOut: React.FC<IconProps> = (props) => (
  <SvgWrap {...props}>
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <polyline points="16 17 21 12 16 7" />
    <line x1="21" x2="9" y1="12" y2="12" />
  </SvgWrap>
);

export const ChevronRight: React.FC<IconProps> = (props) => (
  <SvgWrap {...props}>
    <polyline points="9 18 15 12 9 6" />
  </SvgWrap>
);

export const ChevronLeft: React.FC<IconProps> = (props) => (
  <SvgWrap {...props}>
    <polyline points="15 18 9 12 15 6" />
  </SvgWrap>
);

export const ChevronDown: React.FC<IconProps> = (props) => (
  <SvgWrap {...props}>
    <polyline points="6 9 12 15 18 9" />
  </SvgWrap>
);

export const Bell: React.FC<IconProps> = (props) => (
  <SvgWrap {...props}>
    <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
    <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
  </SvgWrap>
);

export const Search: React.FC<IconProps> = (props) => (
  <SvgWrap {...props}>
    <circle cx="11" cy="11" r="8" />
    <path d="m21 21-4.3-4.3" />
  </SvgWrap>
);

export const UserCheck: React.FC<IconProps> = (props) => (
  <SvgWrap {...props}>
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <polyline points="17 11 19 13 23 9" />
  </SvgWrap>
);

export const CheckCircle2: React.FC<IconProps> = (props) => (
  <SvgWrap {...props}>
    <circle cx="12" cy="12" r="10" />
    <path d="m9 12 2 2 4-4" />
  </SvgWrap>
);

export const Layers: React.FC<IconProps> = (props) => (
  <SvgWrap {...props}>
    <path d="m12 3-10 5 10 5 10-5-10-5Z" />
    <path d="m2 17 10 5 10-5" />
    <path d="m2 12 10 5 10-5" />
  </SvgWrap>
);

export const RefreshCw: React.FC<IconProps> = (props) => (
  <SvgWrap {...props}>
    <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
    <path d="M3 3v5h5" />
    <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
    <path d="M16 16h5v5" />
  </SvgWrap>
);

export const Laptop: React.FC<IconProps> = (props) => (
  <SvgWrap {...props}>
    <rect width="18" height="12" x="3" y="4" rx="2" ry="2" />
    <line x1="2" x2="22" y1="20" y2="20" />
    <line x1="5" x2="19" y1="16" y2="16" />
  </SvgWrap>
);

export const Lock: React.FC<IconProps> = (props) => (
  <SvgWrap {...props}>
    <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </SvgWrap>
);

export const Mail: React.FC<IconProps> = (props) => (
  <SvgWrap {...props}>
    <rect width="20" height="14" x="2" y="5" rx="2" />
    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
  </SvgWrap>
);

export const ArrowRight: React.FC<IconProps> = (props) => (
  <SvgWrap {...props}>
    <path d="M5 12h14" />
    <path d="m12 5 7 7-7 7" />
  </SvgWrap>
);

export const ArrowLeft: React.FC<IconProps> = (props) => (
  <SvgWrap {...props}>
    <path d="M19 12h-14" />
    <path d="m12 19-7-7 7-7" />
  </SvgWrap>
);

export const AlertCircle: React.FC<IconProps> = (props) => (
  <SvgWrap {...props}>
    <circle cx="12" cy="12" r="10" />
    <line x1="12" x2="12" y1="8" y2="12" />
    <line x1="12" x2="12.01" y1="16" y2="16" />
  </SvgWrap>
);

export const ArrowUpRight: React.FC<IconProps> = (props) => (
  <SvgWrap {...props}>
    <line x1="7" x2="17" y1="17" y2="7" />
    <polyline points="7 7 17 7 17 17" />
  </SvgWrap>
);

export const TrendingUp: React.FC<IconProps> = (props) => (
  <SvgWrap {...props}>
    <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
    <polyline points="16 7 22 7 22 13" />
  </SvgWrap>
);

export const Clock: React.FC<IconProps> = (props) => (
  <SvgWrap {...props}>
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </SvgWrap>
);

export const Calendar: React.FC<IconProps> = (props) => (
  <SvgWrap {...props}>
    <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
    <line x1="16" x2="16" y1="2" y2="6" />
    <line x1="8" x2="8" y1="2" y2="6" />
    <line x1="3" x2="21" y1="10" y2="10" />
  </SvgWrap>
);

export const ExternalLink: React.FC<IconProps> = (props) => (
  <SvgWrap {...props}>
    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
    <polyline points="15 3 21 3 21 9" />
    <line x1="10" x2="21" y1="14" y2="3" />
  </SvgWrap>
);

export const AlertTriangle: React.FC<IconProps> = (props) => (
  <SvgWrap {...props}>
    <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
    <line x1="12" x2="12" y1="9" y2="13" />
    <line x1="12" x2="12.01" y1="17" y2="17" />
  </SvgWrap>
);

export const Eye: React.FC<IconProps> = (props) => (
  <SvgWrap {...props}>
    <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
    <circle cx="12" cy="12" r="3" />
  </SvgWrap>
);

export const EyeOff: React.FC<IconProps> = (props) => (
  <SvgWrap {...props}>
    <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
    <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
    <path d="M6.61 6.61A13.52 13.52 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
    <line x1="2" x2="22" y1="2" y2="22" />
  </SvgWrap>
);

export const Plus: React.FC<IconProps> = (props) => (
  <SvgWrap {...props}>
    <line x1="12" x2="12" y1="5" y2="19" />
    <line x1="5" x2="19" y1="12" y2="12" />
  </SvgWrap>
);

export const Trash: React.FC<IconProps> = (props) => (
  <SvgWrap {...props}>
    <path d="M3 6h18" />
    <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
    <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
  </SvgWrap>
);

export const Check: React.FC<IconProps> = (props) => (
  <SvgWrap {...props}>
    <polyline points="20 6 9 17 4 12" />
  </SvgWrap>
);

export const X: React.FC<IconProps> = (props) => (
  <SvgWrap {...props}>
    <line x1="18" x2="6" y1="6" y2="18" />
    <line x1="6" x2="18" y1="6" y2="18" />
  </SvgWrap>
);

export const Info: React.FC<IconProps> = (props) => (
  <SvgWrap {...props}>
    <circle cx="12" cy="12" r="10" />
    <line x1="12" x2="12" y1="16" y2="12" />
    <line x1="12" x2="12.01" y1="8" y2="8" />
  </SvgWrap>
);

export const Download: React.FC<IconProps> = (props) => (
  <SvgWrap {...props}>
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="7 10 12 15 17 10" />
    <line x1="12" x2="12" y1="15" y2="3" />
  </SvgWrap>
);

export const Edit: React.FC<IconProps> = (props) => (
  <SvgWrap {...props}>
    <path d="M12 20h9" />
    <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
  </SvgWrap>
);

export const Send: React.FC<IconProps> = (props) => (
  <SvgWrap {...props}>
    <line x1="22" x2="11" y1="2" y2="13" />
    <polygon points="22 2 15 22 11 13 2 9 22 2" />
  </SvgWrap>
);

export const Sparkles: React.FC<IconProps> = (props) => (
  <SvgWrap {...props}>
    <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
    <path d="m5 3 1 2.5L8.5 6 6 7 5 9.5 4 7 1.5 6 4 5.5Z" />
    <path d="m19 17 1 2.5 2.5.5-2.5 1-1 2.5-1-2.5-2.5-1 2.5-1Z" />
  </SvgWrap>
);

export const UserPlus: React.FC<IconProps> = (props) => (
  <SvgWrap {...props}>
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <line x1="19" x2="19" y1="8" y2="14" />
    <line x1="22" x2="16" y1="11" y2="11" />
  </SvgWrap>
);

