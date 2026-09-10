import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { Task } from '../../types';
import { FileText } from '../icons';
import { GitBranch, CheckCircle2, AlertTriangle, ShieldCheck } from 'lucide-react';
import { useData } from '../../context/DataContext';

interface TaskSubmissionModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: Task | null;
  onSubmit: (taskId: string, submission: { notes: string; files: string[]; urls: string[] }) => void;
}

export const TaskSubmissionModal: React.FC<TaskSubmissionModalProps> = ({
  isOpen,
  onClose,
  task,
  onSubmit,
}) => {
  const { tasks: allTasks } = useData();
  const [notes, setNotes] = useState('');
  const [files, setFiles] = useState<string[]>([]);
  const [urlInput, setUrlInput] = useState('');
  const [urls, setUrls] = useState<string[]>([]);

  // Synchronize state when modal opens for a specific task
  React.useEffect(() => {
    if (task) {
      if (task.submission) {
        setNotes(task.submission.notes || '');
        setFiles(task.submission.fileUrls || []);
        setUrls(task.submission.referenceUrls || []);
      } else {
        setNotes('');
        setFiles([]);
        setUrls([]);
      }
    }
  }, [task?.id, isOpen]);

  if (!task) return null;

  const supervisorTitle = 
    task.assignedByRole === 'CTO' ? 'CTO' :
    task.assignedByRole === 'PM' ? 'Project Manager' :
    task.assignedByRole === 'TL' ? 'Tech Lead' :
    task.assignedByName || 'Supervisor';

  // Subtask hierarchy rollup checks
  const subtasks = allTasks.filter((t) => t.parentTaskId === task.id);
  const pendingSubtasks = subtasks.filter((t) => t.status !== 'Verified');
  const hasSubtasks = subtasks.length > 0;
  const isBlocked = hasSubtasks && pendingSubtasks.length > 0;

  const handleAddUrl = () => {
    if (urlInput.trim()) {
      setUrls([...urls, urlInput.trim()]);
      setUrlInput('');
    }
  };

  const handleRemoveFile = (idx: number) => {
    setFiles(files.filter((_, i) => i !== idx));
  };

  const handleRemoveUrl = (idx: number) => {
    setUrls(urls.filter((_, i) => i !== idx));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isBlocked) return;

    // Roll up all deliverables and notes from completed subtasks if present
    const rolledUpFiles = [...files];
    subtasks.forEach((st) => {
      if (st.submission?.fileUrls) {
        rolledUpFiles.push(...st.submission.fileUrls);
      }
    });

    const rolledUpNotes = hasSubtasks
      ? `${notes}\n\n[Subtasks Rollup: ${subtasks.length} delegated subtasks completed by team]`
      : notes;

    onSubmit(task.id, {
      notes: rolledUpNotes,
      files: Array.from(new Set(rolledUpFiles)),
      urls,
    });
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Submit Task Deliverables"
      subtitle="Review deliverables and submit for executive sign-off"
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Task Metadata Box */}
        <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-1.5 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-slate-500 font-medium">Task:</span>
            <span className="font-bold text-slate-800">{task.title}</span>
          </div>
          {task.featureName && (
            <div className="flex items-center justify-between">
              <span className="text-slate-500 font-medium">Feature Module:</span>
              <span className="font-bold text-indigo-700">{task.featureName}</span>
            </div>
          )}
          <div className="flex items-center justify-between">
            <span className="text-slate-500 font-medium">Project:</span>
            <span className="font-semibold text-slate-700">{task.projectName}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-500 font-medium">Assigned To:</span>
            <span className="font-semibold text-indigo-700">{task.assignedToName} ({task.assignedToRole})</span>
          </div>
          {task.timeTracker && (
            <div className="flex items-center justify-between pt-1 border-t border-slate-200/60 text-[11px]">
              <span className="text-slate-500 font-medium">Logged Work Time:</span>
              <span className="font-bold text-blue-700">
                {Math.floor(task.timeTracker.totalWorkMinutes / 60)}h {task.timeTracker.totalWorkMinutes % 60}m (Breaks: {task.timeTracker.totalBreakMinutes}m)
              </span>
            </div>
          )}
        </div>

        {/* Delegated Subtasks Rollup Status */}
        {hasSubtasks && (
          <div className="space-y-2 p-3.5 rounded-xl bg-slate-50 border border-slate-200">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <GitBranch className="w-3.5 h-3.5 text-indigo-600" />
                <span>Delegated Subtasks ({subtasks.length - pendingSubtasks.length}/{subtasks.length} Completed)</span>
              </span>
            </div>

            <div className="space-y-1.5">
              {subtasks.map((st) => (
                <div
                  key={st.id}
                  className={`p-2 rounded-lg border flex items-center justify-between text-xs ${
                    st.status === 'Verified'
                      ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
                      : 'bg-amber-50/70 border-amber-200 text-amber-900'
                  }`}
                >
                  <div>
                    <span className="font-bold">{st.title}</span>
                    <span className="text-[10px] text-slate-500 block">
                      Assignee: {st.assignedToName} ({st.assignedToRole}) • Status: {st.status}
                    </span>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                    st.status === 'Verified' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                  }`}>
                    {st.status}
                  </span>
                </div>
              ))}
            </div>

            {isBlocked ? (
              <div className="p-2.5 rounded-lg bg-amber-100/70 border border-amber-300 text-amber-900 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>
                  <strong>Submission Blocked</strong>: All {pendingSubtasks.length} pending subtasks must be finished by TLs/Developers before this parent directive can be submitted to CTO.
                </span>
              </div>
            ) : (
              <div className="p-2 rounded-lg bg-emerald-100/70 border border-emerald-300 text-emerald-900 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>All delegated subtask outputs rolled up and ready for CTO submission.</span>
              </div>
            )}
          </div>
        )}

        {/* Comments / Notes */}
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
            Executive Summary / Notes *
          </label>
          <textarea
            required
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Brief overview of the work completed and any key highlights..."
            className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none"
          />
        </div>

        {/* Attachments Upload */}
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
            Deliverable Attachments
          </label>
          
          <div className="space-y-2 mb-2">
            {files.map((file, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-2 rounded-lg bg-blue-50/60 border border-blue-200 text-xs"
              >
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-blue-600" />
                  <span className="font-semibold text-blue-900">{file}</span>
                </div>
                <button
                  type="button"
                  onClick={() => handleRemoveFile(idx)}
                  className="text-rose-500 hover:text-rose-700 text-xs font-semibold px-2 py-0.5 cursor-pointer"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setFiles([...files, `Deliverable_v${files.length + 1}.docx`])}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 text-xs font-medium rounded-lg transition-colors cursor-pointer"
            >
              <span>+ Add Document Attachment</span>
            </button>
          </div>
        </div>

        {/* Reference URLs */}
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
            Reference / Cloud URLs (Figma, GitHub, Notion)
          </label>
          <div className="flex items-center gap-2 mb-2">
            <input
              type="url"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              placeholder="https://github.com/... or https://figma.com/..."
              className="flex-1 px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="button"
              onClick={handleAddUrl}
              className="px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
            >
              Add Link
            </button>
          </div>

          {urls.map((url, idx) => (
            <div key={idx} className="flex items-center justify-between text-[11px] text-slate-600 bg-slate-50 p-1.5 rounded mb-1 border border-slate-200">
              <span className="truncate max-w-[280px]">{url}</span>
              <button
                type="button"
                onClick={() => handleRemoveUrl(idx)}
                className="text-slate-400 hover:text-rose-500 font-bold cursor-pointer"
              >
                Delete
              </button>
            </div>
          ))}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isBlocked}
            className={`px-5 py-2.5 text-xs font-bold text-white rounded-xl shadow-xs transition-all flex items-center gap-2 ${
              isBlocked
                ? 'bg-slate-400 cursor-not-allowed opacity-70'
                : 'bg-gradient-to-r from-[#0d82ff] to-[#00d1ff] hover:from-[#0065ff] hover:to-[#00bce8] cursor-pointer transform hover:-translate-y-0.5'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>{isBlocked ? `Cannot Submit (${pendingSubtasks.length} Subtasks Pending)` : `Submit Work to ${supervisorTitle}`}</span>
          </button>
        </div>
      </form>
    </Modal>
  );
};
