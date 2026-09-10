import React, { useState } from 'react';
import { ProjectFeature, Task, TeamMember, UserRole } from '../../types';
import { StatusBadge } from '../common/StatusBadge';
import { TaskTimeTracker } from '../common/TaskTimeTracker';
import { timeTrackingService } from '../../services/timeTrackingService';
import { 
  ChevronDown, 
  ChevronRight, 
  Lock, 
  Sparkles, 
  CheckCircle2, 
  Clock, 
  CornerDownRight, 
  ShieldCheck, 
  Layers, 
  Calendar,
  AlertCircle,
  FileCode2,
  Layout,
  Plus
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface FeatureArchitectureTreeProps {
  features: ProjectFeature[];
  tasks: Task[];
  teamMembers: TeamMember[];
  onSelectTask: (taskId: string) => void;
  onOpenAssignModal?: (parentTask?: { id: string; title: string; featureId?: string; featureName?: string }) => void;
  onOpenSubmitModal?: (task: Task) => void;
  onOpenVerifyModal?: (task: Task) => void;
  onLogTimeAction?: (taskId: string, action: 'begin' | 'end' | 'break_start' | 'break_end' | 'pause', notes?: string) => Promise<any>;
}

export const FeatureArchitectureTree: React.FC<FeatureArchitectureTreeProps> = ({
  features,
  tasks,
  teamMembers,
  onSelectTask,
  onOpenAssignModal,
  onOpenSubmitModal,
  onOpenVerifyModal,
  onLogTimeAction,
}) => {
  const { user, role, isFullAccessAdmin } = useAuth();
  const [expandedFeatures, setExpandedFeatures] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    features.forEach((f, idx) => {
      init[f.id] = idx === 0 || !f.isBlocked; // Expand unblocked by default
    });
    return init;
  });

  const toggleFeature = (featId: string) => {
    setExpandedFeatures((prev) => ({ ...prev, [featId]: !prev[featId] }));
  };

  const isExecutive = isFullAccessAdmin || ['CEO', 'MD', 'COO', 'CTO', 'CIO'].includes(role);
  const isPM = role === 'PM' || isFullAccessAdmin;
  const isTL = role === 'TL';
  const isEmployee = role === 'Employee';

  return (
    <div className="space-y-6">
      {/* Top Architecture Flow Bar */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-indigo-100/80 text-indigo-700">
                <Layers className="w-5 h-5" />
              </span>
              <h3 className="text-base font-extrabold text-slate-900 tracking-tight">
                Architectural Feature Execution Pipeline
              </h3>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Sequential implementation: Features unlock one after another upon PM formal verification.
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs font-semibold">
            <span className="text-slate-500">Pipeline Progress:</span>
            <div className="w-32 bg-slate-100 h-2.5 rounded-full overflow-hidden border border-slate-200">
              {(() => {
                const verifiedCount = features.filter((f) => f.status === 'Verified').length;
                const pct = features.length > 0 ? Math.round((verifiedCount / features.length) * 100) : 0;
                return (
                  <div
                    className="h-full bg-gradient-to-r from-blue-600 to-emerald-500 transition-all"
                    style={{ width: `${pct}%` }}
                  />
                );
              })()}
            </div>
            <span className="font-extrabold text-slate-800">
              {features.filter((f) => f.status === 'Verified').length}/{features.length} Done
            </span>
          </div>
        </div>

        {/* Feature Breadcrumb Pipeline */}
        <div className="flex items-center gap-2 overflow-x-auto py-2">
          {features.map((feat, idx) => {
            const isCompleted = feat.status === 'Verified';
            const isActive = !feat.isBlocked && !isCompleted;
            const isLocked = feat.isBlocked;

            return (
              <React.Fragment key={feat.id}>
                <div
                  onClick={() => !isLocked && toggleFeature(feat.id)}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl border text-xs font-bold shrink-0 transition-all cursor-pointer ${
                    isCompleted
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-200 shadow-2xs'
                      : isActive
                      ? 'bg-blue-50 text-blue-900 border-blue-300 ring-2 ring-blue-500/20 shadow-xs'
                      : 'bg-slate-100/70 text-slate-400 border-slate-200 cursor-not-allowed opacity-75'
                  }`}
                >
                  {isCompleted ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  ) : isLocked ? (
                    <Lock className="w-3.5 h-3.5 text-slate-400" />
                  ) : (
                    <span className="w-2 h-2 rounded-full bg-blue-600 animate-ping" />
                  )}
                  <span>F{feat.sequenceOrder}: {feat.name.slice(0, 22)}...</span>
                </div>
                {idx < features.length - 1 && (
                  <div className={`w-4 h-0.5 shrink-0 ${isCompleted ? 'bg-emerald-400' : 'bg-slate-200'}`} />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Feature Cards Hierarchy */}
      <div className="space-y-4">
        {features.map((feature) => {
          const isExpanded = expandedFeatures[feature.id] ?? false;
          const isLocked = feature.isBlocked;
          const featTasks = tasks.filter((t) => t.featureId === feature.id);
          const verifiedTasksCount = featTasks.filter((t) => t.status === 'Verified').length;
          const featureProgress = featTasks.length > 0 ? Math.round((verifiedTasksCount / featTasks.length) * 100) : 0;
          const isFeatureCompleted = feature.status === 'Verified' || (featTasks.length > 0 && verifiedTasksCount === featTasks.length);

          const tlTask = featTasks.find((t) => t.taskType === 'feature_task' || !t.parentTaskId);
          const subtasks = featTasks.filter((t) => t.parentTaskId || t.taskType === 'subtask');

          return (
            <div
              key={feature.id}
              className={`rounded-3xl border transition-all overflow-hidden ${
                isLocked
                  ? 'bg-slate-100/60 border-slate-200/80 opacity-80'
                  : isFeatureCompleted
                  ? 'bg-white border-emerald-200 shadow-sm'
                  : 'bg-white border-slate-200 shadow-sm hover:border-blue-300'
              }`}
            >
              {/* Feature Header Bar */}
              <div
                onClick={() => !isLocked && toggleFeature(feature.id)}
                className={`p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer transition-colors ${
                  isLocked ? 'cursor-not-allowed' : 'hover:bg-slate-50/50'
                }`}
              >
                <div className="flex items-start gap-3.5 flex-1">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (!isLocked) toggleFeature(feature.id);
                    }}
                    className={`mt-0.5 p-1 rounded-lg border text-slate-500 transition-colors ${
                      isLocked ? 'cursor-not-allowed opacity-50' : 'hover:bg-slate-200'
                    }`}
                  >
                    {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                  </button>

                  <div className="space-y-1.5 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-blue-100 text-blue-900 tracking-wider">
                        FEATURE {feature.sequenceOrder}
                      </span>
                      <h4 className="text-sm sm:text-base font-extrabold text-slate-900 tracking-tight">
                        {feature.name}
                      </h4>
                      {isLocked ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200 text-slate-700">
                          <Lock className="w-3 h-3" />
                          <span>Locked (Waiting for Feature {feature.sequenceOrder - 1})</span>
                        </span>
                      ) : isFeatureCompleted ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Feature Verified & Delivered</span>
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                          {featureProgress}% Completed
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-slate-600 leading-relaxed max-w-3xl">
                      {feature.description}
                    </p>

                    {/* Metadata tags from Docs */}
                    <div className="flex flex-wrap items-center gap-3 pt-1 text-[11px] text-slate-500">
                      <span>Tech Stack: <strong className="text-slate-800">{feature.technology || 'Web Platform'}</strong></span>
                      <span>•</span>
                      <span>Assigned TL: <strong className="text-slate-800">{feature.assignedTlName || 'Unassigned'}</strong></span>
                      {feature.dueDate && (
                        <>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3 text-slate-400" />
                            Target Due: <strong className="text-slate-800">{feature.dueDate}</strong>
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right controls */}
                <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                  <div className="text-right hidden sm:block">
                    <span className="text-[10px] text-slate-400 block font-semibold">Subtasks</span>
                    <span className="text-xs font-bold text-slate-800">
                      {verifiedTasksCount}/{featTasks.length} Done
                    </span>
                  </div>

                  {/* Actions based on role */}
                  {!isLocked && (
                    <div className="flex items-center gap-2">
                      {/* TL Split subtask button */}
                      {(isTL || isPM) && !isFeatureCompleted && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (onOpenAssignModal) {
                              onOpenAssignModal({
                                id: tlTask?.id || feature.id,
                                title: feature.name,
                                featureId: feature.id,
                                featureName: feature.name,
                              });
                            }
                          }}
                          className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-xs font-bold border border-indigo-200 flex items-center gap-1.5 cursor-pointer transition-colors shadow-2xs"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>+ Delegate Subtask</span>
                        </button>
                      )}

                      {/* TL Submit Feature to PM */}
                      {isTL && tlTask && tlTask.status !== 'Submitted' && tlTask.status !== 'Verified' && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (onOpenSubmitModal) onOpenSubmitModal(tlTask);
                          }}
                          className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
                        >
                          Submit to PM
                        </button>
                      )}

                      {/* PM Verify Feature Button */}
                      {isPM && tlTask && tlTask.status === 'Submitted' && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (onOpenVerifyModal) onOpenVerifyModal(tlTask);
                          }}
                          className="px-3.5 py-1.5 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600 text-white rounded-xl text-xs font-bold shadow-sm transition-all cursor-pointer"
                        >
                          Verify & Unlock Next
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Collapsible Subtasks & Spec breakdown */}
              {isExpanded && !isLocked && (
                <div className="border-t border-slate-100 p-5 sm:p-6 bg-slate-50/40 space-y-4 animate-fade-in">
                  {/* Linked Specifications from Docs 5, 6, 8 */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                    {/* Functions (FDS) */}
                    <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-2xs space-y-2">
                      <div className="flex items-center gap-1.5 font-bold text-purple-900 text-[11px] uppercase tracking-wider">
                        <FileCode2 className="w-3.5 h-3.5 text-purple-600" />
                        <span>FDS Function Specs</span>
                      </div>
                      <ul className="space-y-1 text-[11px] text-slate-600">
                        {feature.linkedFunctions.length > 0 ? (
                          feature.linkedFunctions.map((fn, idx) => (
                            <li key={idx} className="line-clamp-2 leading-relaxed flex items-start gap-1">
                              <span className="text-purple-500">•</span>
                              <span>{fn}</span>
                            </li>
                          ))
                        ) : (
                          <li className="text-slate-400 italic">No specific function specs mapped</li>
                        )}
                      </ul>
                    </div>

                    {/* APIs (TDS) */}
                    <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-2xs space-y-2">
                      <div className="flex items-center gap-1.5 font-bold text-blue-900 text-[11px] uppercase tracking-wider">
                        <FileCode2 className="w-3.5 h-3.5 text-blue-600" />
                        <span>TDS API Endpoints</span>
                      </div>
                      <ul className="space-y-1 text-[11px] text-slate-600 font-mono">
                        {feature.linkedApis.length > 0 ? (
                          feature.linkedApis.map((api, idx) => (
                            <li key={idx} className="line-clamp-1 leading-relaxed text-[10px] text-blue-900 bg-blue-50/80 px-1.5 py-0.5 rounded">
                              {api}
                            </li>
                          ))
                        ) : (
                          <li className="text-slate-400 italic font-sans text-xs">No specific APIs mapped</li>
                        )}
                      </ul>
                    </div>

                    {/* UI Screens (UI/UX) */}
                    <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-2xs space-y-2">
                      <div className="flex items-center gap-1.5 font-bold text-emerald-900 text-[11px] uppercase tracking-wider">
                        <Layout className="w-3.5 h-3.5 text-emerald-600" />
                        <span>UI/UX Screen Specs</span>
                      </div>
                      <ul className="space-y-1 text-[11px] text-slate-600">
                        {feature.linkedScreens.length > 0 ? (
                          feature.linkedScreens.map((scr, idx) => (
                            <li key={idx} className="line-clamp-1 leading-relaxed flex items-center gap-1">
                              <span className="text-emerald-500">•</span>
                              <span>{scr}</span>
                            </li>
                          ))
                        ) : (
                          <li className="text-slate-400 italic">No UI screen specs mapped</li>
                        )}
                      </ul>
                    </div>
                  </div>

                  {/* Subtask items list */}
                  <div className="space-y-2.5 pt-2">
                    <div className="flex items-center justify-between">
                      <h5 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">
                        Assigned Subtasks & Engineering Breakdown
                      </h5>
                      <span className="text-[11px] text-slate-400">
                        {subtasks.length} delegated subtasks
                      </span>
                    </div>

                    {subtasks.length === 0 ? (
                      <div className="p-6 text-center bg-white rounded-2xl border border-slate-200 text-slate-400 text-xs">
                        No subtasks assigned under this feature yet.{' '}
                        {(isTL || isPM) && (
                          <span
                            onClick={() =>
                              onOpenAssignModal &&
                              onOpenAssignModal({
                                id: tlTask?.id || feature.id,
                                title: feature.name,
                                featureId: feature.id,
                                featureName: feature.name,
                              })
                            }
                            className="text-blue-600 font-bold hover:underline cursor-pointer ml-1"
                          >
                            Click to delegate a subtask to an employee.
                          </span>
                        )}
                      </div>
                    ) : (
                      subtasks.map((task) => {
                        const overdueStyle = timeTrackingService.getOverdueSeverity(task.dueDate, task.status);

                        return (
                          <div
                            key={task.id}
                            onClick={() => onSelectTask(task.id)}
                            className={`p-4 rounded-2xl border transition-all cursor-pointer ${overdueStyle.cardClasses} space-y-3`}
                          >
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <CornerDownRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                  <h6 className="text-xs font-bold text-slate-900 hover:text-blue-600 transition-colors">
                                    {task.title}
                                  </h6>
                                  <StatusBadge status={task.status} size="sm" />
                                  {overdueStyle.severity !== 'none' && task.status !== 'Verified' && (
                                    <span className={`text-[9px] px-2 py-0.5 rounded border ${overdueStyle.badgeClasses}`}>
                                      {overdueStyle.label}
                                    </span>
                                  )}
                                </div>
                                <p className="text-[11px] text-slate-500 pl-5 line-clamp-1">
                                  {task.description}
                                </p>
                              </div>

                              <div className="flex items-center gap-3 pl-5 sm:pl-0 shrink-0">
                                <div className="text-left sm:text-right">
                                  <span className="text-[10px] text-slate-400 block">Developer</span>
                                  <span className="text-xs font-bold text-slate-800">{task.assignedToName}</span>
                                </div>

                                {/* Employee Submit Button */}
                                {isEmployee && task.assignedTo === user?.id && (task.status === 'Open' || task.status === 'In Progress' || task.status === 'Reopened') && (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (onOpenSubmitModal) onOpenSubmitModal(task);
                                    }}
                                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-2xs"
                                  >
                                    Submit
                                  </button>
                                )}

                                {/* TL Verify Employee Subtask */}
                                {isTL && task.status === 'Submitted' && (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (onOpenVerifyModal) onOpenVerifyModal(task);
                                    }}
                                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-2xs"
                                  >
                                    Verify Subtask
                                  </button>
                                )}
                              </div>
                            </div>

                            {/* Integrated Time Tracker on Subtask */}
                            {onLogTimeAction && (
                              <div className="pl-5" onClick={(e) => e.stopPropagation()}>
                                <TaskTimeTracker
                                  task={task}
                                  onLogAction={onLogTimeAction}
                                  readOnly={!isEmployee || task.assignedTo !== user?.id}
                                />
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
