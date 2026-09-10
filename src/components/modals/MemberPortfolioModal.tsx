import React, { useState, useMemo } from 'react';
import { Modal } from '../common/Modal';
import { TeamMember, Task, ProjectDocument, AuditLog } from '../../types';
import { StatusBadge } from '../common/StatusBadge';
import { timeTrackingService } from '../../services/timeTrackingService';
import { exportService } from '../../services/exportService';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { 
  User, 
  Mail, 
  Briefcase, 
  Calendar, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  FileText, 
  Download, 
  Settings2, 
  ExternalLink,
  Zap,
  Coffee,
  GitBranch,
  ShieldCheck,
  Printer,
  Activity,
  Layers,
  Award
} from 'lucide-react';

interface MemberPortfolioModalProps {
  isOpen: boolean;
  onClose: () => void;
  member: TeamMember | null;
  tasks: Task[];
  projectName?: string;
  onOpenGovernance?: (member: TeamMember) => void;
  onSelectTask?: (taskId: string) => void;
}

export const MemberPortfolioModal: React.FC<MemberPortfolioModalProps> = ({
  isOpen,
  onClose,
  member,
  tasks,
  projectName = 'UNAI Project',
  onOpenGovernance,
  onSelectTask,
}) => {
  const { user, isFullAccessAdmin, documentBranding } = useAuth();
  const { documents, auditLogs } = useData();

  const [activeTab, setActiveTab] = useState<'direct' | 'delegated' | 'documents' | 'activity'>('direct');
  const [timeFilter, setTimeFilter] = useState<'all' | 'sprint' | 'week' | 'month'>('all');
  const [isExporting, setIsExporting] = useState(false);

  // Helper for strict exact identity comparison
  const isExactMember = (
    targetId?: string | null,
    targetName?: string | null,
    targetEmail?: string | null
  ): boolean => {
    if (!member) return false;
    if (targetId && member.id && targetId === member.id) return true;
    if (targetEmail && member.email && targetEmail.trim().toLowerCase() === member.email.trim().toLowerCase()) return true;
    if (targetName && member.name && targetName.trim().toLowerCase() === member.name.trim().toLowerCase()) return true;
    return false;
  };

  // 1. Match Direct Tasks (exact assignee match only)
  const directTasks = useMemo(() => {
    if (!member) return [];
    return tasks.filter((t) => isExactMember(t.assignedTo, t.assignedToName, t.assignedTo));
  }, [member, tasks]);

  // 2. Match Delegated / Supervised Tasks (exact assigner match, not assigned to self)
  const delegatedTasks = useMemo(() => {
    if (!member) return [];
    return tasks.filter((t) => {
      const isAssignedBy = isExactMember(t.assignedBy, t.assignedByName, t.assignedBy);
      const isAssignedTo = isExactMember(t.assignedTo, t.assignedToName, t.assignedTo);
      return isAssignedBy && !isAssignedTo;
    });
  }, [member, tasks]);

  // 3. Match Documents strictly authored or edited by this specific member
  const memberDocuments = useMemo(() => {
    if (!member) return [];
    return documents.filter((d) => {
      const isOwner = isExactMember(d.ownerId, d.ownerName);
      const hasHistory =
        d.history &&
        d.history.some((h) => isExactMember(undefined, h.author));

      return isOwner || hasHistory;
    });
  }, [member, documents]);

  // 4. Match App Activity & Mutation Logs strictly for this actor
  const memberAuditLogs = useMemo(() => {
    if (!member) return [];
    return (auditLogs || []).filter((log) =>
      isExactMember(log.actorId, log.actorName)
    );
  }, [member, auditLogs]);

  // Combine tasks according to active tab
  const activeTaskList = activeTab === 'delegated' ? delegatedTasks : directTasks;

  if (!member) return null;

  // Work & Timing Metrics
  const totalDirectWorkM = directTasks.reduce(
    (sum, t) => sum + (t.timeTracker?.totalWorkMinutes ?? Math.round((t.actualHours || 0) * 60)),
    0
  );
  const totalDelegatedWorkM = delegatedTasks.reduce(
    (sum, t) => sum + (t.timeTracker?.totalWorkMinutes ?? Math.round((t.actualHours || 0) * 60)),
    0
  );
  const totalBreakM = [...directTasks, ...delegatedTasks].reduce(
    (sum, t) => sum + (t.timeTracker?.totalBreakMinutes ?? 0),
    0
  );
  const verifiedCount = directTasks.filter((t) => t.status === 'Verified').length;
  const performancePoints =
    verifiedCount * 5 +
    Math.round(totalDirectWorkM / 60) +
    memberDocuments.length * 10 +
    delegatedTasks.length * 2;

  const scopeLabel = 
    timeFilter === 'all' ? `Entire Project Scope (${projectName})` :
    timeFilter === 'sprint' ? 'Current Sprint Scope (Sprint 1)' :
    timeFilter === 'week' ? 'Past 7 Days Work' : 'Past 30 Days Work';

  const handleDownloadPdf = async () => {
    setIsExporting(true);
    try {
      await exportService.exportMemberPortfolioPdf(
        member,
        directTasks.length > 0 ? directTasks : delegatedTasks,
        scopeLabel,
        documentBranding,
        user?.organizationName,
        user?.organizationLogo,
        memberDocuments,
        memberAuditLogs
      );
    } catch (err) {
      console.error('Error generating member report:', err);
    } finally {
      setIsExporting(false);
    }
  };

  const cachedAvatar = member.email ? localStorage.getItem(`unai_user_avatar_${member.email.toLowerCase()}`) : null;
  const memberAvatar =
    cachedAvatar ||
    (member.avatar && !member.avatar.includes('avataaars') ? member.avatar : null) ||
    `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(member.name)}&backgroundColor=0d82ff,00d1ff,6366f1`;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`${member.name} — Work Portfolio & Performance`}
      subtitle={`Project Member Profile • ${projectName}`}
      maxWidth="6xl"
    >
      <div className="space-y-5 text-slate-800">
        {/* Top Member Profile Banner (CLEAN LIGHT THEME) */}
        <div className="p-4.5 bg-gradient-to-r from-blue-50/80 via-slate-50 to-indigo-50/80 border border-blue-200/80 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-2xs">
          <div className="flex items-center gap-3.5">
            <img
              src={memberAvatar}
              alt={member.name}
              className="w-14 h-14 rounded-2xl border-2 border-blue-200 object-cover shadow-2xs bg-white shrink-0"
            />
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black text-slate-900 tracking-tight">{member.name}</h3>
                <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 border border-blue-300">
                  {member.role}
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                  {member.accessLevel}
                </span>
              </div>
              <p className="text-xs text-blue-800 font-bold">
                {member.designation} • <span className="text-slate-500 font-medium">{member.department || 'Engineering'}</span>
              </p>
              <p className="text-[11px] text-slate-400 font-mono">{member.email}</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 self-start md:self-auto">
            {isFullAccessAdmin && onOpenGovernance && (
              <button
                type="button"
                onClick={() => onOpenGovernance(member)}
                className="px-3.5 py-2 bg-white hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border border-slate-200 shadow-2xs"
              >
                <Settings2 className="w-3.5 h-3.5 text-blue-600" />
                <span>Governance & Role</span>
              </button>
            )}

            <button
              type="button"
              disabled={isExporting}
              onClick={handleDownloadPdf}
              className="px-4 py-2 bg-gradient-to-r from-[#0d82ff] to-[#00d1ff] hover:from-[#0065ff] hover:to-[#00bce8] text-white font-black rounded-xl text-xs shadow-md transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Printer className="w-3.5 h-3.5 text-white" />
              <span>{isExporting ? 'Generating Report...' : 'Download Full Work PDF'}</span>
            </button>
          </div>
        </div>

        {/* KPI Metrics Dashboard Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-[10px] font-bold uppercase tracking-wider">Logged Work Time</span>
              <Clock className="w-3.5 h-3.5 text-blue-600" />
            </div>
            <span className="text-lg font-black text-blue-700 mt-1 block">
              {timeTrackingService.formatDuration(totalDirectWorkM + totalDelegatedWorkM)}
            </span>
            <span className="text-[10px] text-slate-400">
              {directTasks.length} direct, {delegatedTasks.length} delegated
            </span>
          </div>

          <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-[10px] font-bold uppercase tracking-wider">Breaks & Delays</span>
              <Coffee className="w-3.5 h-3.5 text-amber-500" />
            </div>
            <span className="text-lg font-black text-amber-600 mt-1 block">
              {timeTrackingService.formatDuration(totalBreakM)}
            </span>
            <span className="text-[10px] text-slate-400">Downtime logged</span>
          </div>

          <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-[10px] font-bold uppercase tracking-wider">Direct / Delegated Tasks</span>
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            </div>
            <span className="text-lg font-black text-emerald-700 mt-1 block">
              {directTasks.length} / {delegatedTasks.length}
            </span>
            <span className="text-[10px] text-slate-400">
              {verifiedCount} verified deliverables
            </span>
          </div>

          <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-[10px] font-bold uppercase tracking-wider">Performance Points</span>
              <Zap className="w-3.5 h-3.5 text-indigo-600" />
            </div>
            <span className="text-lg font-black text-indigo-700 mt-1 block">
              {performancePoints} pts
            </span>
            <span className="text-[10px] text-slate-400">{memberDocuments.length} docs authored</span>
          </div>
        </div>

        {/* Work Activity Category Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-2">
          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs">
            <button
              onClick={() => setActiveTab('direct')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'direct'
                  ? 'bg-white text-blue-600 shadow-xs border border-slate-200/80'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Direct Tasks ({directTasks.length})
            </button>

            <button
              onClick={() => setActiveTab('delegated')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'delegated'
                  ? 'bg-white text-blue-600 shadow-xs border border-slate-200/80'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Supervised & Delegated ({delegatedTasks.length})
            </button>

            <button
              onClick={() => setActiveTab('documents')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'documents'
                  ? 'bg-white text-blue-600 shadow-xs border border-slate-200/80'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Documents Authored ({memberDocuments.length})
            </button>

            <button
              onClick={() => setActiveTab('activity')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'activity'
                  ? 'bg-white text-blue-600 shadow-xs border border-slate-200/80'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              System Activity Logs ({memberAuditLogs.length})
            </button>
          </div>

          <div className="flex items-center gap-1 text-xs text-slate-500 font-semibold">
            <span>Scope:</span>
            <strong className="text-slate-800">{currentProjectName(projectName)}</strong>
          </div>
        </div>

        {/* Content Workspace Based on Active Tab */}
        {activeTab === 'direct' || activeTab === 'delegated' ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* Left Column (7 cols): Task List */}
            <div className="lg:col-span-7 space-y-3">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <GitBranch className="w-3.5 h-3.5 text-indigo-600" />
                <span>
                  {activeTab === 'direct'
                    ? `Direct Tasks Assigned to ${member.name} (${directTasks.length})`
                    : `Tasks Delegated / Supervised by ${member.name} (${delegatedTasks.length})`}
                </span>
              </label>

              <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                {activeTaskList.length === 0 ? (
                  <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-xs text-slate-400">
                    No {activeTab} tasks recorded for {member.name}.
                  </div>
                ) : (
                  activeTaskList.map((t) => {
                    const workM = t.timeTracker?.totalWorkMinutes ?? Math.round((t.actualHours || 0) * 60);
                    const breakM = t.timeTracker?.totalBreakMinutes ?? 0;

                    return (
                      <div
                        key={t.id}
                        onClick={() => onSelectTask && onSelectTask(t.id)}
                        className="p-3 bg-white rounded-xl border border-slate-200 hover:border-blue-300 hover:shadow-xs transition-all cursor-pointer space-y-2 group"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="space-y-0.5 flex-1">
                            <h4 className="text-xs font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                              {t.title}
                            </h4>
                            {t.featureName && (
                              <span className="text-[10px] text-indigo-600 font-semibold block">
                                Module: {t.featureName}
                              </span>
                            )}
                            {t.description && (
                              <p className="text-[11px] text-slate-500 line-clamp-1 leading-relaxed font-normal">
                                {t.description}
                              </p>
                            )}
                          </div>
                          <StatusBadge status={t.status} size="sm" />
                        </div>

                        <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] pt-1.5 border-t border-slate-100 text-slate-500">
                          <div className="flex items-center gap-3">
                            <span>
                              Assignee: <strong className="text-slate-700">{t.assignedToName || 'Developer'}</strong>
                            </span>
                            <span>•</span>
                            <span>
                              Lead: <strong className="text-slate-700">{t.assignedByName || 'Lead'}</strong>
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="text-blue-700 font-bold bg-blue-50 px-1.5 py-0.5 rounded">
                              ⏱ {timeTrackingService.formatDuration(workM)}
                            </span>
                            {breakM > 0 && (
                              <span className="text-amber-700 font-bold bg-amber-50 px-1.5 py-0.5 rounded">
                                ☕ {timeTrackingService.formatDuration(breakM)}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Right Column (5 cols): Deliverables & Remarks Log */}
            <div className="lg:col-span-5 space-y-3">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-blue-600" />
                <span>Deliverables & Verification Log</span>
              </label>

              <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
                {activeTaskList.filter((t) => t.submission || (t.statusLogs && t.statusLogs.length > 0)).length === 0 ? (
                  <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-xs text-slate-400">
                    No deliverable submissions or audit logs recorded yet.
                  </div>
                ) : (
                  activeTaskList
                    .filter((t) => t.submission || (t.statusLogs && t.statusLogs.length > 0))
                    .map((t) => (
                      <div key={t.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-2">
                        <div className="flex items-center justify-between">
                          <strong className="text-slate-900 truncate max-w-[200px]">{t.title}</strong>
                          <span className="text-[10px] text-slate-400 font-semibold">{t.dueDate}</span>
                        </div>

                        {t.submission?.notes && (
                          <div className="p-2 bg-white rounded-lg border border-slate-200 text-slate-700 italic text-[11px]">
                            "{t.submission.notes}"
                          </div>
                        )}

                        {t.submission?.fileUrls && t.submission.fileUrls.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {t.submission.fileUrls.map((f, i) => (
                              <span key={i} className="text-[10px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded font-medium border border-blue-200">
                                📎 {f}
                              </span>
                            ))}
                          </div>
                        )}

                        {t.statusLogs && t.statusLogs.length > 0 && (
                          <div className="pt-1 border-t border-slate-200 space-y-1">
                            <span className="text-[10px] font-bold text-slate-400 uppercase">Supervisor Remarks:</span>
                            <p className="text-[11px] font-semibold text-indigo-900 bg-indigo-50/60 p-1.5 rounded border border-indigo-100">
                              {t.statusLogs[t.statusLogs.length - 1].remarks || 'Verified & approved'}
                            </p>
                          </div>
                        )}
                      </div>
                    ))
                )}
              </div>
            </div>
          </div>
        ) : activeTab === 'documents' ? (
          /* TAB 3: DOCUMENTS AUTHORED & FILLED */
          <div className="space-y-3">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-blue-600" />
              <span>Standard Governance Documents Authored & Filled ({memberDocuments.length})</span>
            </label>

            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Document Name</th>
                    <th className="py-3 px-4">Project & Phase</th>
                    <th className="py-3 px-4">Version</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Last Updated</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {memberDocuments.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-400">
                        No standard documents authored or edited by {member.name}.
                      </td>
                    </tr>
                  ) : (
                    memberDocuments.map((doc) => (
                      <tr key={doc.id} className="hover:bg-blue-50/40 transition-colors">
                        <td className="py-3 px-4 font-bold text-slate-900">{doc.name}</td>
                        <td className="py-3 px-4 text-slate-600">{doc.projectName} ({doc.phase})</td>
                        <td className="py-3 px-4 font-mono font-semibold">v{doc.version || '1.0'}</td>
                        <td className="py-3 px-4">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                            doc.status === 'Approved'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-blue-50 text-blue-700 border-blue-200'
                          }`}>
                            {doc.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-500">{doc.lastUpdated || doc.createdAt}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          /* TAB 4: SYSTEM MUTATION ACTIVITY & AUDIT LOGS */
          <div className="space-y-3">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-blue-600" />
              <span>Recent Activity & Platform Actions ({memberAuditLogs.length})</span>
            </label>

            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs max-h-80 overflow-y-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider sticky top-0 bg-white">
                  <tr>
                    <th className="py-3 px-4">Timestamp</th>
                    <th className="py-3 px-4">Action</th>
                    <th className="py-3 px-4">Entity</th>
                    <th className="py-3 px-4">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {memberAuditLogs.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-slate-400">
                        No activity records found for this member.
                      </td>
                    </tr>
                  ) : (
                    memberAuditLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-2.5 px-4 font-mono text-[11px] text-slate-500">{log.timestamp}</td>
                        <td className="py-2.5 px-4 font-bold text-slate-800">{log.action}</td>
                        <td className="py-2.5 px-4 text-slate-600">
                          <span className="bg-slate-100 px-2 py-0.5 rounded text-[10px] font-semibold">
                            {log.entityType}
                          </span>
                        </td>
                        <td className="py-2.5 px-4 text-slate-600 text-[11px]">{log.details}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Modal Action Bar */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-200">
          <span className="text-xs text-slate-500 font-medium">
            Project Scope: <strong className="text-slate-800">{projectName}</strong>
          </span>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              Close
            </button>
            <button
              type="button"
              disabled={isExporting}
              onClick={handleDownloadPdf}
              className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-sm transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{isExporting ? 'Exporting...' : 'Export Work Summary'}</span>
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
};

function currentProjectName(name?: string) {
  return name || 'All Organization Projects';
}
