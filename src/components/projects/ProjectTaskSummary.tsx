import React, { useState } from 'react';
import { Project, Task, UserRole } from '../../types';
import { StatusBadge } from '../common/StatusBadge';
import { 
  CheckSquare, 
  Calendar, 
  User, 
  Paperclip, 
  ExternalLink, 
  Plus, 
  Download, 
  FileText,
  Clock,
  CheckCircle,
  AlertCircle,
  GitBranch,
  CornerDownRight,
  ListTree,
  LayoutGrid,
  Shield
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface ProjectTaskSummaryProps {
  project: Project;
  tasks: Task[];
  onSelectTask: (taskId: string) => void;
  onOpenAssignModal?: (parentTask?: { id: string; title: string }) => void;
}

export const ProjectTaskSummary: React.FC<ProjectTaskSummaryProps> = ({
  project,
  tasks,
  onSelectTask,
  onOpenAssignModal,
}) => {
  const { user, isFullAccessAdmin } = useAuth();
  const [roleFilter, setRoleFilter] = useState<'All' | 'PM' | 'TL' | 'Employee'>('All');
  const [viewMode, setViewMode] = useState<'tree' | 'list'>('tree');

  const projectTasks = tasks.filter((t) => t.projectId === project.id);

  const filteredTasks = projectTasks.filter((t) => {
    if (roleFilter === 'All') return true;
    return t.assignedToRole === roleFilter;
  });

  const pmTasks = projectTasks.filter((t) => t.assignedToRole === 'PM');
  const tlTasks = projectTasks.filter((t) => t.assignedToRole === 'TL');
  const empTasks = projectTasks.filter((t) => t.assignedToRole === 'Employee');

  // Build task hierarchy trees (Root / Parent tasks created by CTO/Admin)
  const rootTasks = projectTasks.filter((t) => !t.parentTaskId);

  return (
    <div className="space-y-6">
      {/* Role Counts Header Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div
          onClick={() => setRoleFilter('All')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${
            roleFilter === 'All'
              ? 'bg-blue-50/70 border-blue-500 ring-2 ring-blue-500/20'
              : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">All Tasks</span>
            <CheckSquare className="w-4 h-4 text-blue-600" />
          </div>
          <p className="text-2xl font-black text-slate-900 mt-2">{projectTasks.length}</p>
          <p className="text-[11px] text-slate-400 mt-0.5">
            {projectTasks.filter((t) => t.status === 'Verified').length} completed
          </p>
        </div>

        <div
          onClick={() => setRoleFilter('PM')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${
            roleFilter === 'PM'
              ? 'bg-indigo-50/70 border-indigo-500 ring-2 ring-indigo-500/20'
              : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider">PM Tasks</span>
            <User className="w-4 h-4 text-indigo-600" />
          </div>
          <p className="text-2xl font-black text-slate-900 mt-2">{pmTasks.length}</p>
          <p className="text-[11px] text-slate-400 mt-0.5">Project governance & planning</p>
        </div>

        <div
          onClick={() => setRoleFilter('TL')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${
            roleFilter === 'TL'
              ? 'bg-purple-50/70 border-purple-500 ring-2 ring-purple-500/20'
              : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-purple-600 uppercase tracking-wider">TL Tasks</span>
            <User className="w-4 h-4 text-purple-600" />
          </div>
          <p className="text-2xl font-black text-slate-900 mt-2">{tlTasks.length}</p>
          <p className="text-[11px] text-slate-400 mt-0.5">Technical lead & architecture</p>
        </div>

        <div
          onClick={() => setRoleFilter('Employee')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${
            roleFilter === 'Employee'
              ? 'bg-teal-50/70 border-teal-500 ring-2 ring-teal-500/20'
              : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-teal-600 uppercase tracking-wider">Dev Tasks</span>
            <User className="w-4 h-4 text-teal-600" />
          </div>
          <p className="text-2xl font-black text-slate-900 mt-2">{empTasks.length}</p>
          <p className="text-[11px] text-slate-400 mt-0.5">Engineering deliverables</p>
        </div>
      </div>

      {/* Action Bar & View Mode Toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <span>{viewMode === 'tree' ? 'Hierarchical Delegation Tree' : 'Delegated Tasks'}</span>
            <span className="text-xs font-semibold text-slate-400">({filteredTasks.length})</span>
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Structured hierarchy: CTO / Sponsor Directives ➔ PM Governance ➔ TL Specifications ➔ Developer Execution
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* View Mode Toggle */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs">
            <button
              onClick={() => setViewMode('tree')}
              className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                viewMode === 'tree' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ListTree className="w-3.5 h-3.5" />
              <span>Hierarchy Tree</span>
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                viewMode === 'list' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>List View</span>
            </button>
          </div>

          {onOpenAssignModal && (isFullAccessAdmin || user?.role === 'PM' || user?.role === 'TL') && (
            <button
              onClick={() => onOpenAssignModal()}
              className="px-4 py-2 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600 text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5 cursor-pointer transition-all transform hover:-translate-y-0.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Assign Deliverable</span>
            </button>
          )}
        </div>
      </div>

      {/* Task List / Hierarchy Tree Cards */}
      <div className="space-y-4">
        {filteredTasks.length === 0 ? (
          <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center text-slate-400 text-xs">
            No tasks found under this role filter.
          </div>
        ) : viewMode === 'tree' ? (
          /* HIERARCHY TREE VIEW */
          <div className="space-y-6">
            {(rootTasks.length > 0 ? rootTasks : filteredTasks).map((rootTask) => {
              const tlSubtasks = projectTasks.filter((t) => t.parentTaskId === rootTask.id);

              return (
                <div key={rootTask.id} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
                  {/* Root / Parent Directive (CTO -> PM) */}
                  <div
                    onClick={() => onSelectTask(rootTask.id)}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl bg-slate-50/80 border border-slate-200 hover:border-blue-400 transition-all cursor-pointer group"
                  >
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-indigo-100 text-indigo-800 flex items-center gap-1">
                          <Shield className="w-3 h-3 text-indigo-600" />
                          <span>{rootTask.assignedToRole === 'PM' ? 'Executive Directive ➔ PM' : 'Primary Project Task'}</span>
                        </span>
                        <h4 className="text-xs font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                          {rootTask.title}
                        </h4>
                        {rootTask.priority === 'High' && (
                          <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-rose-50 text-rose-600 border border-rose-200">
                            High Priority
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 line-clamp-1">{rootTask.description}</p>
                      <div className="flex flex-wrap items-center gap-3 text-[10px] text-slate-400">
                        <span>Lead: <strong className="text-slate-700">{rootTask.assignedToName}</strong></span>
                        {rootTask.docName && <span className="text-blue-600 font-semibold">{rootTask.docName}</span>}
                        <span>Due: {rootTask.dueDate}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <StatusBadge status={rootTask.status} size="sm" />
                      {onOpenAssignModal && (isFullAccessAdmin || user?.role === 'PM') && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onOpenAssignModal({ id: rootTask.id, title: rootTask.title });
                          }}
                          className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-[10px] font-bold border border-indigo-200 flex items-center gap-1 cursor-pointer transition-colors"
                        >
                          <CornerDownRight className="w-3 h-3" />
                          <span>+ Split to TL</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Level 2 Sub-tasks (PM -> TL) */}
                  {tlSubtasks.length > 0 && (
                    <div className="pl-4 sm:pl-8 space-y-3 border-l-2 border-indigo-100 ml-3">
                      {tlSubtasks.map((tlTask) => {
                        const devSubtasks = projectTasks.filter((t) => t.parentTaskId === tlTask.id);

                        return (
                          <div key={tlTask.id} className="space-y-3">
                            <div
                              onClick={() => onSelectTask(tlTask.id)}
                              className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl bg-purple-50/50 border border-purple-200/80 hover:border-purple-400 transition-all cursor-pointer group"
                            >
                              <div className="space-y-1 flex-1">
                                <div className="flex items-center gap-2">
                                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-purple-100 text-purple-800 flex items-center gap-1">
                                    <GitBranch className="w-3 h-3 text-purple-600" />
                                    <span>PM Delegation ➔ TL</span>
                                  </span>
                                  <h5 className="text-xs font-bold text-slate-900 group-hover:text-purple-700 transition-colors">
                                    {tlTask.title}
                                  </h5>
                                </div>
                                <p className="text-[11px] text-slate-500 line-clamp-1">{tlTask.description}</p>
                                <div className="flex flex-wrap items-center gap-3 text-[10px] text-slate-400">
                                  <span>Tech Lead: <strong className="text-slate-700">{tlTask.assignedToName}</strong></span>
                                  <span>Due: {tlTask.dueDate}</span>
                                </div>
                              </div>

                              <div className="flex items-center gap-2 shrink-0">
                                <StatusBadge status={tlTask.status} size="sm" />
                                {onOpenAssignModal && (isFullAccessAdmin || user?.role === 'PM' || user?.role === 'TL') && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onOpenAssignModal({ id: tlTask.id, title: tlTask.title });
                                    }}
                                    className="px-2.5 py-1 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-lg text-[10px] font-bold border border-purple-200 flex items-center gap-1 cursor-pointer transition-colors"
                                  >
                                    <CornerDownRight className="w-3 h-3" />
                                    <span>+ Delegate to Dev</span>
                                  </button>
                                )}
                              </div>
                            </div>

                            {/* Level 3 Sub-tasks (TL -> Developers / QA) */}
                            {devSubtasks.length > 0 && (
                              <div className="pl-4 sm:pl-8 space-y-2 border-l-2 border-purple-100 ml-3">
                                {devSubtasks.map((devTask) => (
                                  <div
                                    key={devTask.id}
                                    onClick={() => onSelectTask(devTask.id)}
                                    className="flex items-center justify-between gap-3 p-2.5 rounded-xl bg-teal-50/40 border border-teal-200/80 hover:border-teal-400 transition-all cursor-pointer group"
                                  >
                                    <div className="space-y-0.5 flex-1">
                                      <div className="flex items-center gap-2">
                                        <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-teal-100 text-teal-800">
                                          Engineering Deliverable
                                        </span>
                                        <h6 className="text-xs font-bold text-slate-800 group-hover:text-teal-700">
                                          {devTask.title}
                                        </h6>
                                      </div>
                                      <div className="flex items-center gap-3 text-[10px] text-slate-400">
                                        <span>Dev: <strong className="text-slate-700">{devTask.assignedToName}</strong></span>
                                        <span>Due: {devTask.dueDate}</span>
                                      </div>
                                    </div>
                                    <StatusBadge status={devTask.status} size="sm" />
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          /* REGULAR CARD LIST VIEW */
          filteredTasks.map((task) => (
            <div
              key={task.id}
              onClick={() => onSelectTask(task.id)}
              className="bg-white p-5 rounded-2xl border border-slate-200 hover:border-blue-400 hover:shadow-xs transition-all cursor-pointer group flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            >
              <div className="space-y-1.5 flex-1">
                <div className="flex items-center gap-2">
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                      task.assignedToRole === 'PM'
                        ? 'bg-indigo-100 text-indigo-800'
                        : task.assignedToRole === 'TL'
                        ? 'bg-purple-100 text-purple-800'
                        : 'bg-teal-100 text-teal-800'
                    }`}
                  >
                    {task.assignedToRole}
                  </span>
                  <h4 className="text-sm font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                    {task.title}
                  </h4>
                  {task.priority === 'High' && (
                    <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-rose-50 text-rose-600 border border-rose-200">
                      High Priority
                    </span>
                  )}
                </div>

                <p className="text-xs text-slate-500 line-clamp-1">{task.description}</p>

                <div className="flex flex-wrap items-center gap-4 text-[11px] text-slate-400 pt-1">
                  <span className="flex items-center gap-1">
                    <User className="w-3 h-3 text-slate-400" />
                    Assigned to: <strong className="text-slate-700">{task.assignedToName}</strong>
                  </span>
                  {task.docName && (
                    <span className="flex items-center gap-1 text-blue-600 font-medium">
                      <FileText className="w-3 h-3" />
                      {task.docName}
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-slate-400" />
                    Due: {task.dueDate}
                  </span>
                </div>

                {/* Reference Files Checklist / Attachment download */}
                {task.referenceFiles && task.referenceFiles.length > 0 && (
                  <div className="pt-2 flex items-center gap-2">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                      <Paperclip className="w-3 h-3" /> References ({task.referenceFiles.length}):
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {task.referenceFiles.map((file) => (
                        <a
                          key={file.id}
                          href={file.url}
                          target="_blank"
                          rel="noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-700 rounded-md text-[10px] font-medium border border-slate-200 transition-colors"
                        >
                          <span>{file.name}</span>
                          <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Status and Progress */}
              <div className="flex items-center gap-3">
                <StatusBadge status={task.status} size="sm" />
                <div className="text-[10px] text-slate-400 font-mono">Progress: {task.progress}%</div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
