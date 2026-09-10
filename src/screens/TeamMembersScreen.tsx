import React, { useState, useMemo } from 'react';
import { TeamMember, UserRole, Task } from '../types';
import { 
  ArrowLeft,
  ChevronRight,
  Search
} from '../components/icons';
import { 
  User, 
  Mail, 
  ShieldCheck, 
  Lock, 
  Briefcase, 
  Loader2, 
  CheckCircle2, 
  Shield, 
  Settings2,
  Clock,
  Layers,
  LayoutGrid,
  Zap,
  Coffee,
  GitBranch,
  Printer,
  FileText,
  Building,
  Plus,
  Award
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { resolveAccessLevel } from '../services/teamService';
import { timeTrackingService } from '../services/timeTrackingService';
import { Modal } from '../components/common/Modal';
import { MemberPortfolioModal } from '../components/modals/MemberPortfolioModal';
import { SkillProfileEditor } from '../components/SkillProfileEditor';

interface TeamMembersScreenProps {
  members: TeamMember[];
  projectName?: string;
  onBack?: () => void;
  onAddMember: (newMember: Partial<TeamMember>) => void;
  onSelectTask?: (taskId: string) => void;
}

export const TeamMembersScreen: React.FC<TeamMembersScreenProps> = ({
  members: initialMembers,
  projectName: initialProjectName = 'All Members',
  onBack,
  onAddMember,
  onSelectTask,
}) => {
  const { user, isFullAccessAdmin, inviteUser } = useAuth();
  const { teamMembers, projects, tasks, documents, updateTeamMember } = useData();

  const [selectedProjectId, setSelectedProjectId] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'cards' | 'list'>('cards');
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'All' | 'PM' | 'TL' | 'Employee'>('All');

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedMemberDetail, setSelectedMemberDetail] = useState<TeamMember | null>(null);
  const [portfolioMember, setPortfolioMember] = useState<TeamMember | null>(null);
  const [skillProfileMember, setSkillProfileMember] = useState<TeamMember | null>(null);

  // Edit Governance State for Admin
  const [editRole, setEditRole] = useState<UserRole>('Employee');
  const [editDesignation, setEditDesignation] = useState('');
  const [editAccessLevel, setEditAccessLevel] = useState<TeamMember['accessLevel']>('Task Access');
  const [editReportsTo, setEditReportsTo] = useState<string>('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [editSuccessMsg, setEditSuccessMsg] = useState<string | null>(null);

  // Add Member Form State
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<UserRole>('Employee');
  const [designation, setDesignation] = useState('Senior Developer');
  const [accessLevel, setAccessLevel] = useState<TeamMember['accessLevel']>('Task Access');
  const [targetProjectForAdd, setTargetProjectForAdd] = useState<string>(projects[0]?.id || 'all');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Helper to resolve avatar (custom photo from storage, localStorage cache, or colorful character avatar)
  const resolveMemberAvatar = (member: TeamMember) => {
    const cached = member.email ? localStorage.getItem(`unai_user_avatar_${member.email.toLowerCase()}`) : null;
    if (cached) return cached;
    if (member.avatar && !member.avatar.includes('initials')) return member.avatar;
    return `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(member.name)}&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf`;
  };

  // Pool of all organization members or project-filtered members
  const activeMembersPool = useMemo(() => {
    const basePool = teamMembers.length > 0 ? teamMembers : initialMembers;
    if (selectedProjectId === 'all') {
      return basePool;
    }
    const projectMembers = basePool.filter((m) => {
      const isDirectProject = m.projectId === selectedProjectId;
      const hasTaskInProject = tasks.some((t) => {
        if (t.projectId !== selectedProjectId) return false;
        const matchId = t.assignedTo === m.id;
        const matchEmail = m.email && t.assignedTo?.toLowerCase() === m.email.toLowerCase();
        const matchName = m.name && t.assignedToName?.toLowerCase() === m.name.toLowerCase();
        return matchId || matchEmail || matchName;
      });
      return isDirectProject || hasTaskInProject;
    });

    return projectMembers.length > 0 ? projectMembers : basePool;
  }, [selectedProjectId, teamMembers, initialMembers, tasks]);

  // Search & Filter
  const filteredMembers = useMemo(() => {
    return activeMembersPool.filter((member) => {
      const matchesSearch =
        member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        member.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (member.designation && member.designation.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesRole = roleFilter === 'All' || member.role === roleFilter;

      return matchesSearch && matchesRole;
    });
  }, [activeMembersPool, searchQuery, roleFilter]);

  // Compute Active Project Name
  const currentProjectName = useMemo(() => {
    if (selectedProjectId === 'all') return 'All Organization Projects';
    const found = projects.find((p) => p.id === selectedProjectId);
    return found ? found.name : initialProjectName;
  }, [selectedProjectId, projects, initialProjectName]);

  // Helper to compute member task statistics (including direct and delegated tasks for PM/TL)
  const getMemberStats = (member: TeamMember) => {
    const isExact = (targetId?: string | null, targetName?: string | null, targetEmail?: string | null) => {
      if (targetId && member.id && targetId === member.id) return true;
      if (targetEmail && member.email && targetEmail.trim().toLowerCase() === member.email.trim().toLowerCase()) return true;
      if (targetName && member.name && targetName.trim().toLowerCase() === member.name.trim().toLowerCase()) return true;
      return false;
    };

    const memDirectTasks = tasks.filter((t) => {
      const matchProject = selectedProjectId === 'all' || t.projectId === selectedProjectId;
      return matchProject && isExact(t.assignedTo, t.assignedToName, t.assignedTo);
    });

    const memDelegatedTasks = tasks.filter((t) => {
      const matchProject = selectedProjectId === 'all' || t.projectId === selectedProjectId;
      const isAssignedBy = isExact(t.assignedBy, t.assignedByName, t.assignedBy);
      const isAssignedTo = isExact(t.assignedTo, t.assignedToName, t.assignedTo);
      return matchProject && isAssignedBy && !isAssignedTo;
    });

    const allMemberTasks = [...memDirectTasks, ...memDelegatedTasks];
    const totalWorkM = allMemberTasks.reduce(
      (sum, t) => sum + (t.timeTracker?.totalWorkMinutes ?? Math.round((t.actualHours || 0) * 60)),
      0
    );
    const totalBreakM = allMemberTasks.reduce(
      (sum, t) => sum + (t.timeTracker?.totalBreakMinutes ?? 0),
      0
    );
    const completedTasks = allMemberTasks.filter((t) => t.status === 'Verified');
    const memberDocsCount = documents.filter((d) => isExact(d.ownerId, d.ownerName)).length;
    const points = completedTasks.length * 5 + Math.round(totalWorkM / 60) + memberDocsCount * 10;

    return {
      totalTasks: allMemberTasks.length,
      completedTasks: completedTasks.length,
      directCount: memDirectTasks.length,
      delegatedCount: memDelegatedTasks.length,
      workMinutes: totalWorkM,
      breakMinutes: totalBreakM,
      points,
    };
  };

  const handleOpenMemberGovernance = (member: TeamMember) => {
    setSelectedMemberDetail(member);
    setEditRole(member.role);
    setEditDesignation(member.designation || (member.role === 'PM' ? 'Project Manager' : member.role === 'TL' ? 'Technical Lead' : 'Software Engineer'));
    setEditAccessLevel(resolveAccessLevel(member.role, member.designation));
    setEditReportsTo(member.reportsTo || '');
    setEditSuccessMsg(null);
  };

  const handleSaveGovernance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMemberDetail) return;
    setIsSavingEdit(true);
    setEditSuccessMsg(null);

    const derivedAccess = resolveAccessLevel(editRole, editDesignation);

    try {
      await updateTeamMember(selectedMemberDetail.id, {
        role: editRole,
        designation: editDesignation.trim(),
        accessLevel: derivedAccess,
        reportsTo: editReportsTo || null,
      });

      setEditSuccessMsg('Permissions and designation updated successfully!');
      setTimeout(() => {
        setSelectedMemberDetail(null);
      }, 1000);
    } catch (err: any) {
      console.error('Failed to update member access:', err);
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = email.trim().toLowerCase();
    const cleanName = name.trim();
    if (!cleanName || !cleanEmail) return;

    setIsSubmitting(true);
    setFormError(null);

    try {
      // 1. Sync to Supabase auth organization_members
      await inviteUser({
        email: cleanEmail,
        fullName: cleanName,
        role,
        department: 'Engineering',
        designation: designation.trim() || (role === 'PM' ? 'Project Manager' : role === 'TL' ? 'Team Lead' : 'Software Engineer'),
      });

      // 2. Add to CRM project state with automatic hierarchy
      const resolvedReportsTo =
        role === 'PM'
          ? user?.id
          : role === 'TL'
          ? activeMembersPool.find((m) => m.role === 'PM')?.id || user?.id
          : activeMembersPool.find((m) => m.role === 'TL')?.id || activeMembersPool.find((m) => m.role === 'PM')?.id || user?.id;

      await onAddMember({
        projectId: targetProjectForAdd === 'all' ? (projects[0]?.id || 'proj-1') : targetProjectForAdd,
        name: cleanName,
        email: cleanEmail,
        role,
        designation: designation.trim() || (role === 'PM' ? 'Project Manager' : role === 'TL' ? 'Team Lead' : 'Software Engineer'),
        department: 'Engineering',
        accessLevel,
        reportsTo: resolvedReportsTo,
        avatar: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(cleanName)}&backgroundColor=0d82ff,00d1ff,6366f1`,
        tasksCount: 0,
        completedTasksCount: 0,
      });

      setIsAddModalOpen(false);
      setName('');
      setEmail('');
      setDesignation('Senior Developer');
    } catch (err: any) {
      console.error('[TeamMembers] Error adding member:', err);
      setFormError(err.message || 'Failed to add member to organization.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 pb-12 animate-fade-in">
      {/* Back Button if present */}
      {onBack && (
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-blue-600 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4 text-slate-400 hover:text-blue-600" />
          <span>Back to Project</span>
        </button>
      )}

      {/* Header Banner & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
              Team Members & Engineering Capacity
            </h2>
            <span className="text-xs font-bold bg-blue-50 text-blue-700 px-2.5 py-0.5 rounded-full border border-blue-200">
              {filteredMembers.length} Members
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Role-based allocation, task execution tracking, logged hours, and downloadable work portfolios
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {/* View Mode Toggle */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs">
            <button
              onClick={() => setViewMode('cards')}
              className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                viewMode === 'cards' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Cards View</span>
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                viewMode === 'list' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Table List</span>
            </button>
          </div>

          {isFullAccessAdmin && (
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="px-4 py-2 rounded-xl font-bold text-white text-xs bg-gradient-to-r from-[#0d82ff] to-[#00d1ff] hover:from-[#0065ff] hover:to-[#00bce8] shadow-[0_4px_18px_rgba(13,130,255,0.35)] transition-all flex items-center gap-2 cursor-pointer transform hover:-translate-y-0.5"
            >
              <Plus className="w-4 h-4 text-white" />
              <span>+ Add Member</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter & Project Selector Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Project Selector & Search */}
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Project Selector Dropdown */}
          <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
            <Building className="w-3.5 h-3.5 text-blue-600" />
            <select
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              className="text-xs font-bold text-slate-800 bg-transparent focus:outline-none cursor-pointer"
            >
              <option value="all">🏢 All Organization Projects</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  📁 {p.name}
                </option>
              ))}
            </select>
          </div>

          {/* Search Input */}
          <div className="relative flex-1 sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search member, email, or designation..."
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-slate-800 placeholder-slate-400"
            />
          </div>
        </div>

        {/* Role Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto">
          {(['All', 'PM', 'TL', 'Employee'] as const).map((r) => (
            <button
              key={r}
              onClick={() => setRoleFilter(r)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                roleFilter === r
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {r === 'All' ? 'All Roles' : r === 'PM' ? 'Project Managers' : r === 'TL' ? 'Tech Leads' : 'Engineers'}
            </button>
          ))}
        </div>
      </div>

      {/* VIEW 1: CARD STRUCTURE GRID (Default) */}
      {viewMode === 'cards' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredMembers.length === 0 ? (
            <div className="col-span-full py-16 text-center bg-white rounded-2xl border border-dashed border-slate-200">
              <User className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <h3 className="text-sm font-bold text-slate-700">No team members found</h3>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                No members match the selected project or search filter. Use "+ Add Member" to authorize personnel.
              </p>
            </div>
          ) : (
            filteredMembers.map((member) => {
              const stats = getMemberStats(member);
              const avatar = resolveMemberAvatar(member);

              return (
                <div
                  key={member.id}
                  onClick={() => setPortfolioMember(member)}
                  className="bg-white rounded-2xl border border-slate-200 hover:border-blue-300 p-5 shadow-2xs hover:shadow-md transition-all cursor-pointer space-y-4 group relative flex flex-col justify-between"
                >
                  {/* Top Profile Row */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3.5">
                      <img
                        src={avatar}
                        alt={member.name}
                        className="w-12 h-12 rounded-2xl border-2 border-slate-100 object-cover shadow-2xs group-hover:border-blue-400 transition-colors shrink-0"
                      />
                      <div className="space-y-0.5">
                        <h3 className="text-sm font-extrabold text-slate-900 group-hover:text-blue-600 transition-colors">
                          {member.name}
                        </h3>
                        <p className="text-[11px] font-semibold text-slate-600 line-clamp-1">
                          {member.designation || (member.role === 'PM' ? 'Project Manager' : member.role === 'TL' ? 'Technical Lead' : 'Software Engineer')}
                        </p>
                        <p className="text-[10px] text-slate-400 font-mono line-clamp-1">{member.email}</p>
                      </div>
                    </div>

                    <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${
                      member.role === 'PM'
                        ? 'bg-amber-50 text-amber-800 border-amber-200'
                        : member.role === 'TL'
                        ? 'bg-indigo-50 text-indigo-800 border-indigo-200'
                        : 'bg-blue-50 text-blue-800 border-blue-200'
                    }`}>
                      {member.role}
                    </span>
                  </div>

                  {/* Stats Grid Matrix */}
                  <div className="grid grid-cols-3 gap-2 py-2.5 px-3 bg-slate-50 rounded-xl border border-slate-100 text-center">
                    <div>
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Work Time</span>
                      <span className="text-xs font-black text-blue-700">
                        {timeTrackingService.formatDuration(stats.workMinutes)}
                      </span>
                    </div>

                    <div>
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Tasks Done</span>
                      <span className="text-xs font-black text-emerald-700">
                        {stats.completedTasks}/{stats.totalTasks}
                      </span>
                    </div>

                    <div>
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Points</span>
                      <span className="text-xs font-black text-indigo-700 flex items-center justify-center gap-0.5">
                        <Zap className="w-3 h-3 text-amber-500 fill-amber-500" />
                        {stats.points}
                      </span>
                    </div>
                  </div>

                  {/* Card Footer: Access Level & Action Button */}
                  <div className="flex items-center justify-between text-[11px] pt-2 border-t border-slate-100 text-slate-500">
                    <div className="flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
                      <span className="font-semibold text-slate-700">{member.accessLevel}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSkillProfileMember(member);
                        }}
                        className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold rounded-lg flex items-center gap-1 text-[11px] transition-colors"
                        title="Edit Skills & Overrides"
                      >
                        <Award className="w-3 h-3" />
                        <span>Skills</span>
                      </button>
                      <div className="flex items-center gap-1 text-blue-600 font-bold group-hover:translate-x-0.5 transition-transform">
                        <span>Portfolio</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      ) : (
        /* VIEW 2: TABLE LIST */
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Member</th>
                  <th className="py-3 px-4">Role</th>
                  <th className="py-3 px-4">Designation</th>
                  <th className="py-3 px-4">Work Time</th>
                  <th className="py-3 px-4">Tasks Done</th>
                  <th className="py-3 px-4">Points</th>
                  <th className="py-3 px-4">Access Level</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredMembers.map((member) => {
                  const stats = getMemberStats(member);
                  const avatar = resolveMemberAvatar(member);

                  return (
                    <tr 
                      key={member.id} 
                      onClick={() => setPortfolioMember(member)}
                      className="hover:bg-blue-50/40 transition-colors cursor-pointer group"
                    >
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <img
                            src={avatar}
                            alt={member.name}
                            className="w-9 h-9 rounded-full border border-slate-200 object-cover"
                          />
                          <div>
                            <p className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors">{member.name}</p>
                            <p className="text-[11px] text-slate-400 font-mono">{member.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-slate-700">
                        <span className="bg-blue-50 text-blue-800 px-2.5 py-0.5 rounded-full font-bold text-[11px] border border-blue-200">
                          {member.role}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-medium text-slate-700">
                        <span className="bg-slate-100 text-slate-800 px-2 py-0.5 rounded-md font-semibold text-[11px]">
                          {member.designation}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-bold text-blue-700">
                        {timeTrackingService.formatDuration(stats.workMinutes)}
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-slate-700">
                        {stats.completedTasks} / {stats.totalTasks}
                      </td>
                      <td className="py-3.5 px-4 font-black text-indigo-700">
                        {stats.points} pts
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full border bg-slate-100 text-slate-700 border-slate-200">
                          {member.accessLevel}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSkillProfileMember(member);
                            }}
                            className="px-2 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold rounded-lg flex items-center gap-1 text-[11px] transition-colors"
                            title="Edit Skills & Overrides"
                          >
                            <Award className="w-3 h-3" />
                            <span>Skills</span>
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setPortfolioMember(member);
                            }}
                            className="p-1.5 text-slate-400 hover:text-blue-600 rounded-lg hover:bg-blue-100/60 transition-colors cursor-pointer"
                            title="View Member Work Portfolio & Report"
                          >
                            <ChevronRight className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Member Work Portfolio & Performance Modal */}
      {portfolioMember && (
        <MemberPortfolioModal
          isOpen={Boolean(portfolioMember)}
          onClose={() => setPortfolioMember(null)}
          member={portfolioMember}
          tasks={tasks}
          projectName={currentProjectName}
          onOpenGovernance={(m) => {
            setPortfolioMember(null);
            handleOpenMemberGovernance(m);
          }}
          onSelectTask={onSelectTask}
        />
      )}

      {/* Assign Project Member Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Assign Project Member"
        subtitle="Authorize an employee from Onboarding Platform to work on this project"
        maxWidth="md"
      >
        <form onSubmit={handleAddSubmit} className="space-y-4">
          <div>
            <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <Building className="w-3.5 h-3.5 text-blue-600" />
              <span>Target Project</span>
            </label>
            <select
              value={targetProjectForAdd}
              onChange={(e) => setTargetProjectForAdd(e.target.value)}
              className="w-full px-3 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-semibold text-slate-800 cursor-pointer"
            >
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-blue-600" />
              <span>Member Full Name *</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Johnathan Doe"
              className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-slate-800 placeholder-slate-400"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-blue-600" />
              <span>Work Email *</span>
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={`name@${user?.organizationName ? user.organizationName.toLowerCase().replace(/[^a-z0-9]/g, '') + '.com' : 'yourcompany.com'}`}
              className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-slate-800 placeholder-slate-400"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
                <span>Project Role</span>
              </label>
              <select
                value={role}
                onChange={(e) => {
                  const newRole = e.target.value as UserRole;
                  setRole(newRole);
                  if (newRole === 'PM') {
                    setDesignation('Project Manager');
                    setAccessLevel('Team Access');
                  } else if (newRole === 'TL') {
                    setDesignation('Technical Lead');
                    setAccessLevel('Team Access');
                  } else {
                    setDesignation('Senior Developer');
                    setAccessLevel('Task Access');
                  }
                }}
                className="w-full px-3 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-semibold text-slate-800 cursor-pointer"
              >
                <option value="Employee">Employee / Developer</option>
                <option value="TL">Team Lead (TL)</option>
                <option value="PM">Project Manager (PM)</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-blue-600" />
                <span>Task Access Level</span>
              </label>
              <select
                value={accessLevel}
                onChange={(e) => setAccessLevel(e.target.value as any)}
                className="w-full px-3 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-semibold text-slate-800 cursor-pointer"
              >
                <option value="Task Access">Task Access (Update only)</option>
                <option value="Team Access">Team Access (Delegate & Update)</option>
                <option value="Full Access">Full Access (Full Authority)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <Briefcase className="w-3.5 h-3.5 text-blue-600" />
              <span>Designation</span>
            </label>
            <input
              type="text"
              value={designation}
              onChange={(e) => setDesignation(e.target.value)}
              placeholder="e.g. Intern / Junior Developer / Senior Engineer"
              className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-slate-800 placeholder-slate-400"
            />
          </div>

          {formError && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium">
              {formError}
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => setIsAddModalOpen(false)}
              className="px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 text-xs font-bold text-white rounded-xl bg-gradient-to-r from-[#0d82ff] to-[#00d1ff] hover:from-[#0065ff] hover:to-[#00bce8] shadow-[0_4px_18px_rgba(13,130,255,0.35)] transition-all cursor-pointer transform hover:-translate-y-0.5 disabled:opacity-50 flex items-center gap-1.5"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Adding Member...</span>
                </>
              ) : (
                <span>Add Member</span>
              )}
            </button>
          </div>
        </form>
      </Modal>

      {/* Member Details & Governance / Access Configuration Modal */}
      {selectedMemberDetail && (
        <Modal
          isOpen={Boolean(selectedMemberDetail)}
          onClose={() => {
            if (!isSavingEdit) setSelectedMemberDetail(null);
          }}
          title={isFullAccessAdmin ? "Member Governance & Access Control" : "Team Member Profile"}
          subtitle={isFullAccessAdmin ? "Configure task delegation permissions, role, and designation" : "Project role assignment, department, and system access tier"}
          maxWidth="md"
        >
          {isFullAccessAdmin ? (
            <form onSubmit={handleSaveGovernance} className="space-y-4">
              <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-200">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-cyan-500 text-white font-bold text-base flex items-center justify-center shadow-xs">
                  {selectedMemberDetail.name.charAt(0)}
                </div>
                <div>
                  <h4 className="font-bold text-sm text-slate-900">{selectedMemberDetail.name}</h4>
                  <p className="text-xs text-slate-500 font-mono">{selectedMemberDetail.email}</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">Department: {selectedMemberDetail.department}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
                    <span>Project Role</span>
                  </label>
                  <select
                    value={editRole}
                    onChange={(e) => {
                      const newRole = e.target.value as UserRole;
                      setEditRole(newRole);
                      let newDes = editDesignation;
                      if (newRole === 'TL' && (!editDesignation || editDesignation === 'Software Engineer' || editDesignation === 'Project Manager')) {
                        newDes = 'Technical Lead';
                      } else if (newRole === 'PM' && (!editDesignation || editDesignation === 'Software Engineer' || editDesignation === 'Technical Lead')) {
                        newDes = 'Project Manager';
                      } else if (newRole === 'CTO') {
                        newDes = 'Chief Technology Officer (CTO)';
                      } else if (newRole === 'Employee' && (editDesignation === 'Technical Lead' || editDesignation === 'Project Manager')) {
                        newDes = 'Software Engineer';
                      }
                      setEditDesignation(newDes);
                      setEditAccessLevel(resolveAccessLevel(newRole, newDes));
                    }}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-semibold text-slate-800 cursor-pointer"
                  >
                    <option value="Employee">Employee / Developer</option>
                    <option value="TL">Team Lead (TL)</option>
                    <option value="PM">Project Manager (PM)</option>
                    <option value="CTO">Chief Technology Officer (CTO)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-blue-600" />
                    <span>Task Access Level (Auto-derived)</span>
                  </label>
                  <select
                    value={editAccessLevel}
                    onChange={(e) => setEditAccessLevel(e.target.value as any)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-semibold text-slate-800 cursor-pointer"
                  >
                    <option value="Task Access">Task Access (Update only)</option>
                    <option value="Team Access">Team Access (Create & Delegate)</option>
                    <option value="Full Access">Full Access (Full Authority)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <Briefcase className="w-3.5 h-3.5 text-blue-600" />
                  <span>Designation (e.g. Intern, Junior Dev, Senior Dev, Technical Lead)</span>
                </label>
                <input
                  type="text"
                  required
                  value={editDesignation}
                  onChange={(e) => {
                    setEditDesignation(e.target.value);
                    setEditAccessLevel(resolveAccessLevel(editRole, e.target.value));
                  }}
                  placeholder="e.g. Intern / Junior Developer / Senior Fullstack Engineer"
                  className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-slate-800"
                />
              </div>

              {/* Dynamic Access Explanation Notice */}
              <div className={`p-3.5 rounded-xl border text-xs space-y-1 ${
                editAccessLevel === 'Task Access'
                  ? 'bg-amber-50 border-amber-200 text-amber-900'
                  : editAccessLevel === 'Team Access'
                  ? 'bg-blue-50 border-blue-200 text-blue-900'
                  : 'bg-emerald-50 border-emerald-200 text-emerald-900'
              }`}>
                <p className="font-bold flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5" />
                  <span>
                    {editAccessLevel === 'Task Access'
                      ? 'Task Access (Normal Employee / Intern Rules)'
                      : editAccessLevel === 'Team Access'
                      ? 'Team Access (Team Lead / PM Delegation Rules)'
                      : 'Full Access (Executive Oversight Rules)'}
                  </span>
                </p>
                <p className="text-[11px] leading-relaxed">
                  {editAccessLevel === 'Task Access'
                    ? '• Can view and update progress, notes, and deliverable files on assigned tasks.\n• Cannot create, split, or assign new tasks.'
                    : editAccessLevel === 'Team Access'
                    ? '• Can review tasks assigned by higher authorities, update progress, and create/delegate child tasks to team members.'
                    : '• Complete authority to create, assign, verify, and delete tasks and documents across the entire organization.'}
                </p>
              </div>

              {editSuccessMsg && (
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>{editSuccessMsg}</span>
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  disabled={isSavingEdit}
                  onClick={() => setSelectedMemberDetail(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingEdit}
                  className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                >
                  {isSavingEdit ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving Changes...</span>
                    </>
                  ) : (
                    <span>Save Governance & Permissions</span>
                  )}
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-200">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-cyan-500 text-white font-bold text-base flex items-center justify-center">
                  {selectedMemberDetail.name.charAt(0)}
                </div>
                <div>
                  <h4 className="font-bold text-sm text-slate-900">{selectedMemberDetail.name}</h4>
                  <p className="text-xs text-slate-500 font-mono">{selectedMemberDetail.email}</p>
                  <div className="flex items-center gap-1.5 mt-1">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                      {selectedMemberDetail.role}
                    </span>
                    <span className="text-[10px] font-semibold text-slate-600 bg-white px-2 py-0.5 rounded-full border border-slate-200">
                      {selectedMemberDetail.designation}
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 bg-white rounded-xl border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Department</span>
                  <span className="font-semibold text-slate-800">{selectedMemberDetail.department}</span>
                </div>
                <div className="p-3 bg-white rounded-xl border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Access Scope</span>
                  <span className="font-semibold text-emerald-700">{selectedMemberDetail.accessLevel}</span>
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Reporting Line (Hierarchy)</span>
                <span className="font-semibold text-slate-800">
                  {selectedMemberDetail.role === 'PM'
                    ? '👑 Reports to CTO / Executive Sponsor'
                    : selectedMemberDetail.role === 'TL'
                    ? '⚡ Reports to Project Manager (PM)'
                    : '🛠️ Reports to Technical Lead (TL)'}
                </span>
              </div>

              <div className="p-3.5 bg-blue-50/60 rounded-xl border border-blue-100 text-xs text-blue-900 space-y-1">
                <p className="font-bold">Project Collaboration Scope</p>
                <p className="text-[11px] text-blue-700">
                  This member has active collaborative access to documentation, task boards, and lifecycle milestones allocated to {currentProjectName}.
                </p>
              </div>

              <div className="flex justify-end pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setSelectedMemberDetail(null)}
                  className="px-5 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          )}
        </Modal>
      )}

      {/* Skill Profile Modal */}
      {skillProfileMember && (
        <Modal
          isOpen={!!skillProfileMember}
          onClose={() => setSkillProfileMember(null)}
          title="Employee Skill Profile & Project Overrides"
          subtitle="Configure master technical skills and project-specific overrides for smart task delegation"
          maxWidth="2xl"
        >
          <SkillProfileEditor
            employee={skillProfileMember}
            projectId={selectedProjectId !== 'all' ? selectedProjectId : undefined}
            projectName={currentProjectName}
            currentUser={{
              id: user?.id || 'emp-curr',
              name: user?.fullName || 'User',
              role: user?.role || 'Employee',
            }}
            organizationId={user?.organizationId || 'org-unai'}
          />
        </Modal>
      )}
    </div>
  );
};
