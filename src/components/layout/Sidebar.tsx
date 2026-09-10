import { 
  LayoutDashboard, 
  FolderKanban, 
  FileText, 
  CheckSquare, 
  Users, 
  BarChart3, 
  ShieldCheck, 
  Settings, 
  ChevronRight,
  GitPullRequest
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export type NavTab = 
  | 'dashboard' 
  | 'projects' 
  | 'project-detail' 
  | 'documents' 
  | 'document-detail' 
  | 'document-edit' 
  | 'tasks' 
  | 'my-tasks' 
  | 'team' 
  | 'cr-inbox'
  | 'reports' 
  | 'audit-trail' 
  | 'settings';

interface SidebarProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  onOpenMobilePreview?: () => void;
  overdueTasksCount?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  overdueTasksCount = 18,
}) => {
  const { role, isFullAccessAdmin, hasPermission } = useAuth();

  const isEmployee = role === 'Employee';

  const navItems = [
    { id: 'dashboard' as NavTab, label: 'Dashboard', icon: LayoutDashboard, show: hasPermission('screen:dashboard') },
    { id: 'projects' as NavTab, label: 'Projects', icon: FolderKanban, show: hasPermission('screen:projects') },
    { 
      id: 'documents' as NavTab, 
      label: 'Documents', 
      icon: FileText, 
      show: hasPermission('screen:documents'),
      badge: isFullAccessAdmin ? '16' : undefined 
    },
    { 
      id: (isEmployee ? 'my-tasks' : 'tasks') as NavTab, 
      label: isEmployee ? 'My Tasks' : 'Tasks', 
      icon: CheckSquare, 
      show: isEmployee ? hasPermission('screen:my-tasks') : hasPermission('screen:tasks'),
      badge: overdueTasksCount > 0 ? `${overdueTasksCount}` : undefined,
      badgeColor: 'bg-rose-500 text-white'
    },
    { id: 'team' as NavTab, label: 'Team', icon: Users, show: hasPermission('screen:team') },
    { id: 'cr-inbox' as NavTab, label: 'CR Approvals', icon: GitPullRequest, show: hasPermission('screen:cr-inbox'), badgeColor: 'bg-purple-600 text-white' },
    { id: 'reports' as NavTab, label: 'Reports', icon: BarChart3, show: hasPermission('screen:reports') },
    { id: 'audit-trail' as NavTab, label: 'Audit Trail', icon: ShieldCheck, show: hasPermission('screen:audit-trail') },
    { id: 'settings' as NavTab, label: 'Settings', icon: Settings, show: hasPermission('screen:settings') },
  ].filter(item => item.show);

  return (
    <aside className="w-60 bg-[#1E5BF0] border-r border-blue-600 flex flex-col justify-between shrink-0 h-screen sticky top-0 text-white select-none z-30 font-sans shadow-xl">
      {/* Brand Header with UNAI Signature Logo */}
      <div>
        <div className="p-4 border-b border-blue-400/30 flex items-center justify-center">
          <div className="w-full bg-white py-2.5 px-3 rounded-2xl shadow-md border border-white/30 flex flex-col items-center justify-center">
            <img
              src="./unai-signature.png"
              alt="UNAI Logo"
              className="h-8 w-auto max-w-[170px] object-contain"
              onError={(e) => {
                (e.target as HTMLImageElement).src = '/unai-signature.png';
              }}
            />
          </div>
        </div>

        {/* Navigation Menu */}
        <nav className="p-3 space-y-1.5 mt-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = 
              currentTab === item.id || 
              (item.id === 'projects' && currentTab === 'project-detail') ||
              (item.id === 'documents' && (currentTab === 'document-detail' || currentTab === 'document-edit')) ||
              (item.id === 'tasks' && currentTab === 'my-tasks');

            return (
              <button
                key={item.id}
                onClick={() => onSelectTab(item.id)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all duration-150 group cursor-pointer ${
                  isActive
                    ? 'bg-white text-[#1E5BF0] shadow-md shadow-black/10'
                    : 'text-blue-100 hover:text-white hover:bg-white/15'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 transition-colors ${isActive ? 'text-[#1E5BF0]' : 'text-blue-200 group-hover:text-white'}`} />
                  <span>{item.label}</span>
                </div>

                <div className="flex items-center gap-1.5">
                  {item.badge && (
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        isActive
                          ? 'bg-[#1E5BF0] text-white'
                          : item.badgeColor || 'bg-white/20 text-white'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                  {isActive && <ChevronRight className="w-3.5 h-3.5 text-[#1E5BF0]" />}
                </div>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Clean Footer */}
      <div className="p-3.5 text-center border-t border-blue-400/30 text-[10px] text-blue-200 font-mono">
        UNAI PM CRM v1.0
      </div>
    </aside>
  );
};

export default Sidebar;
