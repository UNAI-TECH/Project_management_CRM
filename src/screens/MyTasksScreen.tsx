import React, { useState, useMemo } from 'react';
import { Task } from '../types';
import { StatusBadge } from '../components/common/StatusBadge';
import { TaskTimeTracker } from '../components/common/TaskTimeTracker';
import { timeTrackingService } from '../services/timeTrackingService';
import { 
  Calendar, 
  CheckCircle2, 
  Clock, 
  Layers, 
  Sparkles, 
  AlertCircle,
  FolderKanban,
  GitBranch,
  Wrench,
  Timer,
  Lock
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';

interface MyTasksScreenProps {
  tasks: Task[];
  onOpenSubmitModal: (task: Task) => void;
  onSelectTask: (taskId: string) => void;
}

export const MyTasksScreen: React.FC<MyTasksScreenProps> = ({
  tasks,
  onOpenSubmitModal,
  onSelectTask,
}) => {
  const { user } = useAuth();
  const { projects, teamMembers, logTimeAction } = useData();
  const [activeFilter, setActiveFilter] = useState<'All' | 'Pending' | 'In Progress' | 'Completed'>('All');

  // Find the current user's organization member identity
  const currentOrgMember = teamMembers.find(
    (m) =>
      m.id === user?.id ||
      (user?.email && m.email?.toLowerCase() === user.email.toLowerCase()) ||
      (user?.fullName && m.name?.toLowerCase() === user.fullName.toLowerCase())
  );

  // Strict task privacy for employee: match all user identity aliases
  const myTasks = tasks.filter((t) => {
    if (!t) return false;
    if (user?.id && t.assignedTo === user.id) return true;
    if (currentOrgMember?.id && t.assignedTo === currentOrgMember.id) return true;
    if (user?.email && t.assignedTo?.toLowerCase() === user.email.toLowerCase()) return true;
    if (currentOrgMember?.email && t.assignedTo?.toLowerCase() === currentOrgMember.email.toLowerCase()) return true;
    if (user?.fullName && t.assignedToName && t.assignedToName.toLowerCase() === user.fullName.toLowerCase()) return true;
    if (currentOrgMember?.name && t.assignedToName && t.assignedToName.toLowerCase() === currentOrgMember.name.toLowerCase()) return true;
    if (user?.email && t.assignedToName && t.assignedToName.toLowerCase().includes(user.email.split('@')[0].toLowerCase())) return true;
    return false;
  });

  const pendingTasks = myTasks.filter((t) => t.status === 'Open' || t.status === 'Reopened');
  const inProgressTasks = myTasks.filter((t) => t.status === 'In Progress' || t.status === 'Submitted');
  const completedTasks = myTasks.filter((t) => t.status === 'Verified');

  const displayedTasks = myTasks.filter((t) => {
    if (activeFilter === 'All') return true;
    if (activeFilter === 'Pending') return t.status === 'Open' || t.status === 'Reopened';
    if (activeFilter === 'In Progress') return t.status === 'In Progress' || t.status === 'Submitted';
    if (activeFilter === 'Completed') return t.status === 'Verified';
    return true;
  });

  // Group displayed tasks hierarchically by Project -> Feature Module
  const groupedTasks = useMemo(() => {
    const projectMap = new Map<string, {
      project: any;
      features: Map<string, { featureName: string; tasks: Task[] }>;
    }>();

    displayedTasks.forEach((task) => {
      const projId = task.projectId || 'proj-default';
      const projObj = projects.find((p) => p.id === projId) || {
        id: projId,
        name: task.projectName || 'Active Project',
        client: 'Client Delivery',
        code: 'PROJ',
      };

      if (!projectMap.has(projId)) {
        projectMap.set(projId, {
          project: projObj,
          features: new Map(),
        });
      }

      const projGroup = projectMap.get(projId)!;
      const featKey = task.featureId || task.featureName || 'General Feature Modules';
      const featName = task.featureName || (task.parentTaskId ? 'Delegated Feature Subtasks' : 'Feature Deliverables');

      if (!projGroup.features.has(featKey)) {
        projGroup.features.set(featKey, {
          featureName: featName,
          tasks: [],
        });
      }

      projGroup.features.get(featKey)!.tasks.push(task);
    });

    return Array.from(projectMap.values());
  }, [displayedTasks, projects]);

  return (
    <div className="space-y-6 pb-12 animate-fade-in font-sans">
      {/* Header */}
      <div>
        <h2 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
          <Layers className="w-5 h-5 text-blue-600" />
          <span>My Engineering Tasks & Feature Deliverables</span>
        </h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Deliverables & subtasks delegated to you by Team Leads organized by Project and Feature Module.
        </p>
      </div>

      {/* Top 4 Stat Counter Pills */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div
          onClick={() => setActiveFilter('All')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${
            activeFilter === 'All'
              ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
              : 'bg-white text-slate-800 border-slate-200 hover:border-blue-300'
          }`}
        >
          <span className={`text-[11px] font-bold uppercase tracking-wider block ${activeFilter === 'All' ? 'text-blue-100' : 'text-slate-400'}`}>
            Total Tasks
          </span>
          <span className="text-2xl font-black mt-1 block">{myTasks.length}</span>
        </div>

        <div
          onClick={() => setActiveFilter('Pending')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${
            activeFilter === 'Pending'
              ? 'bg-amber-500 text-white border-amber-500 shadow-sm'
              : 'bg-white text-slate-800 border-slate-200 hover:border-amber-300'
          }`}
        >
          <span className={`text-[11px] font-bold uppercase tracking-wider block ${activeFilter === 'Pending' ? 'text-amber-100' : 'text-slate-400'}`}>
            Pending
          </span>
          <span className="text-2xl font-black mt-1 block">{pendingTasks.length}</span>
        </div>

        <div
          onClick={() => setActiveFilter('In Progress')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${
            activeFilter === 'In Progress'
              ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
              : 'bg-white text-slate-800 border-slate-200 hover:border-indigo-300'
          }`}
        >
          <span className={`text-[11px] font-bold uppercase tracking-wider block ${activeFilter === 'In Progress' ? 'text-indigo-100' : 'text-slate-400'}`}>
            In Progress / Review
          </span>
          <span className="text-2xl font-black mt-1 block">{inProgressTasks.length}</span>
        </div>

        <div
          onClick={() => setActiveFilter('Completed')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${
            activeFilter === 'Completed'
              ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
              : 'bg-white text-slate-800 border-slate-200 hover:border-emerald-300'
          }`}
        >
          <span className={`text-[11px] font-bold uppercase tracking-wider block ${activeFilter === 'Completed' ? 'text-emerald-100' : 'text-slate-400'}`}>
            Verified Done
          </span>
          <span className="text-2xl font-black mt-1 block">{completedTasks.length}</span>
        </div>
      </div>

      {/* Filter Tabs Bar */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2 text-xs font-semibold">
        {(['All', 'Pending', 'In Progress', 'Completed'] as const).map((filter) => (
          <button
            key={filter}
            onClick={() => setActiveFilter(filter)}
            className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
              activeFilter === filter
                ? 'bg-blue-50 text-blue-700 font-bold border border-blue-200 shadow-2xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            {filter} ({
              filter === 'All' ? myTasks.length :
              filter === 'Pending' ? pendingTasks.length :
              filter === 'In Progress' ? inProgressTasks.length :
              completedTasks.length
            })
          </button>
        ))}
      </div>

      {/* Hierarchical Project Cards & Feature Tasks List */}
      <div className="space-y-6">
        {groupedTasks.length === 0 ? (
          <div className="p-12 text-center bg-white rounded-3xl border border-slate-200 text-slate-400 text-xs">
            No tasks assigned to your queue in this filter.
          </div>
        ) : (
          groupedTasks.map(({ project, features }) => {
            const projectFeaturesList = Array.from(features.values());
            const projectTaskCount = projectFeaturesList.reduce((acc, f) => acc + f.tasks.length, 0);

            return (
              <div
                key={project.id}
                className="bg-white rounded-3xl border border-slate-200/90 shadow-xs overflow-hidden space-y-4"
              >
                {/* ── Project Card Header ── */}
                <div className="p-5 bg-gradient-to-r from-slate-50 via-white to-blue-50/30 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-black text-sm border border-blue-100 shadow-2xs">
                      <FolderKanban className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-md">
                          {project.code || 'PROJ'}
                        </span>
                        <h3 className="text-base font-extrabold text-slate-900">
                          {project.name}
                        </h3>
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {project.client} • <strong>{projectTaskCount}</strong> assigned deliverables for you
                      </p>
                    </div>
                  </div>

                  {project.pmName && (
                    <div className="text-xs text-slate-500 self-end sm:self-center">
                      PM: <strong className="text-slate-800">{project.pmName}</strong>
                    </div>
                  )}
                </div>

                {/* ── Features & Subtasks Content ── */}
                <div className="p-5 pt-0 space-y-5">
                  {projectFeaturesList.map((featGroup, fIdx) => (
                    <div key={fIdx} className="space-y-3">
                      {/* Feature Sub-header */}
                      <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
                        <GitBranch className="w-3.5 h-3.5 text-indigo-600" />
                        <span className="text-blue-900">{featGroup.featureName}</span>
                        <span className="text-[10px] text-slate-400 font-semibold">({featGroup.tasks.length} subtasks)</span>
                      </div>

                      {/* Subtasks Cards */}
                      <div className="space-y-3.5">
                        {featGroup.tasks.map((task) => {
                          const isLocked = Boolean(task.isBlocked || task.status === 'Blocked');
                          const overdueInfo = timeTrackingService.getOverdueSeverity(task.dueDate, task.status);

                          return (
                            <div
                              key={task.id}
                              onClick={() => !isLocked && onSelectTask(task.id)}
                              className={`p-5 rounded-2xl border transition-all space-y-3.5 ${
                                isLocked
                                  ? 'bg-slate-100/70 border-slate-200 opacity-60 cursor-not-allowed'
                                  : `bg-white cursor-pointer hover:border-blue-300 shadow-2xs ${overdueInfo.cardClasses}`
                              }`}
                            >
                              {/* Header Row */}
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                <div className="space-y-1">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <h4 className="font-bold text-sm text-slate-900 hover:text-blue-600 transition-colors">
                                      {task.title}
                                    </h4>
                                    {isLocked ? (
                                      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200 text-slate-700 border border-slate-300">
                                        <Lock className="w-3 h-3 text-slate-500" />
                                        <span>Locked (Prerequisite Pending)</span>
                                      </span>
                                    ) : (
                                      <StatusBadge status={task.status} size="sm" />
                                    )}
                                    {overdueInfo.severity !== 'none' && task.status !== 'Verified' && !isLocked && (
                                      <span className={`text-[10px] px-2 py-0.5 rounded-md border ${overdueInfo.badgeClasses}`}>
                                        {overdueInfo.label}
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-xs text-slate-500">
                                    Assigned by: <strong className="text-slate-700">{task.assignedByName}</strong>
                                  </p>
                                  {task.description && (
                                    <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed max-w-2xl font-normal">
                                      {task.description}
                                    </p>
                                  )}
                                </div>

                                {/* Right side actions */}
                                <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                                  {task.dueDate && (
                                    <div className="text-left sm:text-right">
                                      <span className="text-[10px] text-slate-400 block font-semibold">Target Due</span>
                                      <span className="text-xs font-bold text-slate-700 flex items-center gap-1">
                                        <Calendar className="w-3 h-3 text-slate-400" />
                                        {task.dueDate}
                                      </span>
                                    </div>
                                  )}

                                  {isLocked ? (
                                    <span className="px-3 py-1.5 bg-slate-200 text-slate-500 font-bold text-xs rounded-xl flex items-center gap-1">
                                      <Lock className="w-3.5 h-3.5 text-slate-400" />
                                      <span>Locked</span>
                                    </span>
                                  ) : (
                                    <>
                                      {(task.status === 'Open' || task.status === 'In Progress' || task.status === 'Reopened') && (
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            onOpenSubmitModal(task);
                                          }}
                                          className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer"
                                        >
                                          Submit Work
                                        </button>
                                      )}

                                      {task.status === 'Submitted' && (
                                        <span className="text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-3 py-1.5 rounded-xl">
                                          In Review by Lead
                                        </span>
                                      )}

                                      {task.status === 'Verified' && (
                                        <span className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-xl flex items-center gap-1">
                                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                                          <span>Verified</span>
                                        </span>
                                      )}
                                    </>
                                  )}
                                </div>
                              </div>

                              {/* Inline Time Tracker for Employee (Disabled if locked) */}
                              {!isLocked && (
                                <div onClick={(e) => e.stopPropagation()}>
                                  <TaskTimeTracker
                                    task={task}
                                    onLogAction={logTimeAction}
                                    readOnly={task.status === 'Verified'}
                                  />
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default MyTasksScreen;
