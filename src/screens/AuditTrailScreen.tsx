import React, { useState } from 'react';
import { AuditLog } from '../types';
import { 
  ShieldCheck, 
  Search, 
  Calendar, 
  ChevronRight, 
  ChevronLeft, 
  Download
} from '../components/icons';

interface AuditTrailScreenProps {
  logs: AuditLog[];
}

export const AuditTrailScreen: React.FC<AuditTrailScreenProps> = ({ logs }) => {
  const [actionFilter, setActionFilter] = useState('All');
  const [userFilter, setUserFilter] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');

  const filteredLogs = logs.filter((log) => {
    const matchesAction = actionFilter === 'All' || log.action === actionFilter;
    const matchesUser = userFilter === 'All' || log.actorName.includes(userFilter);
    const matchesSearch = 
      log.details.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.actorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.action.toLowerCase().includes(searchTerm.toLowerCase());

    return matchesAction && matchesUser && matchesSearch;
  });

  return (
    <div className="space-y-6 pb-12 animate-fade-in">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
              Audit Trail
            </h2>
            <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Immutable Ledger</span>
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            System-wide append-only history capturing every project, task, and document state mutation
          </p>
        </div>

        <button
          onClick={() => alert('Audit logs CSV exported.')}
          className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl border border-slate-200 transition-all flex items-center gap-2 self-start sm:self-auto"
        >
          <Download className="w-3.5 h-3.5 text-slate-700" />
          <span>Export Audit Log (CSV)</span>
        </button>
      </div>

      {/* Combinational Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          {/* Action Filter */}
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="All">All Actions</option>
            <option value="Task Submitted">Task Submitted</option>
            <option value="Task Approved">Task Approved</option>
            <option value="Document Updated">Document Updated</option>
            <option value="Document Created">Document Created</option>
            <option value="Project Created">Project Created</option>
          </select>

          {/* User Filter */}
          <select
            value={userFilter}
            onChange={(e) => setUserFilter(e.target.value)}
            className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="All">All Users</option>
            <option value="Kamalesh">Kamalesh S (CTO)</option>
            <option value="David">David Wilson</option>
            <option value="Mike">Mike T</option>
            <option value="Alice">Alice Johnson</option>
            <option value="John">John Doe</option>
          </select>

          {/* Date Range Badge */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-600 font-medium">
            <Calendar className="w-3.5 h-3.5 text-slate-450" />
            <span>01/05/2026 – 20/05/2026</span>
          </div>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search details, actor..."
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Date & Time</th>
                <th className="py-3 px-4">User</th>
                <th className="py-3 px-4">Action</th>
                <th className="py-3 px-4">Entity</th>
                <th className="py-3 px-4">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredLogs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                  <td className="py-3.5 px-4 font-mono text-slate-500 text-[11px]">
                    {log.timestamp}
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="font-bold text-slate-800">{log.actorName}</span>
                    <span className="text-[10px] text-blue-600 font-semibold block">{log.actorRole}</span>
                  </td>
                  <td className="py-3.5 px-4">
                    <span
                      className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${
                        log.action.includes('Approved') || log.action.includes('Created')
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : log.action.includes('Submitted')
                          ? 'bg-blue-50 text-blue-700 border-blue-200'
                          : 'bg-slate-100 text-slate-700 border-slate-200'
                      }`}
                    >
                      {log.action}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 font-semibold text-slate-600">
                    {log.entityType}
                  </td>
                  <td className="py-3.5 px-4 text-slate-700">
                    {log.details}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="p-4 border-t border-slate-150 flex items-center justify-between text-xs text-slate-500 bg-slate-50/50">
          <span>Showing {filteredLogs.length} audit entries</span>
          <div className="flex items-center gap-1">
            <button className="p-1 rounded border border-slate-200 hover:bg-white text-slate-400">
              <ChevronLeft className="w-4 h-4 text-slate-400" />
            </button>
            <button className="px-2.5 py-1 rounded bg-blue-600 text-white font-bold text-xs">
              1
            </button>
            <button className="p-1 rounded border border-slate-200 hover:bg-white text-slate-400">
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
