import React, { useState } from 'react';
import { ProjectFeature, Task, TeamMember } from '../../types';
import { StatusBadge } from '../common/StatusBadge';
import { TaskTimeTracker } from '../common/TaskTimeTracker';
import { timeTrackingService } from '../../services/timeTrackingService';
import { 
  ArrowLeft, 
  CheckCircle2, 
  Clock, 
  Calendar, 
  GitBranch, 
  Layers, 
  Plus, 
  FileText, 
  User, 
  ShieldCheck, 
  Send,
  AlertTriangle,
  Lock,
  ChevronRight,
  Sparkles,
  Layout,
  FileCode2
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface FeatureTaskWorkspaceProps {
  feature: ProjectFeature;
  tasks: Task[];
  teamMembers: TeamMember[];
  onBack: () => void;
  onSelectTask: (taskId: string) => void;
  onOpenAssignModal: (parentTask?: { id: string; title: string; featureId?: string; featureName?: string }) => void;
  onOpenSubmitModal: (task: Task) => void;
  onOpenVerifyModal: (task: Task) => void;
  onLogTimeAction?: (taskId: string, action: 'begin' | 'end' | 'break_start' | 'break_end' | 'pause', notes?: string) => Promise<any>;
}

export const FeatureTaskWorkspace: React.FC<FeatureTaskWorkspaceProps> = ({
  feature,
  tasks,
  teamMembers,
  onBack,
  onSelectTask,
  onOpenAssignModal,
  onOpenSubmitModal,
  onOpenVerifyModal,
  onLogTimeAction,
}) => {
  const { user, role, isFullAccessAdmin } = useAuth();

  const isExecutive = ['CEO', 'MD', 'COO', 'CTO', 'CIO'].includes(user?.role || '');
  const isPM = user?.role === 'PM' || isFullAccessAdmin;
  const isTL = user?.role === 'TL';
  const isEmployee = user?.role === 'Employee';

  // Primary task representing the root feature deliverable
  const primaryTask = tasks.find((t) => t.id === feature.id) || tasks.find(
    (t) => (t.featureId === feature.id) && (t.taskType === 'feature_task' || !t.parentTaskId)
  );

  // Subtasks belonging to this feature or delegated under this parent
  const subtasks = tasks.filter((t) => {
    if (t.id === primaryTask?.id || t.id === feature.id) return false;
    if (t.parentTaskId && (t.parentTaskId === feature.id || (primaryTask && t.parentTaskId === primaryTask.id))) return true;
    if (t.featureId && t.featureId === feature.id && t.taskType === 'subtask') return true;
    return false;
  });

  const featTasks = primaryTask ? [primaryTask, ...subtasks] : subtasks;

  const completedSubtasks = subtasks.filter((t) => t.status === 'Verified');
  const featureProgress = subtasks.length > 0
    ? Math.round((completedSubtasks.length / subtasks.length) * 100)
    : (feature.status === 'Verified' ? 100 : feature.progress || 0);

  const totalWorkMinutes = featTasks.reduce((acc, t) => acc + (t.timeTracker?.totalWorkMinutes || 0), 0);
  const totalBreakMinutes = featTasks.reduce((acc, t) => acc + (t.timeTracker?.totalBreakMinutes || 0), 0);

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Top Breadcrumb Header */}
      <div className="flex items-center justify-between gap-4">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 px-3.5 py-2 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 transition-all shadow-2xs cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4 text-slate-500" />
          <span>Back to All Feature Deliverables</span>
        </button>

        <div className="flex items-center gap-2">
          {isExecutive && (
            <span className="text-[11px] font-bold px-3 py-1 rounded-full bg-slate-900 text-slate-200 border border-slate-700 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
              <span>Executive Monitor Mode ({role})</span>
            </span>
          )}

          <StatusBadge status={feature.status} size="md" />
        </div>
      </div>

      {/* Main Title & Progress Header Card */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-black px-2.5 py-0.5 rounded-md bg-blue-100 text-blue-900 uppercase tracking-wider">
                Feature {feature.sequenceOrder}
              </span>
              <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
                {feature.name}
              </h2>
            </div>
            <p className="text-xs text-slate-500 max-w-3xl">
              {feature.description}
            </p>
          </div>

          {/* Progress Pill Card */}
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 min-w-[200px] space-y-2">
            <div className="flex items-center justify-between text-xs font-bold">
              <span className="text-slate-500">Feature Completion</span>
              <span className="text-blue-700 text-sm font-extrabold">{featureProgress}%</span>
            </div>
            <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-blue-600 to-emerald-500 transition-all rounded-full"
                style={{ width: `${featureProgress}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-[10px] text-slate-400 font-semibold">
              <span>{completedSubtasks.length} of {subtasks.length} Subtasks Done</span>
              <span>{feature.status}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Two-Column Dedicated Split Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN: Main Feature Content, Specs, Time & Ownership (7 Cols) */}
        <div className="lg:col-span-7 space-y-5">
          {/* Main Description & Specs Card */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-5">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3 font-extrabold text-slate-900 text-sm">
              <FileText className="w-4 h-4 text-blue-600" />
              <span>Deliverable Scope & Documentation Requirements</span>
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Feature Topic & Objectives
              </label>
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-xs text-slate-800 leading-relaxed whitespace-pre-wrap font-medium">
                {primaryTask?.description || feature.description || 'No detailed scope provided.'}
              </div>
            </div>

            {/* Linked Specifications Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs pt-1">
              {/* Functions */}
              <div className="bg-purple-50/60 p-3.5 rounded-2xl border border-purple-200/80 space-y-2">
                <span className="text-[10px] font-bold text-purple-900 uppercase tracking-wider flex items-center gap-1">
                  <FileCode2 className="w-3.5 h-3.5 text-purple-600" />
                  <span>FDS Functions</span>
                </span>
                <ul className="space-y-1 text-[11px] text-slate-700">
                  {feature.linkedFunctions.length > 0 ? (
                    feature.linkedFunctions.map((fn, idx) => (
                      <li key={idx} className="line-clamp-2 leading-relaxed flex items-start gap-1">
                        <span className="text-purple-500">•</span>
                        <span>{fn}</span>
                      </li>
                    ))
                  ) : (
                    <li className="text-slate-400 italic">No specific functions</li>
                  )}
                </ul>
              </div>

              {/* APIs */}
              <div className="bg-blue-50/60 p-3.5 rounded-2xl border border-blue-200/80 space-y-2">
                <span className="text-[10px] font-bold text-blue-900 uppercase tracking-wider flex items-center gap-1">
                  <FileCode2 className="w-3.5 h-3.5 text-blue-600" />
                  <span>TDS APIs</span>
                </span>
                <ul className="space-y-1 text-[10px] text-blue-950 font-mono">
                  {feature.linkedApis.length > 0 ? (
                    feature.linkedApis.map((api, idx) => (
                      <li key={idx} className="line-clamp-1 bg-white/80 px-1.5 py-0.5 rounded border border-blue-200/60">
                        {api}
                      </li>
                    ))
                  ) : (
                    <li className="text-slate-400 italic font-sans text-xs">No specific APIs</li>
                  )}
                </ul>
              </div>

              {/* Screens */}
              <div className="bg-emerald-50/60 p-3.5 rounded-2xl border border-emerald-200/80 space-y-2">
                <span className="text-[10px] font-bold text-emerald-900 uppercase tracking-wider flex items-center gap-1">
                  <Layout className="w-3.5 h-3.5 text-emerald-600" />
                  <span>UI Screens</span>
                </span>
                <ul className="space-y-1 text-[11px] text-slate-700">
                  {feature.linkedScreens.length > 0 ? (
                    feature.linkedScreens.map((scr, idx) => (
                      <li key={idx} className="line-clamp-1 flex items-center gap-1">
                        <span className="text-emerald-500">•</span>
                        <span>{scr}</span>
                      </li>
                    ))
                  ) : (
                    <li className="text-slate-400 italic">No screens mapped</li>
                  )}
                </ul>
              </div>
            </div>

            {/* Ownership & Hierarchy Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Supervisor (Assigner)
                </span>
                <p className="font-bold text-xs text-slate-900">
                  {primaryTask?.assignedByName || 'Project Manager'}
                </p>
                <span className="text-[10px] text-slate-500">
                  {primaryTask?.assignedByRole || 'PM Office'}
                </span>
              </div>

              <div className="p-3.5 bg-indigo-50/60 rounded-2xl border border-indigo-200/80 space-y-1">
                <span className="text-[10px] font-bold text-indigo-700 uppercase tracking-wider block">
                  Technical Lead (Responsible)
                </span>
                <p className="font-bold text-xs text-indigo-950">
                  {primaryTask?.assignedToRole === 'TL'
                    ? primaryTask.assignedToName
                    : feature.assignedTlName || 'Unassigned (Pending PM Assignment)'}
                </p>
                <span className="text-[10px] text-indigo-600 font-medium">
                  {primaryTask?.assignedToRole === 'TL'
                    ? (primaryTask.assignedToDesignation || 'Team Lead')
                    : feature.assignedTlName ? 'Team Lead' : 'Awaiting TL Assignment'}
                </span>
              </div>
            </div>

            {/* Durations & Metrics Summary */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-4 bg-slate-50/80 rounded-2xl border border-slate-200">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Logged Work Time</span>
                <span className="text-sm font-extrabold text-blue-700 mt-0.5 block">
                  {timeTrackingService.formatDuration(totalWorkMinutes)}
                </span>
              </div>

              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Logged Break Time</span>
                <span className="text-sm font-extrabold text-amber-600 mt-0.5 block">
                  {timeTrackingService.formatDuration(totalBreakMinutes)}
                </span>
              </div>

              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Target Due Date</span>
                <span className="text-xs font-bold text-slate-800 mt-0.5 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  {feature.dueDate || primaryTask?.dueDate || 'TBD'}
                </span>
              </div>
            </div>

            {/* PM / TL Action Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100">
              <span className="text-xs text-slate-400 font-medium">
                {subtasks.length} active subtasks in this feature
              </span>

              <div className="flex items-center gap-2">
                {(isTL || isPM) && (
                  <button
                    type="button"
                    onClick={() =>
                      onOpenAssignModal({
                        id: primaryTask?.id || feature.id,
                        title: feature.name,
                        featureId: feature.id,
                        featureName: feature.name,
                      })
                    }
                    className="px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-xs font-bold border border-indigo-200 flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                  >
                    <Plus className="w-4 h-4" />
                    <span>+ Delegate Subtask</span>
                  </button>
                )}

                {isTL && primaryTask && primaryTask.status !== 'Submitted' && primaryTask.status !== 'Verified' && (
                  subtasks.length > 0 && completedSubtasks.length === subtasks.length ? (
                    <button
                      type="button"
                      onClick={() => onOpenSubmitModal(primaryTask)}
                      className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs transition-all cursor-pointer"
                    >
                      Submit Feature to PM
                    </button>
                  ) : (
                    <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200">
                      {subtasks.length === 0
                        ? 'Delegate subtasks to developers first'
                        : `Complete all subtasks first (${completedSubtasks.length}/${subtasks.length} Done)`}
                    </span>
                  )
                )}

                {isPM && primaryTask && primaryTask.status === 'Submitted' && (
                  <button
                    type="button"
                    onClick={() => onOpenVerifyModal(primaryTask)}
                    className="px-4 py-2 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600 text-white rounded-xl text-xs font-bold shadow-sm transition-all cursor-pointer"
                  >
                    Verify & Unlock Next Feature
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Delegated Subtasks Panel (5 Cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <GitBranch className="w-4 h-4 text-indigo-600" />
                <h3 className="font-extrabold text-slate-900 text-sm">
                  Delegated Subtasks
                </h3>
              </div>
              <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-full">
                {completedSubtasks.length}/{subtasks.length} Done
              </span>
            </div>

            {/* Subtasks List */}
            <div className="space-y-3">
              {subtasks.length === 0 ? (
                <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-slate-400 text-xs space-y-2">
                  <GitBranch className="w-6 h-6 text-slate-300 mx-auto" />
                  <p className="font-semibold text-slate-600">No Subtasks Delegated Yet</p>
                  <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
                    The Team Lead can split this feature into subtasks and assign them to developers.
                  </p>
                  {(isTL || isPM) && (
                    <button
                      type="button"
                      onClick={() =>
                        onOpenAssignModal({
                          id: primaryTask?.id || feature.id,
                          title: feature.name,
                          featureId: feature.id,
                          featureName: feature.name,
                        })
                      }
                      className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 cursor-pointer shadow-2xs"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Delegate First Subtask</span>
                    </button>
                  )}
                </div>
              ) : (
                subtasks.map((st) => {
                  const overdueStyle = timeTrackingService.getOverdueSeverity(st.dueDate, st.status);

                  return (
                    <div
                      key={st.id}
                      onClick={() => onSelectTask(st.id)}
                      className={`p-4 rounded-2xl border transition-all cursor-pointer hover:shadow-xs group space-y-2.5 ${overdueStyle.cardClasses}`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="space-y-1 flex-1">
                          <h4 className="text-xs font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                            {st.title}
                          </h4>
                          <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed">
                            {st.description}
                          </p>
                        </div>
                        <StatusBadge status={st.status} size="sm" />
                      </div>

                      <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-200/60">
                        <div className="flex items-center gap-1.5">
                          <User className="w-3 h-3 text-slate-400" />
                          <span className="font-semibold text-slate-700">{st.assignedToName}</span>
                          <span className="text-[10px] text-slate-400">({st.assignedToDesignation || 'Engineer'})</span>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-blue-700 font-bold bg-blue-50 px-1.5 py-0.2 rounded">
                            {timeTrackingService.formatDuration(st.timeTracker?.totalWorkMinutes || 0)}
                          </span>
                          <ChevronRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-blue-500 transition-colors" />
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
