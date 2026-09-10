import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { Task } from '../../types';
import { CheckCircle2, FileText, Download } from '../icons';

interface TaskVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: Task | null;
  onVerify: (taskId: string, approved: boolean, remarks: string) => void;
}

export const TaskVerificationModal: React.FC<TaskVerificationModalProps> = ({
  isOpen,
  onClose,
  task,
  onVerify,
}) => {
  const [remarks, setRemarks] = useState('Looks good. Scope approved.');
  const [actionVerdict, setActionVerdict] = useState<'Approve' | 'Reopen'>('Approve');

  if (!task) return null;

  const handleApprove = () => {
    onVerify(task.id, true, remarks || 'Verified and approved by Tech Lead.');
    onClose();
  };

  const handleReopen = () => {
    if (!remarks.trim()) {
      alert('Please provide feedback/reasons for reopening this task.');
      return;
    }
    onVerify(task.id, false, remarks);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Verify Task Submission"
      subtitle="Review deliverables submitted by employee and sign off on completion"
      maxWidth="md"
    >
      <div className="space-y-4">
        {/* Task Details Review Card */}
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2 text-xs">
          <div className="flex items-center justify-between pb-2 border-b border-slate-200">
            <span className="text-slate-500 font-medium">Task:</span>
            <span className="font-bold text-slate-900">{task.title}</span>
          </div>

          {task.featureName && (
            <div className="flex items-center justify-between">
              <span className="text-slate-500 font-medium">Feature Module:</span>
              <span className="font-bold text-indigo-700">{task.featureName}</span>
            </div>
          )}

          <div className="flex items-center justify-between">
            <span className="text-slate-500 font-medium">Submitted By:</span>
            <span className="font-semibold text-slate-800">
              {task.submission?.submittedByName || task.assignedToName}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-slate-500 font-medium">Submitted On:</span>
            <span className="font-semibold text-slate-800">
              {task.submission?.submittedAt || 'Today'}
            </span>
          </div>

          {task.timeTracker && (
            <div className="flex items-center justify-between pt-1 border-t border-slate-200 text-[11px]">
              <span className="text-slate-500 font-medium">Logged Work Duration:</span>
              <span className="font-bold text-blue-700">
                {Math.floor(task.timeTracker.totalWorkMinutes / 60)}h {task.timeTracker.totalWorkMinutes % 60}m (Breaks: {task.timeTracker.totalBreakMinutes}m)
              </span>
            </div>
          )}

          <div className="pt-2 border-t border-slate-200 space-y-1">
            <span className="text-slate-500 font-medium block">Submission Notes:</span>
            {task.submission?.notes ? (
              <p className="p-2.5 bg-white rounded-lg border border-slate-200 text-slate-800 font-medium leading-relaxed whitespace-pre-wrap">
                {task.submission.notes}
              </p>
            ) : (
              <p className="p-2.5 bg-white rounded-lg border border-slate-200 text-slate-400 italic">
                No submission notes provided.
              </p>
            )}
          </div>

          {/* Submission Attachments */}
          <div className="pt-2 border-t border-slate-200 space-y-1.5">
            <span className="text-slate-500 font-medium block">Submitted Deliverables:</span>
            {task.submission?.fileUrls && task.submission.fileUrls.length > 0 ? (
              <div className="space-y-1.5">
                {task.submission.fileUrls.map((fileName, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2.5 bg-white rounded-lg border border-blue-200">
                    <div className="flex items-center gap-2 overflow-hidden">
                      <FileText className="w-4 h-4 text-blue-600 shrink-0" />
                      <span className="font-semibold text-xs text-blue-900 truncate">
                        {fileName}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const blob = new Blob([`Deliverable: ${fileName}\nTask: ${task.title}\nSubmitted by: ${task.submission?.submittedByName || task.assignedToName}\nNotes: ${task.submission?.notes || 'No notes'}`], { type: 'text/plain;charset=utf-8' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = fileName.includes('.') ? fileName : `${fileName}.txt`;
                        a.click();
                        URL.revokeObjectURL(url);
                      }}
                      className="flex items-center gap-1 px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 text-[11px] font-bold rounded-lg border border-blue-200 transition-colors cursor-pointer shrink-0"
                    >
                      <Download className="w-3 h-3 text-blue-700" />
                      <span>Download</span>
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-slate-400 italic text-[11px] p-2 bg-white rounded-lg border border-slate-200">
                No file attachments uploaded with this submission.
              </p>
            )}

            {/* Reference URLs */}
            {task.submission?.referenceUrls && task.submission.referenceUrls.length > 0 && (
              <div className="pt-2 space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Reference Links / PRs</span>
                <div className="space-y-1">
                  {task.submission.referenceUrls.map((link, idx) => (
                    <a
                      key={idx}
                      href={link.startsWith('http') ? link : `https://${link}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-600 hover:underline block truncate font-medium p-1.5 bg-white rounded border border-slate-200"
                    >
                      🔗 {link}
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Verification Verdict Select */}
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
            Verification Action
          </label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setActionVerdict('Approve')}
              className={`flex items-center justify-center gap-2 p-2.5 rounded-xl border text-xs font-bold transition-all ${
                actionVerdict === 'Approve'
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-300 ring-2 ring-emerald-500/20'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Approve & Complete</span>
            </button>

            <button
              type="button"
              onClick={() => setActionVerdict('Reopen')}
              className={`flex items-center justify-center gap-2 p-2.5 rounded-xl border text-xs font-bold transition-all ${
                actionVerdict === 'Reopen'
                  ? 'bg-rose-50 text-rose-700 border-rose-300 ring-2 ring-rose-500/20'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              <span>Reject & Reopen</span>
            </button>
          </div>
        </div>

        {/* Feedback / Remarks */}
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
            Verification Remarks {actionVerdict === 'Reopen' ? '*' : '(Optional)'}
          </label>
          <textarea
            rows={2}
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            placeholder={
              actionVerdict === 'Reopen'
                ? 'Specify required revisions or what is missing...'
                : 'Optional approval notes...'
            }
            className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            Cancel
          </button>
          {actionVerdict === 'Approve' ? (
            <button
              type="button"
              onClick={handleApprove}
              className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm transition-all"
            >
              Confirm Approval
            </button>
          ) : (
            <button
              type="button"
              onClick={handleReopen}
              className="px-5 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-sm transition-all"
            >
              Reopen Task
            </button>
          )}
        </div>
      </div>
    </Modal>
  );
};
