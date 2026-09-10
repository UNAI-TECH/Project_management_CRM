import React, { useState, useMemo } from 'react';
import { DonutChart } from '../components/common/DonutChart';
import { 
  Download, 
  Filter, 
  Calendar, 
  Clock, 
  FileText, 
  CheckCircle2, 
  AlertCircle, 
  Layers, 
  User, 
  Zap, 
  Building,
  Printer
} from 'lucide-react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { timeTrackingService } from '../services/timeTrackingService';
import { StatusBadge } from '../components/common/StatusBadge';

export const ReportsScreen: React.FC = () => {
  const { projects, documents, tasks, teamMembers } = useData();
  const { user, documentBranding } = useAuth();

  const [reportTab, setReportTab] = useState<'project' | 'task' | 'document' | 'team'>('project');
  const [selectedProjectId, setSelectedProjectId] = useState<string>('all');
  const [isGenerating, setIsGenerating] = useState(false);

  // Filter items by selected project
  const filteredProjects = useMemo(() => {
    if (selectedProjectId === 'all') return projects;
    return projects.filter((p) => p.id === selectedProjectId);
  }, [projects, selectedProjectId]);

  const filteredTasks = useMemo(() => {
    if (selectedProjectId === 'all') return tasks;
    return tasks.filter((t) => t.projectId === selectedProjectId);
  }, [tasks, selectedProjectId]);

  const filteredDocs = useMemo(() => {
    if (selectedProjectId === 'all') return documents;
    return documents.filter((d) => d.projectId === selectedProjectId);
  }, [documents, selectedProjectId]);

  // Project Metrics
  const projectStats = useMemo(() => {
    const onTrack = filteredProjects.filter((p) => p.status === 'On Track').length;
    const atRisk = filteredProjects.filter((p) => p.status === 'At Risk').length;
    const delayed = filteredProjects.filter((p) => p.status === 'Delayed').length;
    const completed = filteredProjects.filter((p) => p.status === 'Completed').length;
    const planning = filteredProjects.filter((p) => p.status === 'Planning' || !p.status).length;

    return { onTrack, atRisk, delayed, completed, planning, total: filteredProjects.length };
  }, [filteredProjects]);

  const donutData = [
    { label: 'On Track', value: projectStats.onTrack || 1, color: '#10b981', hoverColor: '#059669' },
    { label: 'At Risk', value: projectStats.atRisk, color: '#f59e0b', hoverColor: '#d97706' },
    { label: 'Delayed', value: projectStats.delayed, color: '#ef4444', hoverColor: '#dc2626' },
    { label: 'Completed', value: projectStats.completed, color: '#2563eb', hoverColor: '#1d4ed8' },
  ];

  // Timing Metrics
  const totalWorkMinutes = filteredTasks.reduce(
    (sum, t) => sum + (t.timeTracker?.totalWorkMinutes ?? Math.round((t.actualHours || 0) * 60)),
    0
  );
  const totalBreakMinutes = filteredTasks.reduce(
    (sum, t) => sum + (t.timeTracker?.totalBreakMinutes ?? 0),
    0
  );
  const verifiedTasks = filteredTasks.filter((t) => t.status === 'Verified');
  const approvedDocs = filteredDocs.filter((d) => d.status === 'Approved');

  const handlePrintSummary = () => {
    setIsGenerating(true);
    window.print();
    setTimeout(() => setIsGenerating(false), 500);
  };

  return (
    <div className="space-y-6 pb-12 animate-fade-in font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight">
            Reports & Engineering Analytics
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Cross-project audit logs, document progress matrices, logged work hours, and team capacity
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handlePrintSummary}
            disabled={isGenerating}
            className="px-5 py-2.5 rounded-xl font-bold text-white text-xs bg-gradient-to-r from-[#0d82ff] to-[#00d1ff] hover:from-[#0065ff] hover:to-[#00bce8] shadow-[0_4px_18px_rgba(13,130,255,0.35)] transition-all flex items-center gap-2 cursor-pointer transform hover:-translate-y-0.5"
          >
            <Printer className="w-4 h-4 text-white" />
            <span>Print Analytics Summary</span>
          </button>
        </div>
      </div>

      {/* Filter Row */}
      <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-slate-600 font-semibold">
            <Filter className="w-3.5 h-3.5 text-blue-600" />
            <span>Project Scope:</span>
          </div>
          <select
            value={selectedProjectId}
            onChange={(e) => setSelectedProjectId(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-bold focus:outline-none cursor-pointer"
          >
            <option value="all">🏢 All Organization Projects</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                📁 {p.name}
              </option>
            ))}
          </select>
        </div>

        {/* Report Categories Tabs */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
          {(
            [
              { id: 'project', label: 'Project Status' },
              { id: 'task', label: 'Task Execution' },
              { id: 'document', label: 'Documents Filed' },
              { id: 'team', label: 'Team Performance' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setReportTab(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                reportTab === tab.id
                  ? 'bg-white text-blue-600 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Summary 4-Metric Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-bold uppercase tracking-wider">Logged Work Time</span>
            <Clock className="w-3.5 h-3.5 text-blue-600" />
          </div>
          <span className="text-xl font-black text-blue-700 mt-1 block">
            {timeTrackingService.formatDuration(totalWorkMinutes)}
          </span>
          <span className="text-[10px] text-slate-400">Across {filteredTasks.length} active tasks</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-bold uppercase tracking-wider">Breaks & Downtime</span>
            <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
          </div>
          <span className="text-xl font-black text-amber-600 mt-1 block">
            {timeTrackingService.formatDuration(totalBreakMinutes)}
          </span>
          <span className="text-[10px] text-slate-400">Total pauses recorded</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-bold uppercase tracking-wider">Tasks Verified</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
          </div>
          <span className="text-xl font-black text-emerald-700 mt-1 block">
            {verifiedTasks.length} / {filteredTasks.length}
          </span>
          <span className="text-[10px] text-slate-400">
            {filteredTasks.length > 0 ? Math.round((verifiedTasks.length / filteredTasks.length) * 100) : 0}% completion
          </span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-bold uppercase tracking-wider">Documents Approved</span>
            <FileText className="w-3.5 h-3.5 text-indigo-600" />
          </div>
          <span className="text-xl font-black text-indigo-700 mt-1 block">
            {approvedDocs.length} / {filteredDocs.length}
          </span>
          <span className="text-[10px] text-slate-400">Governance lifecycle documents</span>
        </div>
      </div>

      {/* Main Dynamic Report View */}
      {reportTab === 'project' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5 bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">Projects by Health Status</h3>
            <DonutChart data={donutData} totalLabel="Projects" />
          </div>

          <div className="lg:col-span-7 bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">Active Projects Progress</h3>
            <div className="space-y-2.5 max-h-80 overflow-y-auto">
              {filteredProjects.map((p) => {
                const prjTasks = tasks.filter((t) => t.projectId === p.id);
                const prjDone = prjTasks.filter((t) => t.status === 'Verified').length;
                const prjPercent = prjTasks.length > 0 ? Math.round((prjDone / prjTasks.length) * 100) : 0;

                return (
                  <div key={p.id} className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 space-y-2">
                    <div className="flex items-center justify-between">
                      <strong className="text-xs text-slate-900">{p.name}</strong>
                      <span className="text-xs font-black text-blue-700">{prjPercent}%</span>
                    </div>
                    <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                      <div className="bg-gradient-to-r from-blue-600 to-emerald-500 h-full rounded-full" style={{ width: `${prjPercent}%` }} />
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-slate-500">
                      <span>Client: {p.client || 'Internal'}</span>
                      <span>PM: {p.pmName || 'Project Manager'}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {reportTab === 'task' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Task</th>
                <th className="py-3 px-4">Project / Feature</th>
                <th className="py-3 px-4">Assignee</th>
                <th className="py-3 px-4">Lead</th>
                <th className="py-3 px-4">Time Logged</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Due Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredTasks.map((t) => {
                const workM = t.timeTracker?.totalWorkMinutes ?? Math.round((t.actualHours || 0) * 60);
                const breakM = t.timeTracker?.totalBreakMinutes ?? 0;

                return (
                  <tr key={t.id} className="hover:bg-blue-50/30 transition-colors">
                    <td className="py-3 px-4 font-bold text-slate-900">{t.title}</td>
                    <td className="py-3 px-4 text-slate-600">{t.featureName || t.projectName || 'Core Module'}</td>
                    <td className="py-3 px-4 font-medium text-slate-800">{t.assignedToName || 'Dev'}</td>
                    <td className="py-3 px-4 text-slate-500">{t.assignedByName || 'Lead'}</td>
                    <td className="py-3 px-4">
                      <span className="font-bold text-blue-700">{timeTrackingService.formatDuration(workM)}</span>
                      {breakM > 0 && <span className="text-[10px] text-amber-600 block">☕ {timeTrackingService.formatDuration(breakM)}</span>}
                    </td>
                    <td className="py-3 px-4"><StatusBadge status={t.status} size="sm" /></td>
                    <td className="py-3 px-4 text-slate-500">{t.dueDate || 'Standard'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {reportTab === 'document' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Document Title</th>
                <th className="py-3 px-4">Project</th>
                <th className="py-3 px-4">Phase</th>
                <th className="py-3 px-4">Author / Owner</th>
                <th className="py-3 px-4">Version</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Last Updated</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredDocs.map((d) => (
                <tr key={d.id} className="hover:bg-blue-50/30 transition-colors">
                  <td className="py-3 px-4 font-bold text-slate-900">{d.name}</td>
                  <td className="py-3 px-4 text-slate-600">{d.projectName}</td>
                  <td className="py-3 px-4 text-slate-500">{d.phase}</td>
                  <td className="py-3 px-4 font-semibold text-slate-700">{d.ownerName}</td>
                  <td className="py-3 px-4 font-mono">v{d.version || '1.0'}</td>
                  <td className="py-3 px-4">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                      d.status === 'Approved' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-blue-50 text-blue-700 border-blue-200'
                    }`}>
                      {d.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-slate-500">{d.lastUpdated || d.createdAt}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {reportTab === 'team' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Team Member</th>
                <th className="py-3 px-4">Role</th>
                <th className="py-3 px-4">Designation</th>
                <th className="py-3 px-4">Logged Work</th>
                <th className="py-3 px-4">Tasks Done</th>
                <th className="py-3 px-4">Documents Owned</th>
                <th className="py-3 px-4">Velocity Points</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {teamMembers.map((m) => {
                const isExact = (targetId?: string | null, targetName?: string | null, targetEmail?: string | null) => {
                  if (targetId && m.id && targetId === m.id) return true;
                  if (targetEmail && m.email && targetEmail.trim().toLowerCase() === m.email.trim().toLowerCase()) return true;
                  if (targetName && m.name && targetName.trim().toLowerCase() === m.name.trim().toLowerCase()) return true;
                  return false;
                };

                const memTasks = tasks.filter((t) => isExact(t.assignedTo, t.assignedToName, t.assignedTo) || isExact(t.assignedBy, t.assignedByName, t.assignedBy));
                const memWorkM = memTasks.reduce((sum, t) => sum + (t.timeTracker?.totalWorkMinutes ?? Math.round((t.actualHours || 0) * 60)), 0);
                const memDone = memTasks.filter((t) => t.status === 'Verified').length;
                const memDocs = documents.filter((d) => isExact(d.ownerId, d.ownerName)).length;
                const points = memDone * 5 + Math.round(memWorkM / 60) + memDocs * 10;

                return (
                  <tr key={m.id} className="hover:bg-blue-50/30 transition-colors">
                    <td className="py-3 px-4 font-bold text-slate-900">{m.name}</td>
                    <td className="py-3 px-4 font-bold text-blue-700">{m.role}</td>
                    <td className="py-3 px-4 text-slate-600">{m.designation}</td>
                    <td className="py-3 px-4 font-bold text-slate-800">{timeTrackingService.formatDuration(memWorkM)}</td>
                    <td className="py-3 px-4 font-semibold text-emerald-700">{memDone}/{memTasks.length}</td>
                    <td className="py-3 px-4 text-slate-600">{memDocs}</td>
                    <td className="py-3 px-4 font-black text-indigo-700">{points} pts</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default ReportsScreen;
