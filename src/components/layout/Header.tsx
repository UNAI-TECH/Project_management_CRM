import React, { useState } from 'react';
import { 
  Bell, 
  Search, 
  ChevronDown, 
  LogOut, 
  UserCheck, 
  Repeat, 
  Shield, 
  Briefcase, 
  Wrench, 
  User, 
  Check,
  Sparkles
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { UserRole } from '../../types';

interface HeaderProps {
  title: string;
  subtitle?: string;
  onSearch?: (query: string) => void;
}

export const Header: React.FC<HeaderProps> = ({ title, subtitle, onSearch }) => {
  const { 
    user, 
    role, 
    baseRole, 
    activeRole, 
    availableRoles, 
    isSwitchedRole, 
    switchRole, 
    resetRole, 
    signOut 
  } = useAuth();
  
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showRoleSwitcherMenu, setShowRoleSwitcherMenu] = useState(false);
  const [searchVal, setSearchVal] = useState('');

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchVal(e.target.value);
    if (onSearch) onSearch(e.target.value);
  };

  const getRoleLabel = (r: UserRole = role) => {
    switch (r) {
      case 'CEO':
        return 'Chief Executive Officer';
      case 'MD':
        return 'Managing Director';
      case 'COO':
        return 'Chief Operating Officer';
      case 'CTO':
        return 'Chief Technology Officer';
      case 'CIO':
        return 'Chief Information Officer';
      case 'PM':
        return 'Project Manager';
      case 'TL':
        return 'Team Lead';
      case 'Employee':
        return 'Developer / Employee';
      default:
        return r;
    }
  };

  const getRoleIcon = (r: UserRole) => {
    if (['CEO', 'MD', 'COO', 'CTO', 'CIO'].includes(r)) {
      return <Shield className="w-3.5 h-3.5 text-amber-600" />;
    }
    if (r === 'PM') {
      return <Briefcase className="w-3.5 h-3.5 text-blue-600" />;
    }
    if (r === 'TL') {
      return <Wrench className="w-3.5 h-3.5 text-emerald-600" />;
    }
    return <User className="w-3.5 h-3.5 text-slate-600" />;
  };

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between sticky top-0 z-20 shadow-xs font-sans">
      {/* Title / Breadcrumb */}
      <div>
        <h1 className="text-lg font-bold font-display text-slate-900 flex items-center gap-2">
          {title}
        </h1>
        {subtitle && <p className="text-xs text-slate-500 font-medium">{subtitle}</p>}
      </div>

      {/* Right controls */}
      <div className="flex items-center gap-3">
        {/* Search */}
        <div className="relative hidden md:block w-64">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchVal}
            onChange={handleSearchChange}
            placeholder="Search projects, tasks, docs..."
            className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder:text-slate-400 font-sans"
          />
        </div>

        {/* Role Switcher Pill for Multi-Role Users (e.g. CTO -> PM -> TL) */}
        {availableRoles && availableRoles.length > 1 && (
          <div className="relative">
            <button
              onClick={() => {
                setShowRoleSwitcherMenu(!showRoleSwitcherMenu);
                setShowUserMenu(false);
                setShowNotifications(false);
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all shadow-2xs cursor-pointer select-none ${
                isSwitchedRole
                  ? 'bg-amber-50 text-amber-900 border-amber-300 ring-2 ring-amber-400/20 hover:bg-amber-100'
                  : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
              }`}
            >
              <Repeat className={`w-3.5 h-3.5 ${isSwitchedRole ? 'text-amber-600 animate-spin-slow' : 'text-blue-600'}`} />
              <span className="hidden sm:inline text-[11px] font-semibold text-slate-500">View:</span>
              <span className="font-extrabold">{role}</span>
              {isSwitchedRole && (
                <span className="text-[9px] font-bold uppercase tracking-wider bg-amber-200 text-amber-900 px-1.5 py-0.2 rounded-md">
                  Active
                </span>
              )}
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>

            {/* Role Switcher Menu */}
            {showRoleSwitcherMenu && (
              <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-slate-200 p-2 z-50 animate-fade-in">
                <div className="px-3 py-2 border-b border-slate-100">
                  <p className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                    <span>Switch Role Perspective</span>
                  </p>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    Operate as PM or TL for specific projects without losing admin permissions.
                  </p>
                </div>

                <div className="py-1 space-y-1">
                  {availableRoles.map((r) => {
                    const isSelected = activeRole === r;
                    return (
                      <button
                        key={r}
                        onClick={() => {
                          switchRole(r);
                          setShowRoleSwitcherMenu(false);
                        }}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs transition-colors cursor-pointer ${
                          isSelected
                            ? 'bg-blue-50 text-blue-700 font-bold'
                            : 'hover:bg-slate-50 text-slate-700'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          {getRoleIcon(r)}
                          <div className="text-left">
                            <p className="font-bold">{r} {r === baseRole ? `(Base ${r})` : ''}</p>
                            <p className="text-[10px] text-slate-400">{getRoleLabel(r)}</p>
                          </div>
                        </div>
                        {isSelected && <Check className="w-4 h-4 text-blue-600" />}
                      </button>
                    );
                  })}
                </div>

                {isSwitchedRole && (
                  <div className="pt-1.5 border-t border-slate-100">
                    <button
                      onClick={() => {
                        resetRole();
                        setShowRoleSwitcherMenu(false);
                      }}
                      className="w-full text-center py-1.5 text-[11px] font-bold text-blue-600 hover:text-blue-800 hover:bg-blue-50/50 rounded-lg transition-colors cursor-pointer"
                    >
                      Reset to Default ({baseRole})
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Notifications */}
        <div className="relative">
          <button
            onClick={() => {
              setShowNotifications(!showNotifications);
              setShowUserMenu(false);
              setShowRoleSwitcherMenu(false);
            }}
            className="relative p-2 rounded-xl text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <Bell className="w-4 h-4" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-white" />
          </button>

          {/* Notifications Dropdown */}
          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-xl border border-slate-200 p-3.5 z-50 animate-fade-in">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <span className="text-xs font-bold font-display text-slate-800">Notifications</span>
                <span className="text-[10px] text-blue-600 font-semibold cursor-pointer hover:underline">Mark all as read</span>
              </div>
              <div className="divide-y divide-slate-100 py-1 max-h-60 overflow-y-auto">
                <div className="py-2.5 px-2 hover:bg-blue-50/50 rounded-xl transition-colors text-xs">
                  <p className="font-semibold text-slate-800">Task Verified: Fill Project Overview</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">Mike T approved task submission for Project Alpha.</p>
                  <span className="text-[10px] text-slate-400 mt-1 block">15 mins ago</span>
                </div>
                <div className="py-2.5 px-2 hover:bg-blue-50/50 rounded-xl transition-colors text-xs">
                  <p className="font-semibold text-slate-800">New Task Assigned</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">Define Project Scope assigned to David Wilson.</p>
                  <span className="text-[10px] text-slate-400 mt-1 block">1 hour ago</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* User Role Profile Header Chip */}
        <div className="relative">
          <div 
            onClick={() => {
              setShowUserMenu(!showUserMenu);
              setShowNotifications(false);
              setShowRoleSwitcherMenu(false);
            }}
            className="flex items-center gap-2.5 pl-2 border-l border-slate-200 cursor-pointer select-none"
          >
            <div className="relative">
              <img
                src={user?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'}
                alt={user?.fullName}
                className="w-8 h-8 rounded-full object-cover ring-2 ring-blue-500/30"
              />
              <span className="absolute bottom-0 right-0 w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-white" />
            </div>
            <div className="hidden sm:flex items-center gap-1.5">
              <span className="text-xs font-bold font-display text-slate-800">{getRoleLabel(role)}</span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </div>
          </div>

          {/* User Profile Dropdown Menu */}
          {showUserMenu && (
            <div className="absolute right-0 mt-2 w-60 bg-white rounded-2xl shadow-xl border border-slate-200 p-2 z-50 animate-fade-in">
              <div className="p-3 border-b border-slate-100">
                <p className="text-xs font-bold text-slate-900 font-display">{user?.fullName || 'Kamalesh S'}</p>
                <p className="text-[11px] text-slate-500 font-sans truncate">{user?.email || 'kamalesh@unaitech.com'}</p>
                <div className="flex items-center gap-1.5 mt-1">
                  <span className="inline-block text-[10px] font-semibold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full font-mono">
                    {baseRole}
                  </span>
                  {isSwitchedRole && (
                    <span className="inline-block text-[10px] font-semibold text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full font-mono">
                      Viewing as {role}
                    </span>
                  )}
                </div>
              </div>

              {/* Quick Switch Options in User Menu */}
              {availableRoles && availableRoles.length > 1 && (
                <div className="py-2 px-1 border-b border-slate-100">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2 mb-1">
                    Perspective Switch
                  </p>
                  <div className="space-y-0.5">
                    {availableRoles.map((r) => (
                      <button
                        key={r}
                        onClick={() => {
                          switchRole(r);
                          setShowUserMenu(false);
                        }}
                        className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-colors cursor-pointer ${
                          activeRole === r ? 'bg-blue-50 text-blue-700 font-bold' : 'text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        <span className="flex items-center gap-1.5">
                          {getRoleIcon(r)}
                          <span>{r === baseRole ? `${r} (Executive)` : `Switch as ${r}`}</span>
                        </span>
                        {activeRole === r && <Check className="w-3.5 h-3.5 text-blue-600" />}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="pt-1">
                <button
                  onClick={() => signOut()}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
                >
                  <LogOut className="w-4 h-4 text-rose-500" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
