import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { Task, UserRole, TaskChecklist, TaskChecklistItem, TaskComment } from '../../types';
import { StatusBadge } from '../common/StatusBadge';
import { 
  Calendar, 
  FileText, 
  CheckCircle2, 
  Plus
} from '../icons';
import { 
  GitBranch, 
  CornerDownRight, 
  Shield, 
  User, 
  ExternalLink, 
  Paperclip, 
  AlertCircle, 
  Clock, 
  Send, 
  RotateCcw, 
  CheckCircle, 
  Edit3, 
  Trash2,
  Flame,
  MessageSquare,
  Video,
  UserPlus,
  Search,
  MoreHorizontal,
  Smile,
  Mic,
  Play,
  Pause,
  Eye,
  CheckSquare,
  Bell,
  Layers,
  Repeat,
  Timer,
  ChevronDown,
  ChevronUp,
  X
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';

interface TaskDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: Task | null;
  onOpenSubmitModal: (task: Task) => void;
  onOpenVerifyModal: (task: Task) => void;
  onOpenAssignModal: (parentTask?: { id: string; title: string }) => void;
  onSelectSubtask?: (taskId: string) => void;
  onSelectDocument?: (docId: string) => void;
}

export const TaskDetailModal: React.FC<TaskDetailModalProps> = ({
  isOpen,
  onClose,
  task,
  onOpenSubmitModal,
  onOpenVerifyModal,
  onOpenAssignModal,
  onSelectSubtask,
  onSelectDocument,
}) => {
  const { user, role, baseRole, isFullAccessAdmin } = useAuth();
  const { tasks: allTasks, teamMembers, updateTask, deleteTask, logTimeAction } = useData();
  const [isDeleting, setIsDeleting] = useState(false);
  const [isStartingTimer, setIsStartingTimer] = useState(false);

  // Chat message input state
  const [chatInput, setChatInput] = useState('');
  
  // Checklists local state
  const [checklists, setChecklists] = useState<TaskChecklist[]>([]);
  const [newChecklistTitle, setNewChecklistTitle] = useState('');
  const [isAddingChecklist, setIsAddingChecklist] = useState(false);
  const [newItemText, setNewItemText] = useState<{ [checklistId: string]: string }>({});
  const [activeInputChecklistId, setActiveInputChecklistId] = useState<string | null>(null);

  // Initialize checklists and default seed if empty
  useEffect(() => {
    if (!task) return;
    if (task.checklists && task.checklists.length > 0) {
      setChecklists(task.checklists);
    } else {
      // Create rich initial checklists based on the task
      const assigneeName = task.assignedToName || 'Developer';
      const initial: TaskChecklist[] = [
        {
          id: `chk-${Date.now()}-1`,
          title: `Checklist #1 - ${assigneeName.split(' ')[0]}`,
          items: [
            { id: `item-1`, title: `Review task specifications & verify acceptance criteria`, isCompleted: task.status !== 'Open' },
            { id: `item-2`, title: `Implement core functionality and unit test coverage`, isCompleted: task.status === 'In Progress' || task.status === 'Submitted' || task.status === 'Verified' },
            { id: `item-3`, title: `Conduct security & code-quality validation`, isCompleted: task.status === 'Submitted' || task.status === 'Verified' },
          ],
        },
      ];
      setChecklists(initial);
    }
  }, [task?.id, task?.status]);

  if (!task) return null;

  // Subtasks hierarchy check
  const subtasks = allTasks.filter((t) => t.parentTaskId === task.id);
  const completedSubtasks = subtasks.filter((t) => t.status === 'Verified');
  const hasSubtasks = subtasks.length > 0;

  // Parent task if this is a subtask
  const parentTask = task.parentTaskId ? allTasks.find((t) => t.id === task.parentTaskId) : null;

  // Permissions & Role Context
  const isExecutive = ['CEO', 'MD', 'COO', 'CTO', 'CIO'].includes(baseRole || user?.role || '');
  const isPM = role === 'PM' || baseRole === 'PM' || isFullAccessAdmin;
  const isTL = role === 'TL' || baseRole === 'TL';

  const isAssignee =
    user?.id === task.assignedTo ||
    (Boolean(task.assignedToName && user?.fullName) &&
      task.assignedToName.toLowerCase() === user?.fullName?.toLowerCase()) ||
    (Boolean(user?.email && task.assignedTo) &&
      task.assignedTo.toLowerCase() === user.email.toLowerCase()) ||
    (Boolean(user?.email && task.assignedToName) &&
      task.assignedToName.toLowerCase().includes(user.email.split('@')[0].toLowerCase()));

  const isAssignerOrSupervisor =
    user?.id === task.assignedBy ||
    (Boolean(task.assignedByName && user?.fullName) &&
      task.assignedByName.toLowerCase() === user?.fullName?.toLowerCase()) ||
    isFullAccessAdmin ||
    isPM ||
    (isTL && (task.assignedByRole === 'TL' || task.assignedToRole === 'Employee'));

  const canDelegateSubtasks = isFullAccessAdmin || isPM || isTL;
  const canDelete = isFullAccessAdmin || isPM || user?.id === task.assignedBy;

  // Checklist handlers
  const handleToggleItem = async (checklistId: string, itemId: string) => {
    const updated = checklists.map((c) => {
      if (c.id !== checklistId) return c;
      return {
        ...c,
        items: c.items.map((it) => (it.id === itemId ? { ...it, isCompleted: !it.isCompleted } : it)),
      };
    });
    setChecklists(updated);
    await updateTask(task.id, { checklists: updated });
  };

  const handleAddItem = async (checklistId: string) => {
    const text = newItemText[checklistId]?.trim();
    if (!text) return;
    const updated = checklists.map((c) => {
      if (c.id !== checklistId) return c;
      return {
        ...c,
        items: [...c.items, { id: `item-${Date.now()}`, title: text, isCompleted: false }],
      };
    });
    setChecklists(updated);
    setNewItemText((prev) => ({ ...prev, [checklistId]: '' }));
    setActiveInputChecklistId(null);
    await updateTask(task.id, { checklists: updated });
  };

  const handleAddChecklist = async () => {
    if (!newChecklistTitle.trim()) return;
    const newChk: TaskChecklist = {
      id: `chk-${Date.now()}`,
      title: newChecklistTitle.trim(),
      items: [],
    };
    const updated = [...checklists, newChk];
    setChecklists(updated);
    setNewChecklistTitle('');
    setIsAddingChecklist(false);
    await updateTask(task.id, { checklists: updated });
  };

  // Chat message submit
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!chatInput.trim() || !user) return;

    const newComment: TaskComment = {
      id: `comment-${Date.now()}`,
      taskId: task.id,
      authorId: user.id,
      authorName: user.fullName || 'Team Member',
      authorRole: user.role || 'Employee',
      content: chatInput.trim(),
      createdAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      type: 'comment',
    };

    const existingComments = task.comments || [];
    const updatedComments = [...existingComments, newComment];

    setChatInput('');
    await updateTask(task.id, { comments: updatedComments });
  };

  // Timer Toggle
  const handleToggleTimer = async () => {
    setIsStartingTimer(true);
    try {
      const isCurrentlyActive = task.timeTracker?.isActive;
      if (isCurrentlyActive) {
        await logTimeAction(task.id, 'pause', 'User paused timer from task detail');
      } else {
        await logTimeAction(task.id, 'begin', 'User started working from task detail');
        if (task.status === 'Open') {
          await updateTask(task.id, { status: 'In Progress' });
        }
      }
    } catch (err) {
      console.error('Error toggling timer:', err);
    } finally {
      setIsStartingTimer(false);
    }
  };

  const handleDelete = async () => {
    if (window.confirm(`Are you sure you want to delete task "${task.title}"?`)) {
      setIsDeleting(true);
      try {
        await deleteTask(task.id);
        onClose();
      } catch (err) {
        console.error('Failed to delete task:', err);
      } finally {
        setIsDeleting(false);
      }
    }
  };

  // Compute total checklist progress
  const allItems = checklists.flatMap((c) => c.items);
  const completedItemsCount = allItems.filter((it) => it.isCompleted).length;
  const totalItemsCount = allItems.length;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title=""
      maxWidth="6xl"
    >
      <div className="-mt-6 -mx-6 text-slate-800 font-sans">
        {/* Split 2-Column Responsive Workspace */}
        <div className="grid grid-cols-1 lg:grid-cols-12 min-h-[640px] max-h-[82vh]">
          
          {/* ========================================================================= */}
          {/* LEFT COLUMN: Task Details, Interactive Checklists, Controls (7 cols)       */}
          {/* ========================================================================= */}
          <div className="lg:col-span-7 p-6 overflow-y-auto border-b lg:border-b-0 lg:border-r border-slate-200 space-y-5 bg-white flex flex-col justify-between">
            <div className="space-y-5">
              
              {/* Task Title Header with Priority & Options */}
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                      {task.title}
                    </h2>
                    {task.priority === 'High' && (
                      <span className="p-1 rounded-md bg-amber-50 text-amber-600 border border-amber-200/80 shadow-2xs" title="High Priority">
                        <Flame className="w-4 h-4 text-amber-500 fill-amber-500" />
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-400 font-medium">
                    <span>Task ID: <strong className="font-mono text-slate-600">{task.id}</strong></span>
                    <span>•</span>
                    <span className="text-blue-600 font-semibold">{task.projectName}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <StatusBadge status={task.status} size="sm" />
                </div>
              </div>

              {/* Task Description / Statement of Work */}
              {task.description && (
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 text-xs text-slate-700 whitespace-pre-wrap leading-relaxed">
                  {task.description}
                </div>
              )}

              {/* Checklists Section */}
              <div className="space-y-4">
                {checklists.map((checklist) => {
                  const completed = checklist.items.filter((it) => it.isCompleted).length;
                  const total = checklist.items.length;
                  const progressPct = total > 0 ? Math.round((completed / total) * 100) : 0;

                  return (
                    <div key={checklist.id} className="space-y-2">
                      {/* Checklist Header with Progress */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-blue-600" />
                          <span className="text-xs font-bold text-slate-800">{checklist.title}</span>
                          <span className="text-[11px] text-slate-400 font-medium">
                            Completed {completed} out of {total}
                          </span>
                        </div>
                      </div>

                      {/* Blue Progress Bar */}
                      <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-500 transition-all duration-300 rounded-full"
                          style={{ width: `${progressPct}%` }}
                        />
                      </div>

                      {/* Items List */}
                      <div className="space-y-1.5 pt-1">
                        {checklist.items.map((item) => (
                          <label
                            key={item.id}
                            className="flex items-start gap-2.5 p-1.5 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer text-xs group"
                          >
                            <input
                              type="checkbox"
                              checked={item.isCompleted}
                              onChange={() => handleToggleItem(checklist.id, item.id)}
                              className="mt-0.5 w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300 cursor-pointer"
                            />
                            <span className={`text-slate-700 select-none ${item.isCompleted ? 'line-through text-slate-400' : ''}`}>
                              {item.title}
                            </span>
                          </label>
                        ))}
                      </div>

                      {/* Add Item Inline */}
                      {activeInputChecklistId === checklist.id ? (
                        <div className="flex items-center gap-2 pt-1">
                          <input
                            type="text"
                            value={newItemText[checklist.id] || ''}
                            onChange={(e) => setNewItemText({ ...newItemText, [checklist.id]: e.target.value })}
                            onKeyDown={(e) => e.key === 'Enter' && handleAddItem(checklist.id)}
                            placeholder="Type checklist item and press Enter..."
                            className="flex-1 px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                            autoFocus
                          />
                          <button
                            type="button"
                            onClick={() => handleAddItem(checklist.id)}
                            className="px-2.5 py-1.5 text-xs font-bold text-white bg-blue-600 rounded-lg hover:bg-blue-700 cursor-pointer"
                          >
                            Add
                          </button>
                          <button
                            type="button"
                            onClick={() => setActiveInputChecklistId(null)}
                            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setActiveInputChecklistId(checklist.id)}
                          className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1 cursor-pointer pt-1"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Add item</span>
                        </button>
                      )}
                    </div>
                  );
                })}

                {/* Add New Checklist Form */}
                {isAddingChecklist ? (
                  <div className="flex items-center gap-2 p-2 bg-slate-50 rounded-xl border border-slate-200">
                    <input
                      type="text"
                      value={newChecklistTitle}
                      onChange={(e) => setNewChecklistTitle(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleAddChecklist()}
                      placeholder="Checklist title (e.g. Checklist #2 - Priya)"
                      className="flex-1 px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={handleAddChecklist}
                      className="px-3 py-1.5 text-xs font-bold text-white bg-blue-600 rounded-lg hover:bg-blue-700 cursor-pointer"
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsAddingChecklist(false)}
                      className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setIsAddingChecklist(true)}
                    className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1.5 cursor-pointer pt-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ New checklist</span>
                  </button>
                )}
              </div>

              {/* Delegated Subtasks for Team */}
              <div className="space-y-2.5 pt-3 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <GitBranch className="w-4 h-4 text-indigo-600" />
                    <span className="text-xs font-bold text-slate-800">
                      Delegated Subtasks ({subtasks.length})
                    </span>
                    <span className="text-[11px] text-slate-400 font-medium">
                      ({completedSubtasks.length} verified)
                    </span>
                  </div>

                  {canDelegateSubtasks && (
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onOpenAssignModal({
                          id: task.id,
                          title: task.title,
                          featureId: task.featureId || undefined,
                          featureName: task.featureName || undefined,
                        });
                      }}
                      className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 cursor-pointer bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200 shadow-2xs"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>+ Delegate Subtask</span>
                    </button>
                  )}
                </div>

                {subtasks.length > 0 ? (
                  <div className="space-y-2">
                    {subtasks.map((st) => (
                      <div
                        key={st.id}
                        onClick={() => {
                          if (onSelectSubtask) {
                            onClose();
                            onSelectSubtask(st.id);
                          }
                        }}
                        className="p-3 bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-200 flex items-center justify-between gap-3 cursor-pointer transition-colors text-xs"
                      >
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900">{st.title}</span>
                            <StatusBadge status={st.status} size="sm" />
                          </div>
                          <p className="text-[11px] text-slate-500">
                            Assigned to: <strong className="text-slate-700">{st.assignedToName}</strong> ({st.assignedToDesignation || 'Engineer'})
                          </p>
                        </div>

                        <div className="text-right text-[11px]">
                          <span className="text-slate-400 block">Due {st.dueDate}</span>
                          <span className="font-bold text-blue-700">{st.actualHours || 0}h logged</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-3 bg-slate-50/70 rounded-xl border border-dashed border-slate-200 text-center text-xs text-slate-400">
                    No subtasks delegated under this task yet. Click <strong>+ Delegate Subtask</strong> above to split this task among developers.
                  </div>
                )}
              </div>

              {/* Task Metadata Fields Section */}
              <div className="p-4 bg-slate-50/80 rounded-2xl border border-slate-200/90 space-y-2.5 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-2.5 gap-x-4">
                  {/* Task Owner */}
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 font-medium">Task owner:</span>
                    <div className="flex items-center gap-1.5">
                      <div className="w-5 h-5 rounded-full bg-slate-200 text-slate-700 font-bold text-[10px] flex items-center justify-center">
                        {task.assignedByName?.[0] || 'O'}
                      </div>
                      <span className="font-semibold text-slate-800">{task.assignedByName || 'Lead Assigner'}</span>
                    </div>
                  </div>

                  {/* Assignee */}
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 font-medium">Assignee:</span>
                    <div className="flex items-center gap-1.5">
                      <div className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 font-bold text-[10px] flex items-center justify-center">
                        {task.assignedToName?.[0] || 'A'}
                      </div>
                      <span className="font-semibold text-blue-900">{task.assignedToName || 'Unassigned'}</span>
                    </div>
                  </div>

                  {/* Deadline */}
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 font-medium">Deadline:</span>
                    <span className="font-semibold text-slate-700 flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      {task.dueDate || 'No deadline'}
                    </span>
                  </div>

                  {/* Status */}
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 font-medium">Status:</span>
                    <span className="font-semibold text-slate-800">{task.status}</span>
                  </div>

                  {/* Created Date */}
                  <div className="flex items-center justify-between sm:col-span-2">
                    <span className="text-slate-400 font-medium">Created:</span>
                    <span className="text-slate-600 font-mono">{task.createdAt} / ID: {task.id}</span>
                  </div>

                  {/* Observers */}
                  <div className="flex items-center justify-between sm:col-span-2 pt-1 border-t border-slate-200/60">
                    <span className="text-slate-400 font-medium">Observers:</span>
                    <div className="flex items-center gap-1.5">
                      <div className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 font-bold text-[10px] flex items-center justify-center">
                        {task.assignedByName?.[0] || 'M'}
                      </div>
                      <span className="font-medium text-slate-700">{task.assignedByName}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Pill Chips Row */}
              <div className="flex flex-wrap gap-1.5 text-[11px]">
                <button type="button" className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center gap-1 font-medium transition-colors cursor-pointer">
                  <span>[P] Task status summaries</span>
                </button>
                <button type="button" className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center gap-1 font-medium transition-colors cursor-pointer">
                  <Paperclip className="w-3 h-3 text-slate-500" />
                  <span>Files</span>
                </button>
                <button type="button" className="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 border border-blue-200 flex items-center gap-1 font-semibold transition-colors cursor-pointer">
                  <CheckSquare className="w-3 h-3 text-blue-600" />
                  <span>Checklists ({completedItemsCount}/{totalItemsCount})</span>
                </button>
                <button type="button" className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center gap-1 font-medium transition-colors cursor-pointer">
                  <Eye className="w-3 h-3 text-slate-500" />
                  <span>Observers</span>
                </button>
                <button type="button" className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center gap-1 font-medium transition-colors cursor-pointer">
                  <Bell className="w-3 h-3 text-slate-500" />
                  <span>Reminders</span>
                </button>
                <button type="button" className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center gap-1 font-medium transition-colors cursor-pointer">
                  <GitBranch className="w-3 h-3 text-slate-500" />
                  <span>Subtasks ({subtasks.length})</span>
                </button>
                <button type="button" className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center gap-1 font-medium transition-colors cursor-pointer">
                  <Timer className="w-3 h-3 text-slate-500" />
                  <span>Time tracking</span>
                </button>
              </div>

            </div>

            {/* Bottom Action Buttons Bar */}
            <div className="pt-4 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                {/* Start / Pause Timer Button */}
                <button
                  type="button"
                  disabled={isStartingTimer}
                  onClick={handleToggleTimer}
                  className={`px-4 py-2 rounded-xl text-xs font-bold text-white transition-all flex items-center gap-1.5 cursor-pointer shadow-xs ${
                    task.timeTracker?.isActive
                      ? 'bg-amber-600 hover:bg-amber-700 animate-pulse'
                      : 'bg-blue-600 hover:bg-blue-700'
                  }`}
                >
                  {task.timeTracker?.isActive ? (
                    <>
                      <Pause className="w-3.5 h-3.5 fill-white" />
                      <span>Pause Work</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-3.5 h-3.5 fill-white" />
                      <span>Start</span>
                    </>
                  )}
                </button>

                {/* Complete / Submit Action Button */}
                {(task.status === 'Open' || task.status === 'In Progress' || task.status === 'Reopened') && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenSubmitModal(task);
                    }}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 transition-colors cursor-pointer"
                  >
                    Complete
                  </button>
                )}

                {/* Supervisor Review / Verify */}
                {task.status === 'Submitted' && isAssignerOrSupervisor && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenVerifyModal(task);
                    }}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <CheckCircle className="w-3.5 h-3.5" />
                    <span>Verify Deliverable</span>
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                {canDelete && (
                  <button
                    type="button"
                    disabled={isDeleting}
                    onClick={handleDelete}
                    className="p-2 rounded-xl text-xs font-bold text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 transition-colors cursor-pointer"
                    title="Delete Task"
                  >
                    <Trash2 className="w-4 h-4 text-rose-600" />
                  </button>
                )}

                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>

          </div>

          {/* ========================================================================= */}
          {/* RIGHT COLUMN: Realtime Task Chat & Audit Activity Stream (5 cols)         */}
          {/* ========================================================================= */}
          <div className="lg:col-span-5 bg-gradient-to-b from-[#bde4f9]/30 via-[#d3eefc]/20 to-[#f0f9ff]/40 flex flex-col justify-between min-h-[500px]">
            
            {/* Chat Header */}
            <div className="p-4 border-b border-blue-100/80 bg-white/70 backdrop-blur-xs flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-blue-600" />
                <div>
                  <h3 className="text-xs font-bold text-slate-800">Task chat</h3>
                  <span className="text-[10px] text-slate-400 font-medium">2 members</span>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => alert('Starting video room collaboration...')}
                  className="px-2.5 py-1 rounded-lg text-xs font-bold text-white bg-blue-500 hover:bg-blue-600 flex items-center gap-1 shadow-2xs transition-colors cursor-pointer"
                >
                  <Video className="w-3.5 h-3.5 text-white" />
                  <span>Video call</span>
                </button>
                <button
                  type="button"
                  className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 transition-colors cursor-pointer"
                  title="Add members to task chat"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  <Search className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Activity Stream & Messages List */}
            <div className="flex-1 p-4 overflow-y-auto space-y-3.5 text-xs">
              
              {/* Date Stamp */}
              <div className="text-center my-2">
                <span className="px-3 py-1 bg-slate-800/20 backdrop-blur-md rounded-full text-[10px] font-bold text-slate-700 tracking-wider">
                  Today
                </span>
              </div>

              {/* Task Creation Event Card */}
              <div className="space-y-1">
                <p className="text-xs text-slate-600 font-medium">
                  <strong className="text-blue-900">{task.assignedByName || 'Manager'}</strong> created this task.
                </p>

                {/* Embedded Task Preview Card */}
                <div className="p-3 bg-white/90 backdrop-blur-xs rounded-xl border border-blue-200/80 shadow-2xs space-y-1.5">
                  <div className="flex items-center gap-1.5 font-bold text-blue-900 text-xs">
                    <User className="w-3.5 h-3.5 text-blue-600" />
                    <span>{task.title}</span>
                  </div>
                  <div className="space-y-0.5 text-[11px] text-slate-600">
                    <div className="grid grid-cols-3 gap-1">
                      <span className="text-slate-400 font-medium">Status:</span>
                      <span className="col-span-2 font-semibold text-slate-800">{task.status}</span>
                    </div>
                    <div className="grid grid-cols-3 gap-1">
                      <span className="text-slate-400 font-medium">Created by:</span>
                      <span className="col-span-2 font-semibold text-slate-800">{task.assignedByName}</span>
                    </div>
                    <div className="grid grid-cols-3 gap-1">
                      <span className="text-slate-400 font-medium">Assignee:</span>
                      <span className="col-span-2 font-semibold text-slate-800">{task.assignedToName}</span>
                    </div>
                    {task.description && (
                      <div className="grid grid-cols-3 gap-1 pt-1">
                        <span className="text-slate-400 font-medium">Description:</span>
                        <span className="col-span-2 text-slate-700 truncate">{task.description}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* System Audit Events */}
              <div className="space-y-1.5">
                <div className="p-2 bg-blue-50/70 rounded-lg border border-blue-200/50 text-[11px] text-slate-700">
                  <strong className="text-blue-900">{task.assignedByName}</strong> assigned this task to <strong className="text-slate-900">{task.assignedToName}</strong>.
                </div>

                {task.status === 'In Progress' && (
                  <div className="p-2 bg-amber-50/70 rounded-lg border border-amber-200/50 text-[11px] text-amber-900">
                    <strong className="text-amber-950">{task.assignedToName}</strong> started working on the task.
                  </div>
                )}

                {task.status === 'Submitted' && (
                  <div className="p-2 bg-indigo-50/70 rounded-lg border border-indigo-200/50 text-[11px] text-indigo-900">
                    <strong className="text-indigo-950">{task.assignedToName}</strong> completed the task and submitted it for review.
                  </div>
                )}

                {task.status === 'Verified' && (
                  <div className="p-2 bg-emerald-50/70 rounded-lg border border-emerald-200/50 text-[11px] text-emerald-900">
                    <strong className="text-emerald-950">{task.assignedByName || 'Lead'}</strong> verified and approved all deliverables.
                  </div>
                )}
              </div>

              {/* User Chat Comments */}
              {task.comments && task.comments.map((comment) => {
                const isMe = comment.authorId === user?.id;
                return (
                  <div key={comment.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} space-y-1`}>
                    <span className="text-[10px] text-slate-500 font-medium px-1">
                      {comment.authorName} • {comment.createdAt}
                    </span>
                    <div className={`p-2.5 rounded-2xl max-w-[85%] text-xs shadow-2xs ${
                      isMe 
                        ? 'bg-blue-600 text-white rounded-tr-xs' 
                        : 'bg-white text-slate-800 border border-slate-200/80 rounded-tl-xs'
                    }`}>
                      {comment.content}
                    </div>
                  </div>
                );
              })}

              {/* Seen By Footer */}
              <div className="pt-2 flex items-center justify-end text-[10px] text-slate-400 font-medium">
                <span>✓ Viewed by {user?.fullName || 'team'}</span>
              </div>
            </div>

            {/* Chat Input Bar */}
            <form onSubmit={handleSendMessage} className="p-3 bg-white border-t border-blue-100/80 flex items-center gap-2">
              <div className="relative flex-1 flex items-center bg-slate-50 rounded-xl border border-slate-200 focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500/30 transition-all">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Type @ or + to mention a person, a chat or AI"
                  className="w-full pl-3 pr-20 py-2 text-xs bg-transparent focus:outline-none font-sans placeholder-slate-400 text-slate-800"
                />

                {/* Toolbar Icons inside Input */}
                <div className="absolute right-2 flex items-center gap-1 text-slate-400">
                  <button type="button" className="p-1 hover:text-slate-600 rounded transition-colors cursor-pointer" title="Emoji">
                    <Smile className="w-3.5 h-3.5" />
                  </button>
                  <button type="button" className="p-1 hover:text-slate-600 rounded transition-colors cursor-pointer" title="Voice note">
                    <Mic className="w-3.5 h-3.5" />
                  </button>
                  <button type="button" className="p-1 hover:text-slate-600 rounded transition-colors cursor-pointer" title="Attach file">
                    <Paperclip className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={!chatInput.trim()}
                className="p-2.5 rounded-xl bg-blue-500 hover:bg-blue-600 disabled:opacity-40 disabled:hover:bg-blue-500 text-white transition-all shadow-xs cursor-pointer flex items-center justify-center shrink-0"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>

          </div>

        </div>
      </div>
    </Modal>
  );
};
