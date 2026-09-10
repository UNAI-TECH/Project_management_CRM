import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { Task, TeamMember, ProjectDocument, UserRole } from '../../types';
import { Calendar, FileText, CheckCircle2, Plus } from '../icons';
import { useAuth } from '../../context/AuthContext';
import { 
  GitBranch, 
  UserCheck, 
  Shield, 
  Layers, 
  Clock, 
  Flame,
  Sparkles,
  Paperclip,
  AtSign,
  List,
  CheckSquare,
  Eye,
  Bell,
  MessageSquare,
  Video,
  Send,
  Smile,
  Mic,
  Tag,
  Repeat,
  Timer
} from 'lucide-react';

interface TaskAssignmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAssign: (newTask: Partial<Task>) => Promise<any> | void;
  defaultDocId?: string;
  defaultProjectId?: string;
  documents?: ProjectDocument[];
  teamMembers?: TeamMember[];
  parentTaskId?: string | null;
  parentTaskTitle?: string;
  featureId?: string | null;
  featureName?: string | null;
}

export const TaskAssignmentModal: React.FC<TaskAssignmentModalProps> = ({
  isOpen,
  onClose,
  onAssign,
  defaultDocId,
  defaultProjectId,
  documents = [],
  teamMembers = [],
  parentTaskId,
  parentTaskTitle,
  featureId,
  featureName,
}) => {
  const { user, isFullAccessAdmin } = useAuth();
  
  // Delegation hierarchy
  const callerRole = user?.role || 'CTO';
  const hierarchyLevel: 'CTO_TO_PM' | 'PM_TO_TL' | 'TL_TO_DEV' = 
    isFullAccessAdmin || callerRole === 'CTO'
      ? 'CTO_TO_PM'
      : callerRole === 'PM'
      ? 'PM_TO_TL'
      : 'TL_TO_DEV';

  const projectDocuments = React.useMemo(() => {
    if (defaultProjectId) {
      const matched = documents.filter((d) => d.projectId === defaultProjectId);
      if (matched.length > 0) return matched;
    }
    const firstProjId = documents[0]?.projectId;
    return firstProjId ? documents.filter((d) => d.projectId === firstProjId) : documents;
  }, [documents, defaultProjectId]);

  const eligibleAssignees = teamMembers.filter((m) => {
    if (user?.id && (m.id === user.id || (user.email && m.email?.toLowerCase() === user.email.toLowerCase()))) {
      return false;
    }
    if (['CEO', 'MD', 'COO', 'CTO', 'CIO'].includes(m.role)) {
      return false;
    }
    if (callerRole === 'PM') {
      return m.role === 'TL' || m.designation?.toLowerCase().includes('lead') || m.designation?.toLowerCase().includes('architect');
    }
    if (callerRole === 'TL') {
      return m.role === 'Employee' || (!['PM', 'TL'].includes(m.role));
    }
    return m.role === 'PM' || m.role === 'TL' || m.role === 'Employee';
  });

  const fallbackAssignees = eligibleAssignees.length > 0 
    ? eligibleAssignees 
    : teamMembers.filter(m => !['CEO', 'MD', 'COO', 'CTO', 'CIO'].includes(m.role) && m.id !== user?.id);

  const uniqueAssignees = React.useMemo(() => {
    const map = new Map<string, TeamMember>();
    fallbackAssignees.forEach((m) => {
      if (m.id && !map.has(m.id)) {
        map.set(m.id, m);
      }
    });
    return Array.from(map.values());
  }, [fallbackAssignees]);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [assignedToId, setAssignedToId] = useState(uniqueAssignees[0]?.id || '');
  const [docId, setDocId] = useState(defaultDocId || projectDocuments[0]?.id || '');
  const [dueDate, setDueDate] = useState(new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0]);
  const [estimatedHours, setEstimatedHours] = useState(8);
  const [isHighPriority, setIsHighPriority] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!title.trim() || isSubmitting) return;

    const assignedMember = teamMembers.find((m) => m.id === assignedToId) || fallbackAssignees.find((m) => m.id === assignedToId);
    const selectedDoc = projectDocuments.find((d) => d.id === (docId || defaultDocId)) || documents.find((d) => d.id === (docId || defaultDocId));

    setIsSubmitting(true);
    try {
      await onAssign({
        title,
        description,
        projectId: defaultProjectId || selectedDoc?.projectId,
        projectName: selectedDoc?.projectName || 'Project',
        docId: selectedDoc?.id,
        docName: selectedDoc?.name || 'Project Document',
        templateId: selectedDoc?.templateId || 1,
        assignedBy: user?.id || 'usr-cto',
        assignedByName: user?.fullName || 'Assigner',
        assignedByRole: user?.role || 'CTO',
        assignedTo: assignedMember?.id || assignedToId,
        assignedToName: assignedMember?.name || 'Assignee',
        assignedToRole: assignedMember?.role || 'Employee',
        assignedToDesignation: assignedMember?.designation || 'Software Engineer',
        priority: isHighPriority ? 'High' : 'Medium',
        dueDate: new Date(dueDate).toLocaleDateString('en-GB'),
        status: 'Open',
        progress: 0,
        parentTaskId: parentTaskId || null,
        featureId: featureId || null,
        featureName: featureName || null,
        taskType: parentTaskId || featureId ? 'subtask' : 'feature_task',
        hierarchyLevel,
        estimatedHours: Number(estimatedHours) || 8,
        actualHours: 0,
        checklists: [
          {
            id: `chk-${Date.now()}`,
            title: `Checklist #1 - ${assignedMember?.name?.split(' ')[0] || 'Task Scope'}`,
            items: [
              { id: `item-1`, title: 'Review specifications & acceptance criteria', isCompleted: false },
              { id: `item-2`, title: 'Implement feature workflow and REST logic', isCompleted: false },
              { id: `item-3`, title: 'Verify test results & submit deliverables', isCompleted: false }
            ]
          }
        ]
      });

      onClose();
    } catch (err: any) {
      console.error('Error assigning task:', err);
      alert(`Failed to assign task: ${err?.message || 'Database error'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title=""
      maxWidth="6xl"
    >
      <div className="-mt-6 -mx-6 text-slate-800 font-sans">
        <div className="grid grid-cols-1 lg:grid-cols-12 min-h-[580px] max-h-[82vh]">
          
          {/* ========================================================================= */}
          {/* LEFT COLUMN: Task Creation Form & Metadata Fields (7 cols)                */}
          {/* ========================================================================= */}
          <form onSubmit={handleSubmit} className="lg:col-span-7 p-6 overflow-y-auto border-b lg:border-b-0 lg:border-r border-slate-200 space-y-4 bg-white flex flex-col justify-between">
            <div className="space-y-4">
              
              {/* Task Name with Fire Priority Icon */}
              <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Task name"
                  className="flex-1 text-lg font-bold text-slate-900 focus:outline-none placeholder-slate-400"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setIsHighPriority(!isHighPriority)}
                  className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                    isHighPriority 
                      ? 'bg-amber-50 text-amber-600 border-amber-300 shadow-2xs' 
                      : 'bg-slate-50 text-slate-400 border-slate-200 hover:text-slate-600'
                  }`}
                  title="Toggle High Priority"
                >
                  <Flame className={`w-5 h-5 ${isHighPriority ? 'fill-amber-500 text-amber-500' : ''}`} />
                </button>
              </div>

              {/* Rich Description Textarea */}
              <div className="space-y-1.5">
                <textarea
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Description..."
                  className="w-full p-3 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none leading-relaxed"
                />

                {/* Toolbar */}
                <div className="flex items-center gap-3 text-slate-400 text-xs px-1">
                  <button type="button" className="p-1 hover:text-slate-600 rounded transition-colors cursor-pointer" title="Attach file">
                    <Paperclip className="w-3.5 h-3.5" />
                  </button>
                  <button type="button" className="p-1 hover:text-slate-600 rounded transition-colors cursor-pointer" title="Mention member">
                    <AtSign className="w-3.5 h-3.5" />
                  </button>
                  <button type="button" className="p-1 hover:text-slate-600 rounded transition-colors cursor-pointer" title="Bullet list">
                    <List className="w-3.5 h-3.5" />
                  </button>
                  <button type="button" className="px-2 py-0.5 rounded text-[11px] font-bold text-indigo-600 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 flex items-center gap-1 cursor-pointer">
                    <Sparkles className="w-3 h-3 text-indigo-600" />
                    <span>CoPilot</span>
                  </button>
                  <button type="button" className="px-2 py-0.5 rounded text-[11px] font-bold text-blue-600 bg-blue-50 border border-blue-200 hover:bg-blue-100 flex items-center gap-1 cursor-pointer">
                    <CheckSquare className="w-3 h-3 text-blue-600" />
                    <span>Checklist</span>
                  </button>
                </div>
              </div>

              {/* Metadata Fields Section */}
              <div className="p-4 bg-slate-50/90 rounded-2xl border border-slate-200 space-y-3 text-xs">
                
                {/* Task Owner */}
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 font-medium">Task owner:</span>
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-slate-200 text-slate-700 font-bold text-xs flex items-center justify-center">
                      {user?.fullName?.[0] || 'O'}
                    </div>
                    <span className="font-semibold text-slate-800">{user?.fullName || 'Project Leadership'}</span>
                  </div>
                </div>

                {/* Assignee Selection */}
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 font-medium">Assignee:</span>
                  <select
                    value={assignedToId}
                    onChange={(e) => setAssignedToId(e.target.value)}
                    className="px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 font-semibold text-blue-900 cursor-pointer"
                  >
                    {uniqueAssignees.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name} ({m.role} • {m.designation || 'Engineer'})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Deadline Picker */}
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 font-medium">Deadline:</span>
                  <div className="flex items-center gap-2">
                    <input
                      type="date"
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                      className="px-3 py-1 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium text-slate-800"
                    />
                  </div>
                </div>

                {/* Target Hours */}
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 font-medium">Target Hours:</span>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      min={1}
                      max={120}
                      value={estimatedHours}
                      onChange={(e) => setEstimatedHours(Number(e.target.value))}
                      className="w-16 px-2 py-1 text-xs bg-white border border-slate-200 rounded-lg text-center font-bold text-slate-800"
                    />
                    <span className="text-slate-500 font-medium">hrs</span>
                  </div>
                </div>
              </div>

              {/* Action Pills Row */}
              <div className="flex flex-wrap gap-1.5 text-[11px]">
                <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-600 font-medium cursor-pointer hover:bg-slate-200">
                  [P] Task status summaries
                </span>
                <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-600 font-medium cursor-pointer hover:bg-slate-200">
                  📎 Files
                </span>
                <span className="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 border border-blue-200 font-semibold cursor-pointer">
                  ☑ Checklists
                </span>
                <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-600 font-medium cursor-pointer hover:bg-slate-200">
                  👁 Observers
                </span>
                <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-600 font-medium cursor-pointer hover:bg-slate-200">
                  🔔 Reminders
                </span>
                <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-600 font-medium cursor-pointer hover:bg-slate-200">
                  ⑂ Subtasks
                </span>
                <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-600 font-medium cursor-pointer hover:bg-slate-200">
                  ⏱ Time tracking
                </span>
              </div>

            </div>

            {/* Bottom Action Buttons */}
            <div className="pt-4 border-t border-slate-200 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <button
                  type="submit"
                  disabled={isSubmitting || !title.trim()}
                  className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 transition-all shadow-xs cursor-pointer"
                >
                  {isSubmitting ? 'Creating...' : 'Create'}
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
              </div>

              <span className="text-[11px] font-bold text-blue-600 hover:text-blue-700 cursor-pointer">
                Templates ▾
              </span>
            </div>

          </form>

          {/* ========================================================================= */}
          {/* RIGHT COLUMN: Task Chat Preview / Collaboration Teaser (5 cols)           */}
          {/* ========================================================================= */}
          <div className="lg:col-span-5 bg-gradient-to-b from-[#bde4f9]/30 via-[#d3eefc]/20 to-[#f0f9ff]/40 flex flex-col justify-between p-6">
            
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-blue-100/80">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-blue-600" />
                <span className="text-xs font-bold text-slate-800">Task chat</span>
                <span className="text-[10px] text-slate-400 font-medium">1 member</span>
              </div>

              <button
                type="button"
                className="px-2.5 py-1 rounded-lg text-xs font-bold text-white bg-blue-500 hover:bg-blue-600 flex items-center gap-1 shadow-2xs transition-colors cursor-pointer"
              >
                <Video className="w-3.5 h-3.5 text-white" />
                <span>Video call</span>
              </button>
            </div>

            {/* Feature Teaser Card */}
            <div className="my-auto p-6 bg-white/90 backdrop-blur-xs rounded-2xl border border-blue-200/80 shadow-xs text-center space-y-4 max-w-sm mx-auto">
              <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center mx-auto">
                <MessageSquare className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h4 className="font-bold text-slate-900 text-sm">Task Collaboration & Activity</h4>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Upon creating this task, live activity tracking, video huddles, and timeline logging will be activated automatically.
                </p>
              </div>

              <div className="space-y-2 text-left text-xs text-slate-600 pt-2 border-t border-slate-100">
                <div className="flex items-center gap-2">
                  <Video className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                  <span>Call chat members instantly</span>
                </div>
                <div className="flex items-center gap-2">
                  <Paperclip className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                  <span>Share specifications and deliverables</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                  <span>Track real-time updates and time logs</span>
                </div>
              </div>
            </div>

            {/* Chat Input Placeholder */}
            <div className="p-3 bg-white rounded-xl border border-blue-100 flex items-center gap-2">
              <input
                type="text"
                disabled
                placeholder="Type @ or + to mention a person, a chat or AI"
                className="w-full text-xs bg-transparent focus:outline-none placeholder-slate-400 text-slate-400 cursor-not-allowed"
              />
              <button
                type="button"
                disabled
                className="p-2 rounded-lg bg-blue-400 text-white opacity-50 cursor-not-allowed"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>

          </div>

        </div>
      </div>
    </Modal>
  );
};
