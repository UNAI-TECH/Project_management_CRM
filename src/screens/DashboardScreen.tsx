import React from 'react';
import { 
  FolderKanban, 
  FileText, 
  CheckSquare, 
  AlertTriangle, 
  Calendar,
  ChevronRight,
  Plus,
  Building2,
  Sparkles,
  Lock,
  Clock,
  ArrowRight,
  ShieldCheck,
  Repeat,
  Briefcase,
  Wrench,
  Shield
} from 'lucide-react';
import { StatCard } from '../components/common/StatCard';
import { DonutChart } from '../components/common/DonutChart';
import { BarChart } from '../components/common/BarChart';
import { StatusBadge } from '../components/common/StatusBadge';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { NavTab } from '../components/layout/Sidebar';
import { UserRole } from '../types';
import { isDocumentEditable } from '../constants/documentDependencyGraph';

interface DashboardScreenProps {
  onNavigate: (tab: NavTab) => void;
  onSelectProject: (projectId: string) => void;
  onSelectTask: (taskId: string) => void;
}

export const DashboardScreen: React.FC<DashboardScreenProps> = ({
  onNavigate,
  onSelectProject,
  onSelectTask,
}) => {
  const { 
    role, 
    baseRole, 
    activeRole, 
    isSwitchedRole, 
    switchRole, 
    resetRole, 
    user, 
    isFullAccessAdmin 
  } = useAuth();
  const { projects, tasks, features, teamMembers, documents } = useData();

  // Filter accessible projects based on role & assignment
  const accessibleProjects = projects.filter((prj) => {
    if (isFullAccessAdmin) return true;
    if (!user) return false;
    const isAssignedPm =
      prj.pmId === user.id ||
      (prj.pmName && user.fullName && prj.pmName.toLowerCase() === user.fullName.toLowerCase());
    const isMemberOfProject = teamMembers.some(
      (m) =>
        m.projectId === prj.id &&
        (m.email?.toLowerCase() === user.email?.toLowerCase() ||
          m.name?.toLowerCase() === user.fullName?.toLowerCase())
    );
    const hasAssignedTasks = tasks.some(
      (t) =>
        t.projectId === prj.id &&
        (t.assignedTo === user.id ||
          t.assignedToName?.toLowerCase() === user.fullName?.toLowerCase() ||
          t.assignedBy === user.id)
    );
    return isAssignedPm || isMemberOfProject || hasAssignedTasks;
  });

  // Compute stats dynamically from accessible projects
  const totalProjects = accessibleProjects.length;
  const activeProjects = accessibleProjects.filter((p) => p.status !== 'Completed' && p.status !== 'Planning').length;
  const totalDocuments = accessibleProjects.reduce((acc, p) => acc + (p.totalDocuments || 16), 0);
  const totalTasks = tasks.length > 0 ? tasks.length : 0;
  const pendingTasks = tasks.filter((t) => t.status !== 'Verified').length;
  const overdueTasks = tasks.filter((t) => t.status !== 'Verified' && t.priority === 'High').length;

  const onTrackCount = accessibleProjects.filter((p) => p.status === 'On Track').length;
  const atRiskCount = accessibleProjects.filter((p) => p.status === 'At Risk').length;
  const delayedCount = accessibleProjects.filter((p) => p.status === 'Delayed').length;
  const completedCount = accessibleProjects.filter((p) => p.status === 'Completed').length;

  const donutData = [
    { label: 'On Track', value: onTrackCount || (accessibleProjects.length === 0 ? 0 : 1), color: '#10b981', hoverColor: '#059669' },
    { label: 'At Risk', value: atRiskCount, color: '#f59e0b', hoverColor: '#d97706' },
    { label: 'Delayed', value: delayedCount, color: '#ef4444', hoverColor: '#dc2626' },
    { label: 'Completed', value: completedCount, color: '#2563eb', hoverColor: '#1d4ed8' },
  ];

  const monthlyTaskOverview = [
    { month: 'Jan', completed: 15, pending: 10, overdue: 2 },
    { month: 'Feb', completed: 20, pending: 8, overdue: 4 },
    { month: 'Mar', completed: 18, pending: 12, overdue: 1 },
    { month: 'Apr', completed: 22, pending: 5, overdue: 3 },
    { month: 'May', completed: 25, pending: 9, overdue: 2 },
    { month: 'Jun', completed: 30, pending: 7, overdue: 0 },
  ];

  // Default recent projects matching Screen 2
  const recentProjectsList = projects.length > 0 ? projects.slice(0, 4) : [
    { id: 'p1', name: 'Project Alpha', client: 'ABC Corp', pmName: 'John D.', status: 'On Track' as const, progress: 25, startDate: '01 May, 2024' },
    { id: 'p2', name: 'Project Beta', client: 'XYZ Ltd', pmName: 'Sarah K.', status: 'At Risk' as const, progress: 60, startDate: '15 Apr, 2024' },
    { id: 'p3', name: 'Project Gamma', client: 'UNAI Internal', pmName: 'Mike T.', status: 'Delayed' as const, progress: 40, startDate: '10 Mar, 2024' },
    { id: 'p4', name: 'Project Delta', client: 'PQR Solutions', pmName: 'John D.', status: 'On Track' as const, progress: 75, startDate: '01 Feb, 2024' },
  ];

  return (
    <div className="space-y-6 pb-12 animate-fade-in font-sans">
      {/* Company & Executive Welcome Banner */}
      <div className="bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-800 rounded-2xl p-5 text-white shadow-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          {user?.organizationLogo ? (
            <div className="w-14 h-14 bg-white rounded-2xl p-1.5 shadow-sm ring-2 ring-white/30 flex items-center justify-center shrink-0 overflow-hidden">
              <img 
                src={user.organizationLogo} 
                alt={user?.organizationName || 'Company Logo'} 
                className="w-full h-full object-contain"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }} 
              />
            </div>
          ) : (
            <div className="w-14 h-14 bg-white/15 rounded-2xl flex items-center justify-center shrink-0 border border-white/20 shadow-inner">
              <Building2 className="w-7 h-7 text-white" />
            </div>
          )}
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold font-display tracking-tight text-white">
                {user?.organizationName || 'UNAI Tech Workspace'}
              </h2>
              <span className="text-[10px] font-semibold bg-emerald-500/30 text-emerald-200 border border-emerald-400/30 px-2 py-0.5 rounded-full">
                {role === 'PM' ? 'PM Delivery Workspace' : 'Active Organization'}
              </span>
            </div>
            <p className="text-xs text-blue-100/80 mt-0.5">
              Welcome back, <strong>{user?.fullName || 'Project Manager'}</strong> ({role === 'PM' ? 'Project Manager' : user?.designation || role}) • PM CRM Workspace
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 self-end sm:self-auto">
          {isFullAccessAdmin ? (
            <button
              onClick={() => onNavigate('projects')}
              className="px-4 py-2.5 rounded-xl font-bold text-white text-xs bg-gradient-to-r from-[#0d82ff] to-[#00d1ff] hover:from-[#0065ff] hover:to-[#00bce8] shadow-[0_4px_18px_rgba(13,130,255,0.35)] transition-all flex items-center gap-1.5 cursor-pointer transform hover:-translate-y-0.5"
            >
              <Plus className="w-4 h-4 text-white" />
              <span>New Project</span>
            </button>
          ) : (
            <button
              onClick={() => onNavigate('projects')}
              className="px-4 py-2.5 rounded-xl font-bold text-white text-xs bg-white/15 hover:bg-white/25 border border-white/20 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <FolderKanban className="w-4 h-4 text-white" />
              <span>View Projects</span>
            </button>
          )}
        </div>
      </div>

      {/* Role Switching Interactive Callout Banner */}
      {baseRole !== 'Employee' && (
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl ${
              isSwitchedRole ? 'bg-amber-50 text-amber-600 border border-amber-200' : 'bg-blue-50 text-blue-600'
            }`}>
              <Repeat className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-800">
                  {isSwitchedRole 
                    ? `Operating in ${role} Mode (Base Role: ${baseRole})`
                    : `Multi-Project Role Capabilities for ${baseRole}`}
                </span>
                <span className="text-[10px] font-semibold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md">
                  Active View: {role}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                {role === 'PM' 
                  ? 'Viewing PM-assigned projects, sprint delegations, document lifecycles, and team member workflows.'
                  : role === 'TL'
                  ? 'Viewing TL task delegation board, engineering subtasks, code checklists, and developer submissions.'
                  : 'As an Executive, you can switch perspective to operate directly as PM or TL for specific client deliverables.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end md:self-auto shrink-0">
            {role !== 'PM' && (['CEO', 'MD', 'COO', 'CTO', 'CIO'].includes(baseRole) || baseRole === 'PM') && (
              <button
                onClick={() => switchRole('PM')}
                className="px-3 py-1.5 rounded-xl text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200/80 transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
              >
                <Briefcase className="w-3.5 h-3.5" />
                <span>Switch as PM</span>
              </button>
            )}

            {role !== 'TL' && (['CEO', 'MD', 'COO', 'CTO', 'CIO', 'PM'].includes(baseRole) || baseRole === 'TL') && (
              <button
                onClick={() => switchRole('TL')}
                className="px-3 py-1.5 rounded-xl text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200/80 transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
              >
                <Wrench className="w-3.5 h-3.5" />
                <span>Switch as TL</span>
              </button>
            )}

            {isSwitchedRole && (
              <button
                onClick={() => resetRole()}
                className="px-3 py-1.5 rounded-xl text-xs font-bold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Shield className="w-3.5 h-3.5" />
                <span>Reset to {baseRole}</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Role-Specific Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {role === 'Employee' ? (
          <>
            <StatCard
              title="My Assigned Tasks"
              value={tasks.filter(t => t.assignedTo === user?.fullName || t.assignedTo === user?.email).length || 6}
              badgeText="Active"
              badgeColor="blue"
              sublabel="Deliverables assigned to you"
              icon={<CheckSquare className="w-5 h-5 text-blue-600" />}
              onClick={() => onNavigate('my-tasks')}
            />
            <StatCard
              title="Submitted for Review"
              value={tasks.filter(t => t.status === 'Submitted').length || 2}
              badgeText="In Review"
              badgeColor="amber"
              sublabel="Awaiting TL/PM signoff"
              icon={<FileText className="w-5 h-5 text-amber-600" />}
              onClick={() => onNavigate('my-tasks')}
            />
            <StatCard
              title="Completed & Verified"
              value={tasks.filter(t => t.status === 'Verified').length || 4}
              badgeText="Done"
              badgeColor="emerald"
              sublabel="Approved deliverables"
              icon={<CheckSquare className="w-5 h-5 text-emerald-600" />}
              onClick={() => onNavigate('my-tasks')}
            />
            <StatCard
              title="Document Templates"
              value={totalDocuments}
              badgeText="Standard"
              badgeColor="purple"
              sublabel="16 digitised templates"
              icon={<FolderKanban className="w-5 h-5 text-purple-600" />}
              onClick={() => onNavigate('documents')}
            />
          </>
        ) : role === 'TL' ? (
          <>
            <StatCard
              title="Sprint Tasks"
              value={totalTasks}
              badgeText="Active"
              badgeColor="blue"
              sublabel="Across assigned team"
              icon={<CheckSquare className="w-5 h-5 text-blue-600" />}
              onClick={() => onNavigate('tasks')}
            />
            <StatCard
              title="Pending Verification"
              value={tasks.filter(t => t.status === 'Submitted').length || 5}
              badgeText="Action Needed"
              badgeColor="amber"
              sublabel="Submissions awaiting signoff"
              icon={<AlertTriangle className="w-5 h-5 text-amber-600" />}
              onClick={() => onNavigate('tasks')}
            />
            <StatCard
              title="Active Projects"
              value={activeProjects}
              badgeText="Engagements"
              badgeColor="emerald"
              sublabel="In progress sprints"
              icon={<FolderKanban className="w-5 h-5 text-emerald-600" />}
              onClick={() => onNavigate('projects')}
            />
            <StatCard
              title="High Priority"
              value={overdueTasks}
              badgeText="Urgent"
              badgeColor="rose"
              sublabel="Requires escalation"
              icon={<AlertTriangle className="w-5 h-5 text-rose-600" />}
              onClick={() => onNavigate('tasks')}
            />
          </>
        ) : role === 'PM' ? (
          <>
            <StatCard
              title="Managed Projects"
              value={totalProjects}
              badgeText="Active"
              badgeColor="emerald"
              sublabel={`${activeProjects} active project pipelines`}
              icon={<FolderKanban className="w-5 h-5 text-emerald-600" />}
              onClick={() => onNavigate('projects')}
            />
            <StatCard
              title="Deliverables in Review"
              value={tasks.filter(t => t.status === 'Submitted').length || 7}
              badgeText="Action Needed"
              badgeColor="amber"
              sublabel="Tasks awaiting PM verification"
              icon={<FileText className="w-5 h-5 text-amber-600" />}
              onClick={() => onNavigate('tasks')}
            />
            <StatCard
              title="Team Workload"
              value={totalTasks}
              badgeText="Total Tasks"
              badgeColor="blue"
              sublabel="Across all active sprints"
              icon={<CheckSquare className="w-5 h-5 text-blue-600" />}
              onClick={() => onNavigate('tasks')}
            />
            <StatCard
              title="Risk & Escalations"
              value={atRiskCount + delayedCount || 3}
              badgeText="Attention"
              badgeColor="rose"
              sublabel="Projects needing intervention"
              icon={<AlertTriangle className="w-5 h-5 text-rose-600" />}
              onClick={() => onNavigate('projects')}
            />
          </>
        ) : (
          <>
            <StatCard
              title="Total Projects"
              value={totalProjects}
              badgeText="Active"
              badgeColor="emerald"
              sublabel={`${activeProjects} active engagements`}
              icon={<FolderKanban className="w-5 h-5 text-emerald-600" />}
              onClick={() => onNavigate('projects')}
            />
            <StatCard
              title="Documents"
              value={totalDocuments}
              badgeText="Total"
              badgeColor="blue"
              sublabel="16 standard templates"
              icon={<FileText className="w-5 h-5 text-blue-600" />}
              onClick={() => onNavigate('documents')}
            />
            <StatCard
              title="Tasks"
              value={totalTasks}
              badgeText="Pending"
              badgeColor="amber"
              sublabel={`${pendingTasks} pending verification`}
              icon={<CheckSquare className="w-5 h-5 text-amber-600" />}
              onClick={() => onNavigate('tasks')}
            />
            <StatCard
              title="Overdue Tasks"
              value={overdueTasks}
              badgeText="Overdue"
              badgeColor="rose"
              sublabel="Requires attention"
              icon={<AlertTriangle className="w-5 h-5 text-rose-600" />}
              onClick={() => onNavigate('tasks')}
            />
          </>
        )}
      </div>

      {/* Document Lifecycle & Delivery Gates Action Center */}
      {(() => {
        const userRole = (user?.role || 'Employee') as UserRole;
        const isExec = isFullAccessAdmin || ['CEO', 'MD', 'COO', 'CTO', 'CIO'].includes(role);
        const actionableDocs = documents.filter((doc) => {
          if (doc.status === 'Approved') return false;
          if (isExec) {
            return (
              doc.status === 'In Review' ||
              doc.content?.cto_approval === 'Pending Review' ||
              doc.completion >= 80
            );
          }
          const prjDocs = documents.filter((d) => d.projectId === doc.projectId);
          const check = isDocumentEditable(doc.templateId, userRole, prjDocs);
          return check.editable;
        }).slice(0, 3);

        if (actionableDocs.length === 0) return null;

        return (
          <div className="bg-gradient-to-r from-blue-50/80 to-indigo-50/60 text-slate-900 rounded-2xl p-5 shadow-xs space-y-3 border border-blue-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600">
                  <Sparkles className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-extrabold text-slate-900 tracking-tight">
                  {isExec ? 'Executive Action Required: Lifecycle Document Approvals' : 'Document Lifecycle Action Queue'}
                </h3>
              </div>
              <button
                onClick={() => onNavigate('documents')}
                className="text-xs text-blue-600 hover:text-blue-700 font-bold flex items-center gap-1 cursor-pointer"
              >
                <span>View All Documents</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
            <p className="text-xs text-slate-600">
              {isExec 
                ? 'These initial charters and specifications are pending formal CTO sign-off to unlock downstream stages.' 
                : 'Prerequisites have been met. These documents are ready for your input and review.'}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
              {actionableDocs.map((doc) => (
                <div
                  key={doc.id}
                  onClick={() => {
                    onSelectProject(doc.projectId);
                    onNavigate('projects');
                  }}
                  className="bg-white hover:border-blue-300 p-3 rounded-xl border border-slate-200 flex items-center justify-between cursor-pointer transition-all shadow-xs"
                >
                  <div className="min-w-0 pr-2">
                    <h4 className="text-xs font-bold text-slate-900 truncate">{doc.name}</h4>
                    <p className="text-[10px] text-slate-400 truncate">{doc.projectName} • {doc.phase}</p>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 shrink-0">
                    {doc.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        );
      })()}

      {/* Role-Specific Body: Dedicated PM Delivery Board vs Company Executive Analytics */}
      {role === 'PM' ? (
        <div className="space-y-6">
          {/* PM Middle Row: Verification Backlog Queue + 16 Digitized Docs Pipeline */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Verification Queue (Deliverables awaiting PM Signoff) */}
            <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold font-display text-slate-900">Pending Deliverables Verification</h3>
                    <span className="text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full">
                      {tasks.filter(t => t.status === 'Submitted').length || 7} In Review
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">Tasks submitted by team awaiting your approval & signoff</p>
                </div>
                <button
                  onClick={() => onNavigate('tasks')}
                  className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 cursor-pointer"
                >
                  <span>All Tasks</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="space-y-2.5">
                {(tasks.filter(t => t.status === 'Submitted').length > 0
                  ? tasks.filter(t => t.status === 'Submitted').slice(0, 4)
                  : [
                      { id: 't1', title: 'System Architecture Specification (SRS Doc)', assignedTo: 'John Doe', projectName: 'Project Alpha', priority: 'High', dueDate: 'Today' },
                      { id: 't2', title: 'Database Schema & Migration Scripts', assignedTo: 'Sarah K', projectName: 'Project Beta', priority: 'Medium', dueDate: 'Tomorrow' },
                      { id: 't3', title: 'API Security & OAuth2 Middleware', assignedTo: 'Mike Chen', projectName: 'Project Alpha', priority: 'High', dueDate: '28 Aug' },
                      { id: 't4', title: 'UI Component Library & Design Tokens', assignedTo: 'Alex Ray', projectName: 'Project Gamma', priority: 'Low', dueDate: '30 Aug' },
                    ]
                ).map((task: any) => (
                  <div
                    key={task.id}
                    className="p-3 bg-slate-50 hover:bg-blue-50/40 rounded-xl border border-slate-200/80 flex items-center justify-between gap-3 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                        <FileText className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-xs font-bold text-slate-900 truncate">{task.title}</h4>
                        <p className="text-[10px] text-slate-500 truncate">
                          Assigned: <span className="font-semibold text-slate-700">{task.assignedTo}</span> • {task.projectName || 'Project Alpha'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                        task.priority === 'High' 
                          ? 'bg-rose-50 text-rose-700 border-rose-200' 
                          : 'bg-blue-50 text-blue-700 border-blue-200'
                      }`}>
                        {task.priority || 'Medium'}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          onSelectTask(task.id);
                          onNavigate('tasks');
                        }}
                        className="px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-gradient-to-r from-[#0d82ff] to-[#00d1ff] hover:from-[#0065ff] hover:to-[#00bce8] shadow-xs transition-all cursor-pointer"
                      >
                        Verify
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 16 Standard Document Deliverables Progress */}
            <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="text-sm font-bold font-display text-slate-900">16 Lifecycle Deliverables</h3>
                  <p className="text-xs text-slate-500">Standardized digitised documentation signoff</p>
                </div>
                <button
                  onClick={() => onNavigate('documents')}
                  className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 cursor-pointer"
                >
                  <span>Templates</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="space-y-3">
                {[
                  { phase: 'Initiate & Plan', count: '4 / 4 Complete', pct: 100, color: 'bg-emerald-500' },
                  { phase: 'Requirements (SRS / BRS)', count: '3 / 3 In Review', pct: 75, color: 'bg-blue-600' },
                  { phase: 'Design & Architecture', count: '2 / 3 In Progress', pct: 60, color: 'bg-amber-500' },
                  { phase: 'Build, Test & Release', count: '1 / 6 Draft', pct: 20, color: 'bg-purple-500' },
                ].map((ph, idx) => (
                  <div key={idx} className="space-y-1">
                    <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
                      <span>{ph.phase}</span>
                      <span className="text-[11px] font-mono text-slate-500">{ph.count}</span>
                    </div>
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div className={`h-full ${ph.color} rounded-full transition-all`} style={{ width: `${ph.pct}%` }} />
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-slate-500">Overall Deliverables Progress:</span>
                <span className="font-bold text-emerald-600 font-display">68.7% Complete</span>
              </div>
            </div>
          </div>

          {/* PM Managed Projects List */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold font-display text-slate-900">Managed Projects Registry</h3>
                <p className="text-xs text-slate-500">Live project milestones, progress & delivery schedules</p>
              </div>
              <button
                onClick={() => onNavigate('projects')}
                className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 cursor-pointer"
              >
                <span>View Full Registry</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 font-semibold uppercase tracking-wider">
                    <th className="pb-3 pl-1">Project Name</th>
                    <th className="pb-3">Client</th>
                    <th className="pb-3">Status</th>
                    <th className="pb-3">Sprint Progress</th>
                    <th className="pb-3 pr-1 text-right">Target Completion</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {recentProjectsList.map((prj) => (
                    <tr
                      key={prj.id}
                      onClick={() => onSelectProject(prj.id)}
                      className="hover:bg-blue-50/50 transition-colors cursor-pointer group"
                    >
                      <td className="py-3.5 pl-1 font-bold font-display text-slate-900 group-hover:text-blue-600 flex items-center gap-2">
                        <FolderKanban className="w-4 h-4 text-slate-400 group-hover:text-blue-600 transition-colors" />
                        <span>{prj.name}</span>
                      </td>
                      <td className="py-3.5 text-slate-600 font-medium">{prj.client}</td>
                      <td className="py-3.5">
                        <StatusBadge status={prj.status} size="sm" />
                      </td>
                      <td className="py-3.5">
                        <div className="flex items-center gap-2 max-w-[140px]">
                          <div className="flex-1 bg-slate-100 h-2 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                prj.status === 'Delayed'
                                  ? 'bg-rose-500'
                                  : prj.status === 'At Risk'
                                  ? 'bg-amber-500'
                                  : 'bg-emerald-500'
                              }`}
                              style={{ width: `${prj.progress}%` }}
                            />
                          </div>
                          <span className="text-[10px] font-bold text-slate-700 font-mono">{prj.progress}%</span>
                        </div>
                      </td>
                      <td className="py-3.5 pr-1 text-right text-slate-500 font-mono">Q4 2026</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        /* Executive / Organization Analytics Dashboard View */
        <div className="space-y-6">
          {/* Charts Row: Project Status Donut + Task Overview Monthly Bar */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Project Status Donut Chart Card */}
            <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-bold font-display text-slate-900">Project Status</h3>
                  <p className="text-xs text-slate-500">Distribution across active engagements</p>
                </div>
                <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-100 font-mono">
                  Live
                </span>
              </div>

              <DonutChart data={donutData} totalLabel="Projects" size={170} thickness={24} />

              <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <span>Overall On-Time Delivery:</span>
                <span className="font-bold text-emerald-600 font-display text-sm">83.3%</span>
              </div>
            </div>

            {/* Task Overview (This Month) Grouped Bar Chart */}
            <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <h3 className="text-sm font-bold font-display text-slate-900">Task Overview (This Month)</h3>
                  <p className="text-xs text-slate-500">Completed vs Pending vs Overdue</p>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-slate-500 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200">
                  <Calendar className="w-3.5 h-3.5 text-blue-600" />
                  <span className="font-mono">2026</span>
                </div>
              </div>

              <BarChart data={monthlyTaskOverview} height={180} />
            </div>
          </div>

          {/* Recent Projects Table Card */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold font-display text-slate-900">Recent Projects</h3>
                <p className="text-xs text-slate-500">Active engineering deliverables</p>
              </div>
              <button
                onClick={() => onNavigate('projects')}
                className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 cursor-pointer"
              >
                <span>View All Projects</span>
                <ChevronRight className="w-3.5 h-3.5 text-blue-600" />
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 font-semibold uppercase tracking-wider">
                    <th className="pb-3 pl-1">Project Name</th>
                    <th className="pb-3">Client</th>
                    <th className="pb-3">PM</th>
                    <th className="pb-3">Status</th>
                    <th className="pb-3">Progress</th>
                    <th className="pb-3 pr-1 text-right">Start Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {recentProjectsList.map((prj) => (
                    <tr
                      key={prj.id}
                      onClick={() => onSelectProject(prj.id)}
                      className="hover:bg-blue-50/50 transition-colors cursor-pointer group"
                    >
                      <td className="py-3.5 pl-1 font-bold font-display text-slate-900 group-hover:text-blue-600 flex items-center gap-2">
                        <FolderKanban className="w-4 h-4 text-slate-400 group-hover:text-blue-600 transition-colors" />
                        <span>{prj.name}</span>
                      </td>
                      <td className="py-3.5 text-slate-600 font-medium">{prj.client}</td>
                      <td className="py-3.5 text-slate-600">{prj.pmName}</td>
                      <td className="py-3.5">
                        <StatusBadge status={prj.status} size="sm" />
                      </td>
                      <td className="py-3.5">
                        <div className="flex items-center gap-2 max-w-[120px]">
                          <div className="flex-1 bg-slate-100 h-1.5 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                prj.status === 'Delayed'
                                  ? 'bg-rose-500'
                                  : prj.status === 'At Risk'
                                  ? 'bg-amber-500'
                                  : 'bg-blue-600'
                              }`}
                              style={{ width: `${prj.progress}%` }}
                            />
                          </div>
                          <span className="text-[10px] font-bold text-slate-700 font-mono">{prj.progress}%</span>
                        </div>
                      </td>
                      <td className="py-3.5 pr-1 text-right text-slate-400 font-mono">{prj.startDate}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardScreen;
