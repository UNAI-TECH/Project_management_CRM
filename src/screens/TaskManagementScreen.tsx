import React, { useState, useMemo, useEffect } from 'react';
import { Task, ProjectFeature, TeamMember, Project } from '../types';
import { StatusBadge } from '../components/common/StatusBadge';
import { FeatureTaskWorkspace } from '../components/projects/FeatureTaskWorkspace';
import { timeTrackingService } from '../services/timeTrackingService';
import { 
  Plus, 
  Search, 
  ArrowLeft, 
  CheckCircle2,
  Calendar,
  FileText
} from '../components/icons';
import { 
  ListTree, 
  LayoutGrid, 
  GitBranch, 
  CornerDownRight, 
  Shield, 
  User, 
  AlertCircle, 
  Clock, 
  Layers, 
  Sparkles, 
  Lock, 
  ChevronRight, 
  ChevronDown,
  ChevronUp,
  ShieldCheck, 
  FolderKanban, 
  Play, 
  Pause,
  Briefcase, 
  UserCheck, 
  UserPlus, 
  Timer,
  CheckSquare,
  Wrench,
  ArrowRight,
  Zap,
  Target
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';

interface TaskManagementScreenProps {
  tasks: Task[];
  docName?: string;
  initialProjectId?: string | null;
  onBack?: () => void;
  onOpenAssignModal: (parentTask?: { id: string; title: string; featureId?: string; featureName?: string }) => void;
  onOpenSubmitModal: (task: Task) => void;
  onOpenVerifyModal: (task: Task) => void;
  onSelectTask: (taskId: string) => void;
}

// Palette presets for alternating feature cards to ensure rich visual differentiation
const FEATURE_THEMES = [
  {
    borderAccent: 'from-blue-600 via-indigo-600 to-cyan-500',
    headerBg: 'bg-gradient-to-r from-blue-50/80 via-indigo-50/40 to-white',
    badgeBg: 'bg-blue-600 text-white shadow-xs',
    pillBg: 'bg-blue-100 text-blue-900 border-blue-200',
    hoverBorder: 'hover:border-blue-400',
    iconColor: 'text-blue-600',
  },
  {
    borderAccent: 'from-purple-600 via-violet-600 to-indigo-500',
    headerBg: 'bg-gradient-to-r from-purple-50/80 via-violet-50/40 to-white',
    badgeBg: 'bg-purple-600 text-white shadow-xs',
    pillBg: 'bg-purple-100 text-purple-900 border-purple-200',
    hoverBorder: 'hover:border-purple-400',
    iconColor: 'text-purple-600',
  },
  {
    borderAccent: 'from-teal-600 via-emerald-600 to-cyan-500',
    headerBg: 'bg-gradient-to-r from-teal-50/80 via-emerald-50/40 to-white',
    badgeBg: 'bg-teal-600 text-white shadow-xs',
    pillBg: 'bg-teal-100 text-teal-900 border-teal-200',
    hoverBorder: 'hover:border-teal-400',
    iconColor: 'text-teal-600',
  },
  {
    borderAccent: 'from-amber-500 via-orange-500 to-rose-500',
    headerBg: 'bg-gradient-to-r from-amber-50/80 via-orange-50/40 to-white',
    badgeBg: 'bg-amber-600 text-white shadow-xs',
    pillBg: 'bg-amber-100 text-amber-900 border-amber-200',
    hoverBorder: 'hover:border-amber-400',
    iconColor: 'text-amber-600',
  },
  {
    borderAccent: 'from-rose-600 via-pink-600 to-indigo-500',
    headerBg: 'bg-gradient-to-r from-rose-50/80 via-pink-50/40 to-white',
    badgeBg: 'bg-rose-600 text-white shadow-xs',
    pillBg: 'bg-rose-100 text-rose-900 border-rose-200',
    hoverBorder: 'hover:border-rose-400',
    iconColor: 'text-rose-600',
  },
];

export const TaskManagementScreen: React.FC<TaskManagementScreenProps> = ({
  tasks,
  docName,
  initialProjectId,
  onBack,
  onOpenAssignModal,
  onOpenSubmitModal,
  onOpenVerifyModal,
  onSelectTask,
}) => {
  const { user, role, baseRole, isFullAccessAdmin } = useAuth();
  const { projects, features, teamMembers, logTimeAction } = useData();

  // State: Selected project (null means showing project workspace cards)
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(initialProjectId || null);
  const [selectedFeatureId, setSelectedFeatureId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | 'in-progress' | 'pending' | 'completed'>('all');
  const [assigneeFilter, setAssigneeFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [collapsedFeatures, setCollapsedFeatures] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (initialProjectId) {
      setSelectedProjectId(initialProjectId);
    }
  }, [initialProjectId]);

  const isExecutive = ['CEO', 'MD', 'COO', 'CTO', 'CIO'].includes(baseRole || role);
  const isPM = role === 'PM' || baseRole === 'PM' || isFullAccessAdmin;
  const isTL = role === 'TL' || baseRole === 'TL';

  // Helper: check if current user is authorized to delegate for a feature
  const canDelegateForFeature = (feat: ProjectFeature, tlTasks: Task[]) => {
    if (isFullAccessAdmin || isPM || isExecutive) return true;
    if (isTL) {
      const isFeatureTl = 
        (feat.assignedTlId && feat.assignedTlId === user?.id) ||
        (feat.assignedTlName && user?.fullName && feat.assignedTlName.toLowerCase() === user.fullName.toLowerCase()) ||
        (user?.email && feat.assignedTlName && feat.assignedTlName.toLowerCase().includes(user.email.split('@')[0].toLowerCase()));
      
      const isDirectTl = tlTasks.some(
        (t) => 
          t.assignedTo === user?.id || 
          (t.assignedToName && user?.fullName && t.assignedToName.toLowerCase() === user.fullName.toLowerCase()) ||
          (user?.email && t.assignedTo && t.assignedTo.toLowerCase() === user.email.toLowerCase())
      );

      return isFeatureTl || isDirectTl;
    }
    return false;
  };

  // Helper: check if current user is authorized to delegate from a specific TL task
  const canDelegateForTask = (tlTask: Task) => {
    if (isFullAccessAdmin || isPM || isExecutive) return true;
    if (isTL) {
      return (
        tlTask.assignedTo === user?.id ||
        (tlTask.assignedToName && user?.fullName && tlTask.assignedToName.toLowerCase() === user.fullName.toLowerCase()) ||
        (user?.email && tlTask.assignedTo && tlTask.assignedTo.toLowerCase() === user.email.toLowerCase())
      );
    }
    return false;
  };

  // Active project tasks
  const projectTasks = useMemo(() => {
    if (!selectedProjectId || selectedProjectId === 'all') return tasks;
    return tasks.filter((t) => t.projectId === selectedProjectId);
  }, [tasks, selectedProjectId]);

  const activeProject = useMemo(() => {
    if (!selectedProjectId || selectedProjectId === 'all') return null;
    return projects.find((p) => p.id === selectedProjectId) || null;
  }, [projects, selectedProjectId]);

  // Find tech lead for the active project
  const projectTechLead = useMemo(() => {
    if (!activeProject) return null;
    const tlMember = teamMembers.find(
      (m) => m.projectId === activeProject.id && (m.role === 'TL' || m.designation?.toLowerCase().includes('lead'))
    );
    return tlMember?.name || 'Assigned Tech Lead';
  }, [activeProject, teamMembers]);

  // Build synthesized feature list representing the primary hierarchy
  const activeFeatures: ProjectFeature[] = useMemo(() => {
    const targetTasks = projectTasks;

    // 1. If features exist in state for this project, use them
    if (features.length > 0 && selectedProjectId && selectedProjectId !== 'all') {
      const projFeats = features.filter((f) => f.projectId === selectedProjectId);
      if (projFeats.length > 0) return projFeats;
    }

    // 2. Derive features from root tasks (excluding subtasks)
    const rootTasks = targetTasks.filter(
      (t) => (!t.parentTaskId || t.parentTaskId === '') && (t.taskType === 'feature_task' || t.title.toLowerCase().startsWith('[feature'))
    );

    if (rootTasks.length > 0) {
      return rootTasks.map((rt, idx) => {
        const cleanName = rt.featureName || rt.title.replace(/^\[Feature\s*\d+\]\s*/i, '');
        const childSubtasks = targetTasks.filter(
          (t) => t.id !== rt.id && (t.parentTaskId === rt.id || (t.featureId && t.featureId === rt.id))
        );
        const verifiedCount = childSubtasks.filter((t) => t.status === 'Verified').length;
        const progress = childSubtasks.length > 0 
          ? Math.round((verifiedCount / childSubtasks.length) * 100) 
          : (rt.status === 'Verified' ? 100 : rt.progress || 0);

        return {
          id: rt.featureId || rt.id,
          projectId: rt.projectId,
          name: cleanName,
          description: rt.description || 'Core feature module specifications and deliverable execution.',
          technology: 'Feature Deliverable',
          sourceDocIds: rt.docId ? [rt.docId] : [],
          sourceDocNames: rt.docName ? [rt.docName] : [],
          sequenceOrder: idx + 1,
          status: rt.status === 'Verified' ? 'Verified' : rt.status === 'Submitted' ? 'Submitted' : 'Pending',
          progress,
          assignedTlId: rt.assignedToRole === 'TL' ? rt.assignedTo : undefined,
          assignedTlName: rt.assignedToRole === 'TL' ? rt.assignedToName : (projectTechLead || 'Tech Lead'),
          isBlocked: rt.isBlocked ?? false,
          linkedFunctions: [],
          linkedApis: [],
          linkedScreens: [],
          estimatedHours: rt.estimatedHours || 40,
          actualHours: rt.actualHours || 0,
          dueDate: rt.dueDate,
          organizationId: rt.organizationId || '',
          createdAt: rt.createdAt,
        };
      });
    }

    // 3. Fallback default feature if tasks exist
    if (targetTasks.length > 0) {
      return [{
        id: 'feat-core-1',
        projectId: targetTasks[0]?.projectId || 'proj-1',
        name: targetTasks[0]?.projectName ? `${targetTasks[0].projectName} — Feature Deliverables` : 'Core Feature Modules',
        description: 'Primary architectural deliverables and delegated subtasks.',
        technology: 'Full Stack Modules',
        sourceDocIds: [],
        sourceDocNames: [],
        sequenceOrder: 1,
        status: 'Pending',
        progress: Math.round((targetTasks.filter((t) => t.status === 'Verified').length / (targetTasks.length || 1)) * 100),
        assignedTlName: projectTechLead || 'Tech Lead',
        isBlocked: false,
        linkedFunctions: [],
        linkedApis: [],
        linkedScreens: [],
        estimatedHours: 60,
        actualHours: 0,
        organizationId: targetTasks[0]?.organizationId || '',
        createdAt: 'Today',
      }];
    }

    return [];
  }, [features, projectTasks, selectedProjectId, projectTechLead]);

  const toggleFeatureCollapse = (featureId: string) => {
    setCollapsedFeatures((prev) => ({
      ...prev,
      [featureId]: !prev[featureId],
    }));
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // VIEW: SPLIT WORKSPACE FOR A SINGLE FEATURE
  // ─────────────────────────────────────────────────────────────────────────────
  if (selectedFeatureId) {
    const selectedFeature = activeFeatures.find((f) => f.id === selectedFeatureId) || activeFeatures[0];
    return (
      <FeatureTaskWorkspace
        feature={selectedFeature}
        tasks={projectTasks}
        teamMembers={teamMembers}
        onBack={() => setSelectedFeatureId(null)}
        onSelectTask={onSelectTask}
        onOpenAssignModal={onOpenAssignModal}
        onOpenSubmitModal={onOpenSubmitModal}
        onOpenVerifyModal={onOpenVerifyModal}
        onLogTimeAction={logTimeAction}
      />
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // VIEW 1: TOP-LEVEL PROJECT WORKSPACE SELECTOR CARDS (When no project selected)
  // ─────────────────────────────────────────────────────────────────────────────
  if (!selectedProjectId && projects.length > 0) {
    return (
      <div className="space-y-6 pb-12 animate-fade-in font-sans">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              <FolderKanban className="w-6 h-6 text-blue-600" />
              <span>Project Task Workspaces</span>
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Select a project card to view and manage its hierarchical Feature Modules and delegated subtasks.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setSelectedProjectId('all')}
              className="px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs rounded-xl border border-slate-200 shadow-2xs transition-all cursor-pointer"
            >
              View All Cross-Project Tasks
            </button>
            {(isPM || isExecutive) && (
              <button
                onClick={() => onOpenAssignModal()}
                className="px-4 py-2 rounded-xl font-bold text-white text-xs bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4 text-white" />
                <span>+ Delegate Task</span>
              </button>
            )}
          </div>
        </div>

        {/* Project Cards Grid with rich gradient accents */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {projects.map((prj, pIdx) => {
            const theme = FEATURE_THEMES[pIdx % FEATURE_THEMES.length];
            const prjTaskList = tasks.filter((t) => t.projectId === prj.id);
            const prjFeatures = features.filter((f) => f.projectId === prj.id);
            const featureCount = prjFeatures.length > 0 ? prjFeatures.length : Math.max(1, prjTaskList.filter((t) => !t.parentTaskId).length);
            const subtaskCount = prjTaskList.filter((t) => t.parentTaskId || t.taskType === 'subtask').length || prjTaskList.length;
            const completed = prjTaskList.filter((t) => t.status === 'Verified').length;
            const progress = prjTaskList.length > 0 ? Math.round((completed / prjTaskList.length) * 100) : prj.progress || 0;

            const tlMember = teamMembers.find((m) => m.projectId === prj.id && (m.role === 'TL' || m.designation?.toLowerCase().includes('lead')));

            return (
              <div
                key={prj.id}
                onClick={() => setSelectedProjectId(prj.id)}
                className="bg-white rounded-3xl border border-slate-200/90 p-6 shadow-sm hover:shadow-xl hover:border-blue-400 transition-all duration-300 cursor-pointer flex flex-col justify-between group relative overflow-hidden transform hover:-translate-y-1"
              >
                <div className={`absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r ${theme.borderAccent}`} />

                <div>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50 text-blue-600 flex items-center justify-center font-black text-base border border-blue-100 group-hover:scale-105 transition-transform shadow-2xs">
                        <FolderKanban className="w-6 h-6" />
                      </div>
                      <div>
                        <h3 className="font-extrabold text-slate-900 text-base group-hover:text-blue-600 transition-colors line-clamp-1">
                          {prj.name}
                        </h3>
                        <p className="text-[11px] text-slate-400 font-medium">
                          {prj.client} • <span className="font-mono text-slate-600 font-bold bg-slate-100 px-1.5 py-0.5 rounded">{prj.code}</span>
                        </p>
                      </div>
                    </div>
                  </div>

                  <p className="text-xs text-slate-500 line-clamp-2 mb-4 leading-relaxed">
                    {prj.description || 'No description provided.'}
                  </p>

                  {/* Project Leadership Info */}
                  <div className="p-3 bg-gradient-to-r from-slate-50 to-blue-50/30 rounded-2xl border border-slate-100 space-y-1.5 text-xs mb-4">
                    <div className="flex justify-between items-center text-slate-600">
                      <span className="text-slate-400 font-medium flex items-center gap-1">
                        <Briefcase className="w-3 h-3 text-blue-600" /> PM:
                      </span>
                      <strong className="text-slate-800">{prj.pmName || 'PM'}</strong>
                    </div>
                    <div className="flex justify-between items-center text-slate-600">
                      <span className="text-slate-400 font-medium flex items-center gap-1">
                        <Wrench className="w-3 h-3 text-emerald-600" /> Tech Lead:
                      </span>
                      <strong className="text-blue-700">{tlMember?.name || 'Tech Lead'}</strong>
                    </div>
                  </div>

                  {/* Hierarchy Count Pills */}
                  <div className="grid grid-cols-2 gap-2 text-center mb-4">
                    <div className="p-2.5 bg-blue-50/80 rounded-2xl border border-blue-100/90 shadow-2xs">
                      <span className="text-[10px] font-bold text-blue-600 block uppercase tracking-wider">Features</span>
                      <span className="text-lg font-black text-blue-950">{featureCount}</span>
                    </div>
                    <div className="p-2.5 bg-indigo-50/80 rounded-2xl border border-indigo-100/90 shadow-2xs">
                      <span className="text-[10px] font-bold text-indigo-600 block uppercase tracking-wider">Subtasks</span>
                      <span className="text-lg font-black text-indigo-950">{subtaskCount}</span>
                    </div>
                  </div>
                </div>

                <div>
                  {/* Progress bar */}
                  <div className="space-y-1.5 pt-3 border-t border-slate-100">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[11px] font-bold text-slate-500">Overall Progress</span>
                      <span className="text-xs font-extrabold text-blue-700">{progress}%</span>
                    </div>
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-blue-600 to-emerald-500 rounded-full transition-all"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-100 text-xs font-bold text-blue-600">
                    <span>Open Feature & Task Board</span>
                    <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // VIEW 2: PRIMARY PROJECT TASK & FEATURE HIERARCHY WORKSPACE
  // ─────────────────────────────────────────────────────────────────────────────
  const totalWorkMins = projectTasks.reduce(
    (sum, t) => sum + (t.timeTracker?.totalWorkMinutes ?? Math.round((t.actualHours || 0) * 60)),
    0
  );
  const totalEstimatedHrs = projectTasks.reduce((sum, t) => sum + (t.estimatedHours || 8), 0);
  const completedTaskCount = projectTasks.filter((t) => t.status === 'Verified').length;
  const overallProgress = projectTasks.length > 0 
    ? Math.round((completedTaskCount / projectTasks.length) * 100) 
    : (activeProject?.progress || 0);

  // Group and filter tasks for each feature
  const filteredFeatures = activeFeatures.map((feat) => {
    // 1. Identify tasks belonging to this feature
    const featAllTasks = projectTasks.filter((t) => {
      // Exclude the root feature placeholder itself if it matches the feature header
      const isFeatureRootTask = (t.id === feat.id) || (
        (t.taskType === 'feature_task' || (!t.parentTaskId || t.parentTaskId === '')) &&
        (t.title.trim().toLowerCase() === feat.name.trim().toLowerCase() ||
         t.title.trim().toLowerCase() === `[feature ${feat.sequenceOrder}] ${feat.name}`.toLowerCase() ||
         t.title.trim().toLowerCase().startsWith(`[feature ${feat.sequenceOrder}]`))
      );
      if (isFeatureRootTask) return false;

      // Belongs if explicitly matched by featureId, parentTaskId, or featureName
      if (t.featureId && (t.featureId === feat.id || t.featureId === feat.name)) return true;
      if (t.parentTaskId && (t.parentTaskId === feat.id || projectTasks.some(pt => pt.id === t.parentTaskId && pt.featureId === feat.id))) return true;
      if (t.featureName && t.featureName.toLowerCase() === feat.name.toLowerCase()) return true;
      if (feat.id.startsWith('feat-core') && (t.taskType === 'subtask' || t.parentTaskId)) return true;
      return false;
    });

    // 2. Separate into TL Directives (assigned to TL) and Developer Subtasks (delegated by TL to developers)
    const tlDirectiveTasks: Task[] = [];
    const directSubtasks: Task[] = [];

    featAllTasks.forEach((t) => {
      const isTLTask = t.assignedToRole === 'TL' || t.title.toLowerCase().includes('split the functions') || t.title.toLowerCase().includes('subtasks for');
      if (isTLTask) {
        tlDirectiveTasks.push(t);
      } else {
        directSubtasks.push(t);
      }
    });

    const matchingTLDirectives = tlDirectiveTasks.filter((t) => {
      const matchesSearch = !search || t.title.toLowerCase().includes(search.toLowerCase()) || t.assignedToName.toLowerCase().includes(search.toLowerCase());
      return matchesSearch;
    });

    const matchingSubtasks = directSubtasks.filter((t) => {
      const matchesSearch = 
        !search ||
        t.title.toLowerCase().includes(search.toLowerCase()) ||
        t.assignedToName.toLowerCase().includes(search.toLowerCase()) ||
        feat.name.toLowerCase().includes(search.toLowerCase());

      const matchesStatus = 
        statusFilter === 'all' ||
        (statusFilter === 'in-progress' && (t.status === 'In Progress' || t.timeTracker?.isActive)) ||
        (statusFilter === 'pending' && (t.status === 'Open' || t.status === 'Reopened')) ||
        (statusFilter === 'completed' && (t.status === 'Verified' || t.status === 'Submitted'));

      const matchesAssignee = 
        assigneeFilter === 'all' ||
        t.assignedTo === assigneeFilter ||
        t.assignedToName.toLowerCase().includes(assigneeFilter.toLowerCase());

      return matchesSearch && matchesStatus && matchesAssignee;
    });

    return {
      feature: feat,
      tlDirectives: matchingTLDirectives,
      subtasks: matchingSubtasks,
      totalCount: featAllTasks.length,
    };
  });

  return (
    <div className="space-y-6 pb-12 animate-fade-in font-sans">
      {/* Top Back & Quick Actions */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => {
            if (onBack) onBack();
            else setSelectedProjectId(null);
          }}
          className="inline-flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-blue-600 transition-colors bg-white px-3.5 py-2 rounded-xl border border-slate-200 shadow-xs cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4 text-slate-400" />
          <span>Back to All Projects</span>
        </button>

        <div className="flex items-center gap-2">
          {(isPM || isExecutive) && (
            <button
              onClick={() => onOpenAssignModal()}
              className="px-4 py-2 rounded-xl font-bold text-white text-xs bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4 text-white" />
              <span>+ Delegate New Task</span>
            </button>
          )}
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────────────────── */}
      {/* PROJECT SUMMARY HEADER CARD (Visible on all dashboards)                   */}
      {/* ───────────────────────────────────────────────────────────────────────── */}
      {activeProject && (
        <div className="bg-gradient-to-br from-white via-slate-50 to-blue-50/20 rounded-3xl border border-slate-200/90 p-6 shadow-sm relative overflow-hidden space-y-5">
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500" />

          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="text-xs font-black px-3 py-1 rounded-full bg-blue-100 text-blue-800 border border-blue-200 font-mono shadow-2xs">
                  {activeProject.code}
                </span>
                <StatusBadge status={activeProject.status} size="md" />
                <span className="text-xs text-slate-400 font-medium">
                  Client: <strong className="text-slate-800">{activeProject.client}</strong>
                </span>
              </div>

              <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                {activeProject.name}
              </h2>

              <p className="text-xs text-slate-500 max-w-3xl leading-relaxed">
                {activeProject.description || 'Project deliverable workspace and feature task hierarchy.'}
              </p>

              {/* Leadership tags with distinct color backgrounds */}
              <div className="flex flex-wrap items-center gap-2.5 text-xs pt-1">
                <div className="flex items-center gap-1.5 bg-blue-50 border border-blue-100 px-2.5 py-1 rounded-xl text-blue-900 font-medium">
                  <Briefcase className="w-3.5 h-3.5 text-blue-600" />
                  <span>PM: <strong className="text-blue-950 font-bold">{activeProject.pmName || 'PM'}</strong></span>
                </div>
                <div className="flex items-center gap-1.5 bg-emerald-50 border border-emerald-100 px-2.5 py-1 rounded-xl text-emerald-900 font-medium">
                  <Wrench className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Tech Lead: <strong className="text-emerald-950 font-bold">{projectTechLead || 'Tech Lead'}</strong></span>
                </div>
                {activeProject.targetEndDate && (
                  <div className="flex items-center gap-1.5 bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-xl text-slate-700 font-medium">
                    <Calendar className="w-3.5 h-3.5 text-slate-500" />
                    <span>Target Due: <strong>{activeProject.targetEndDate}</strong></span>
                  </div>
                )}
              </div>
            </div>

            {/* Quick Metrics Bar with distinct pastel backgrounds */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 lg:min-w-[480px]">
              <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 text-center shadow-2xs">
                <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">Features</span>
                <span className="text-xl font-black text-slate-900 mt-0.5 block">{activeFeatures.length}</span>
                <span className="text-[10px] text-slate-400 font-medium">Modules</span>
              </div>

              <div className="bg-indigo-50/60 p-3.5 rounded-2xl border border-indigo-100 text-center shadow-2xs">
                <span className="text-[10px] font-bold text-indigo-600 block uppercase tracking-wider">Subtasks</span>
                <span className="text-xl font-black text-indigo-900 mt-0.5 block">{completedTaskCount}/{projectTasks.length}</span>
                <span className="text-[10px] text-indigo-600 font-medium">Verified</span>
              </div>

              <div className="bg-blue-50/60 p-3.5 rounded-2xl border border-blue-100 text-center shadow-2xs">
                <span className="text-[10px] font-bold text-blue-600 block uppercase tracking-wider">Logged Work</span>
                <span className="text-xl font-black text-blue-900 mt-0.5 block">{timeTrackingService.formatDuration(totalWorkMins)}</span>
                <span className="text-[10px] text-blue-600 font-medium">of {totalEstimatedHrs}h</span>
              </div>

              <div className="bg-gradient-to-br from-emerald-50 to-teal-50 p-3.5 rounded-2xl border border-emerald-100 text-center shadow-2xs">
                <span className="text-[10px] font-bold text-emerald-700 block uppercase tracking-wider">Progress</span>
                <span className="text-xl font-black text-emerald-950 mt-0.5 block">{overallProgress}%</span>
                <div className="w-full bg-emerald-200/60 h-1.5 rounded-full mt-1.5 overflow-hidden">
                  <div className="h-full bg-emerald-600 rounded-full" style={{ width: `${overallProgress}%` }} />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────────────────── */}
      {/* FILTER & SEARCH CONTROL BAR                                               */}
      {/* ───────────────────────────────────────────────────────────────────────── */}
      <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Status Filters */}
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              statusFilter === 'all'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200/60'
            }`}
          >
            All Feature Tasks ({projectTasks.length})
          </button>

          <button
            onClick={() => setStatusFilter('in-progress')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              statusFilter === 'in-progress'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200/80'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
            <span>Active / Ongoing</span>
          </button>

          <button
            onClick={() => setStatusFilter('pending')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              statusFilter === 'pending'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200/80'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Pending</span>
          </button>

          <button
            onClick={() => setStatusFilter('completed')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              statusFilter === 'completed'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200/80'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Verified Done</span>
          </button>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search features, subtasks, engineers..."
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-sans"
          />
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────────────────── */}
      {/* PRIMARY FEATURE MODULES & HIERARCHICAL TASK TREE WITH RICH PALETTE        */}
      {/* ───────────────────────────────────────────────────────────────────────── */}
      <div className="space-y-7">
        {filteredFeatures.length === 0 ? (
          <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center space-y-3">
            <Layers className="w-10 h-10 text-slate-400 mx-auto" />
            <h3 className="text-base font-extrabold text-slate-800">No Feature Tasks Found</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              No tasks match your current search and filter criteria. Try resetting the filter.
            </p>
          </div>
        ) : (
          filteredFeatures.map(({ feature, tlDirectives, subtasks, totalCount }, idx) => {
            const theme = FEATURE_THEMES[idx % FEATURE_THEMES.length];
            const isCollapsed = collapsedFeatures[feature.id];
            const verifiedSubtasks = subtasks.filter((st) => st.status === 'Verified').length;
            const featureProgress = totalCount > 0 
              ? Math.round((verifiedSubtasks / totalCount) * 100) 
              : (feature.status === 'Verified' ? 100 : feature.progress || 0);

            const featWorkMins = [...tlDirectives, ...subtasks].reduce((sum, st) => sum + (st.timeTracker?.totalWorkMinutes || 0), 0);

            const isFeatureLocked = Boolean(feature.isBlocked);
            const userCanDelegateFeature = canDelegateForFeature(feature, tlDirectives) && !isFeatureLocked;

            return (
              <div
                key={feature.id}
                className={`bg-white rounded-3xl border transition-all duration-300 relative overflow-hidden ${
                  isFeatureLocked 
                    ? 'border-slate-300/80 opacity-70 bg-slate-50/50' 
                    : `border-slate-200 shadow-md ${theme.hoverBorder}`
                }`}
              >
                {/* Visual Top Theme Accent Strip */}
                <div className={`h-2 bg-gradient-to-r ${isFeatureLocked ? 'from-slate-400 to-slate-500' : theme.borderAccent}`} />

                {/* ── Level 1: Feature Module Header (Assigned to Team Lead) ── */}
                <div className={`p-6 border-b border-slate-200/80 flex flex-col lg:flex-row lg:items-center justify-between gap-4 ${
                  isFeatureLocked ? 'bg-slate-100/70' : theme.headerBg
                }`}>
                  <div className="space-y-2 flex-1">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <span className={`text-[10px] font-black px-2.5 py-1 rounded-lg tracking-wider font-mono ${
                        isFeatureLocked ? 'bg-slate-200 text-slate-700' : theme.badgeBg
                      }`}>
                        FEATURE {feature.sequenceOrder || idx + 1}
                      </span>
                      <h3 className="text-lg font-black text-slate-950 tracking-tight">
                        {feature.name}
                      </h3>
                      {isFeatureLocked ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-slate-200 text-slate-700 border border-slate-300">
                          <Lock className="w-3 h-3 text-slate-500" />
                          <span>Locked</span>
                        </span>
                      ) : (
                        <StatusBadge status={feature.status} size="sm" />
                      )}
                    </div>

                    <p className="text-xs text-slate-600 leading-relaxed max-w-3xl font-medium">
                      {feature.description}
                    </p>

                    {/* Team Lead Assignment & Metrics Badges */}
                    <div className="flex flex-wrap items-center gap-2.5 text-xs pt-1">
                      <div className="flex items-center gap-1.5 bg-white/80 border border-slate-200 px-2.5 py-1 rounded-xl text-slate-700 shadow-2xs">
                        <Wrench className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Lead: <strong className="text-slate-900">{feature.assignedTlName || projectTechLead || 'Tech Lead'}</strong></span>
                      </div>
                      <div className="flex items-center gap-1.5 bg-white/80 border border-slate-200 px-2.5 py-1 rounded-xl text-slate-700 shadow-2xs">
                        <GitBranch className="w-3.5 h-3.5 text-indigo-600" />
                        <span><strong>{subtasks.length}</strong> Subtasks ({verifiedSubtasks} Done)</span>
                      </div>
                      <div className="flex items-center gap-1.5 bg-white/80 border border-slate-200 px-2.5 py-1 rounded-xl text-slate-700 shadow-2xs">
                        <Timer className="w-3.5 h-3.5 text-blue-600" />
                        <span>Logged: <strong className="text-blue-700">{timeTrackingService.formatDuration(featWorkMins)}</strong></span>
                      </div>
                      {feature.dueDate && (
                        <div className="flex items-center gap-1.5 bg-white/80 border border-slate-200 px-2.5 py-1 rounded-xl text-slate-700 shadow-2xs">
                          <Calendar className="w-3.5 h-3.5 text-slate-500" />
                          <span>Due: <strong>{feature.dueDate}</strong></span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right: Progress Bar & Actions */}
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 shrink-0">
                    <div className="bg-white p-3.5 rounded-2xl border border-slate-200/90 min-w-[175px] space-y-1.5 shadow-xs">
                      <div className="flex items-center justify-between text-xs font-bold">
                        <span className="text-slate-500">Feature Progress</span>
                        <span className="text-blue-700 font-extrabold">{featureProgress}%</span>
                      </div>
                      <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                        <div
                          className={`h-full bg-gradient-to-r ${theme.borderAccent} transition-all rounded-full`}
                          style={{ width: `${featureProgress}%` }}
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Show header delegate button ONLY if there is no TL directive task yet */}
                      {tlDirectives.length === 0 && (
                        isFeatureLocked ? (
                          <button
                            disabled
                            className="px-3.5 py-2 rounded-xl text-xs font-bold text-slate-400 bg-slate-100 border border-slate-200 cursor-not-allowed flex items-center gap-1.5"
                            title="Feature is locked / blocked by dependencies"
                          >
                            <Lock className="w-3.5 h-3.5 text-slate-400" />
                            <span>Locked</span>
                          </button>
                        ) : userCanDelegateFeature ? (
                          <button
                            onClick={() => onOpenAssignModal({ 
                              id: feature.id, 
                              title: feature.name, 
                              featureId: feature.id, 
                              featureName: feature.name 
                            })}
                            className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
                            title="Delegate subtask to developer"
                          >
                            <Plus className="w-3.5 h-3.5 text-white" />
                            <span>Delegate Subtask</span>
                          </button>
                        ) : isTL ? (
                          <button
                            disabled
                            className="px-3 py-2 rounded-xl text-xs font-semibold text-slate-400 bg-slate-100 border border-slate-200 cursor-not-allowed flex items-center gap-1.5"
                            title={`Assigned to ${feature.assignedTlName || 'another Tech Lead'}. Only the assigned TL or PM can delegate.`}
                          >
                            <UserCheck className="w-3.5 h-3.5 text-slate-400" />
                            <span>Assigned to {feature.assignedTlName?.split(' ')[0] || 'TL'}</span>
                          </button>
                        ) : null
                      )}

                      <button
                        onClick={() => setSelectedFeatureId(feature.id)}
                        className="p-2 rounded-xl text-slate-500 hover:text-blue-600 hover:bg-white border border-slate-200 bg-white shadow-2xs transition-colors cursor-pointer"
                        title="Open Feature Split Workspace"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => toggleFeatureCollapse(feature.id)}
                        className="p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-white border border-slate-200 bg-white shadow-2xs transition-colors cursor-pointer"
                        title={isCollapsed ? 'Expand subtasks' : 'Collapse subtasks'}
                      >
                        {isCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </div>

                {/* ── Nested Content: TL Directives & Delegated Developer Subtasks ── */}
                {!isCollapsed && (
                  <div className="p-6 bg-slate-50/80 space-y-6">
                    {/* ── Level 2: Primary TL Directive Tasks (Assigned to TL by CTO/PM) ── */}
                    {tlDirectives.length > 0 && (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                          <span className="flex items-center gap-1.5 text-emerald-800 bg-emerald-100/60 border border-emerald-200/80 px-2.5 py-1 rounded-xl">
                            <Wrench className="w-3.5 h-3.5 text-emerald-700" />
                            <span>Team Lead Directive Task ({tlDirectives.length})</span>
                          </span>
                          <span className="text-[10px] text-slate-400 font-medium">
                            Assigned by PM/CTO to TL for subtask breakdown
                          </span>
                        </div>

                        <div className="grid grid-cols-1 gap-3">
                          {tlDirectives.map((tlTask) => {
                            const isOngoing = tlTask.status === 'In Progress' || tlTask.timeTracker?.isActive;
                            const loggedMins = tlTask.timeTracker?.totalWorkMinutes ?? Math.round((tlTask.actualHours || 0) * 60);
                            const isTaskLocked = Boolean(tlTask.isBlocked || tlTask.status === 'Blocked');
                            const userCanDelegateTask = canDelegateForTask(tlTask) && !isTaskLocked;

                            return (
                              <div
                                key={tlTask.id}
                                onClick={() => onSelectTask(tlTask.id)}
                                className={`p-4.5 rounded-2xl border transition-all cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm ${
                                  isTaskLocked
                                    ? 'bg-slate-100/80 border-slate-200 opacity-60 cursor-not-allowed'
                                    : 'bg-gradient-to-r from-emerald-50/80 via-teal-50/30 to-white border-emerald-200/90 hover:border-emerald-400'
                                }`}
                              >
                                <div className="space-y-1.5">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-emerald-600 text-white font-mono shadow-2xs">
                                      TL TASK
                                    </span>
                                    <h4 className="font-extrabold text-sm text-slate-900 hover:text-emerald-700 transition-colors">
                                      {tlTask.title}
                                    </h4>
                                    {isTaskLocked ? (
                                      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200 text-slate-700 border border-slate-300">
                                        <Lock className="w-3 h-3 text-slate-500" />
                                        <span>Locked</span>
                                      </span>
                                    ) : (
                                      <StatusBadge status={tlTask.status} size="sm" />
                                    )}
                                    {isOngoing && !isTaskLocked && (
                                      <span className="inline-flex items-center gap-1 text-[9px] font-black px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-ping" />
                                        <span>Active Work</span>
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-xs text-slate-600">
                                    Assigned to Lead: <strong className="text-emerald-950 font-bold">{tlTask.assignedToName}</strong> • Issuer: <strong className="text-slate-800 font-semibold">{tlTask.assignedByName}</strong>
                                  </p>
                                </div>

                                <div className="flex items-center gap-3 self-end md:self-center shrink-0">
                                  <div className="text-right text-xs bg-white/90 px-3 py-1.5 rounded-xl border border-emerald-100 shadow-2xs">
                                    <span className="text-[9px] text-slate-400 block font-bold uppercase">Logged</span>
                                    <strong className="text-emerald-800 font-black">{timeTrackingService.formatDuration(loggedMins)}</strong>
                                  </div>

                                  {isTaskLocked ? (
                                    <button
                                      disabled
                                      className="px-3 py-1.5 bg-slate-100 border border-slate-200 text-slate-400 font-bold text-xs rounded-xl flex items-center gap-1 cursor-not-allowed"
                                      title="This task is locked / blocked"
                                    >
                                      <Lock className="w-3.5 h-3.5 text-slate-400" />
                                      <span>Locked</span>
                                    </button>
                                  ) : userCanDelegateTask ? (
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        onOpenAssignModal({ 
                                          id: tlTask.id, 
                                          title: tlTask.title, 
                                          featureId: feature.id, 
                                          featureName: feature.name 
                                        });
                                      }}
                                      className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1 cursor-pointer"
                                    >
                                      <Plus className="w-3.5 h-3.5 text-white" />
                                      <span>Delegate Subtask</span>
                                    </button>
                                  ) : isTL ? (
                                    <button
                                      disabled
                                      className="px-2.5 py-1.5 bg-slate-100 border border-slate-200 text-slate-400 font-semibold text-xs rounded-xl flex items-center gap-1 cursor-not-allowed"
                                      title={`Assigned to ${tlTask.assignedToName}. You can only delegate subtasks from tasks assigned to you.`}
                                    >
                                      <UserCheck className="w-3.5 h-3.5 text-slate-400" />
                                      <span>Assigned to {tlTask.assignedToName?.split(' ')[0] || 'Other TL'}</span>
                                    </button>
                                  ) : null}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* ── Level 3: Delegated Engineering Subtasks (Assigned by TL to Developers) ── */}
                    <div className="space-y-3 bg-slate-100/70 p-5 rounded-2xl border border-slate-200/90 shadow-2xs">
                      <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                        <span className="flex items-center gap-1.5 text-indigo-900 bg-indigo-100/70 border border-indigo-200 px-2.5 py-1 rounded-xl">
                          <GitBranch className="w-3.5 h-3.5 text-indigo-700" />
                          <span>Delegated Engineering Subtasks ({subtasks.length})</span>
                        </span>
                        <span className="text-[10px] text-slate-500 font-medium">
                          Assigned to active developers for implementation
                        </span>
                      </div>

                      {subtasks.length === 0 ? (
                        <div className="p-8 rounded-2xl bg-white border border-dashed border-slate-300 text-center space-y-2">
                          <p className="text-xs text-slate-500">
                            No developer subtasks delegated under <strong>{feature.name}</strong> yet.
                          </p>
                          <p className="text-[11px] text-slate-400">
                            The assigned Team Lead can delegate tasks to developers using the <strong>Delegate Subtask</strong> button above.
                          </p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                          {subtasks.map((task) => {
                            const isOngoing = task.status === 'In Progress' || task.timeTracker?.isActive;
                            const isVerified = task.status === 'Verified';
                            const isSubmitted = task.status === 'Submitted';
                            const isTaskLocked = Boolean(task.isBlocked || task.status === 'Blocked');
                            const loggedMins = task.timeTracker?.totalWorkMinutes ?? Math.round((task.actualHours || 0) * 60);
                            const overdueStyle = timeTrackingService.getOverdueSeverity(task.dueDate, task.status);

                            // Check if logged-in user is the actual assignee of this subtask
                            const isTaskAssignee =
                              user?.id === task.assignedTo ||
                              (Boolean(task.assignedToName && user?.fullName) &&
                                task.assignedToName.toLowerCase() === user?.fullName?.toLowerCase()) ||
                              (Boolean(user?.email && task.assignedTo) &&
                                task.assignedTo.toLowerCase() === user.email.toLowerCase()) ||
                              (Boolean(user?.email && task.assignedToName) &&
                                task.assignedToName.toLowerCase().includes(user.email.split('@')[0].toLowerCase()));

                            // Subtask card styling with strong left accent borders
                            let statusBorderColor = 'border-l-blue-600';
                            let statusCardBg = 'bg-white';
                            if (isVerified) {
                              statusBorderColor = 'border-l-emerald-500';
                              statusCardBg = 'bg-emerald-50/20';
                            } else if (isSubmitted) {
                              statusBorderColor = 'border-l-indigo-600';
                              statusCardBg = 'bg-indigo-50/20';
                            } else if (task.status === 'Open' || task.status === 'Reopened') {
                              statusBorderColor = 'border-l-amber-500';
                              statusCardBg = 'bg-amber-50/15';
                            }

                            return (
                              <div
                                key={task.id}
                                onClick={() => onSelectTask(task.id)}
                                className={`p-4 rounded-2xl border border-l-4 transition-all cursor-pointer group flex flex-col justify-between space-y-3 shadow-xs hover:shadow-md ${statusBorderColor} ${statusCardBg} ${
                                  isTaskLocked
                                    ? 'border-slate-300 opacity-60 cursor-not-allowed bg-slate-100'
                                    : 'border-slate-200/90 hover:border-slate-300'
                                }`}
                              >
                                <div className="space-y-2">
                                  <div className="flex items-start justify-between gap-2">
                                    <div className="flex flex-wrap items-center gap-1.5">
                                      {isTaskLocked ? (
                                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200 text-slate-700 border border-slate-300">
                                          <Lock className="w-3 h-3 text-slate-500" />
                                          <span>Locked</span>
                                        </span>
                                      ) : (
                                        <StatusBadge status={task.status} size="sm" />
                                      )}
                                      {isOngoing && !isTaskLocked && (
                                        <span className="inline-flex items-center gap-1 text-[9px] font-black px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 border border-blue-200">
                                          <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-ping" />
                                          <span>Active Work</span>
                                        </span>
                                      )}
                                    </div>
                                    <span className="text-[10px] font-bold text-slate-400 font-mono">
                                      {task.estimatedHours || 8}h Est.
                                    </span>
                                  </div>

                                  <h4 className="font-extrabold text-slate-900 text-xs group-hover:text-blue-600 transition-colors line-clamp-1">
                                    {task.title}
                                  </h4>

                                  {task.description && (
                                    <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed font-normal">
                                      {task.description}
                                    </p>
                                  )}
                                </div>

                                {/* Assignee info & Time Logged */}
                                <div className="pt-2.5 border-t border-slate-100 space-y-2">
                                  <div className="flex items-center justify-between text-xs">
                                    <div className="flex items-center gap-2">
                                      <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-black text-[9px] flex items-center justify-center shadow-2xs">
                                        {task.assignedToName?.charAt(0) || 'D'}
                                      </div>
                                      <div>
                                        <span className="font-bold text-slate-800 text-[11px] block leading-tight">
                                          {task.assignedToName || 'Developer'}
                                        </span>
                                        <span className="text-[9px] text-slate-400 font-medium">
                                          {task.assignedToDesignation || 'Engineer'}
                                        </span>
                                      </div>
                                    </div>

                                    <div className="text-right">
                                      <span className="text-[10px] font-bold text-blue-700 block">
                                        {timeTrackingService.formatDuration(loggedMins)}
                                      </span>
                                      {task.dueDate && (
                                        <span className={`text-[9px] font-semibold ${overdueStyle.severity !== 'none' && !isVerified ? overdueStyle.badgeClasses : 'text-slate-400'}`}>
                                          Due {task.dueDate}
                                        </span>
                                      )}
                                    </div>
                                  </div>

                                  {/* Quick Action Button Strip (Strict Role & Assignee Logic) */}
                                  <div className="flex items-center justify-between pt-1 text-[11px]">
                                    <span className="text-[10px] text-slate-400 font-medium">
                                      By: {task.assignedByName || 'Lead'}
                                    </span>

                                    <div className="flex items-center gap-1.5">
                                      {/* Supervisor / TL Verify Button */}
                                      {isSubmitted && (isPM || isTL || isExecutive) && (
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            onOpenVerifyModal(task);
                                          }}
                                          className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] rounded-lg shadow-2xs transition-all cursor-pointer"
                                        >
                                          Verify Work
                                        </button>
                                      )}

                                      {/* Employee Submit Button - Shown ONLY to the assigned employee */}
                                      {isTaskAssignee && !isVerified && !isSubmitted && !isTaskLocked && (
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            onOpenSubmitModal(task);
                                          }}
                                          className="px-2.5 py-1 bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 font-bold text-[10px] rounded-lg transition-all cursor-pointer"
                                        >
                                          Submit Work
                                        </button>
                                      )}

                                      {/* Informative Status Pill for TL/Manager when viewing developer task */}
                                      {!isTaskAssignee && !isSubmitted && !isVerified && !isTaskLocked && (
                                        <span className="text-[10px] font-semibold text-slate-400 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded-lg">
                                          {isOngoing ? 'In Progress' : 'Assigned to Dev'}
                                        </span>
                                      )}

                                      {isVerified && (
                                        <span className="text-[10px] font-bold text-emerald-600 flex items-center gap-0.5">
                                          <CheckCircle2 className="w-3 h-3" />
                                          <span>Verified</span>
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default TaskManagementScreen;
