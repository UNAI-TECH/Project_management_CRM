import React, { useState } from 'react';
import { ProjectDocument } from '../types';
import { StatusBadge } from '../components/common/StatusBadge';
import { ProgressRing } from '../components/common/ProgressRing';
import { 
  ArrowLeft, 
  Download, 
  FileText, 
  Plus, 
  Edit 
} from '../components/icons';
import { GitBranch, CornerDownRight, Shield, User, CheckCircle2, ShieldCheck, Clock, RotateCcw, Sparkles, Lock } from 'lucide-react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { documentSyncService } from '../services/documentSyncService';
import { documentService } from '../services/documentService';
import { DOCUMENT_TEMPLATES } from '../constants/documentTemplates';
import { DocumentWatermarkOverlay } from '../components/common/DocumentWatermarkOverlay';

interface DocumentDetailScreenProps {
  document: ProjectDocument;
  onBack: () => void;
  onEdit: () => void;
  onExport: () => void;
  onAssignTask: (parentTask?: { id: string; title: string }) => void;
  onSelectTask: (taskId: string) => void;
  backButtonLabel?: string;
}

export const DocumentDetailScreen: React.FC<DocumentDetailScreenProps> = ({
  document,
  onBack,
  onEdit,
  onExport,
  onAssignTask,
  onSelectTask,
  backButtonLabel,
}) => {
  const { user, isFullAccessAdmin, role, documentBranding } = useAuth();
  const [activeTab, setActiveTab] = useState<'overview' | 'content' | 'tasks' | 'history'>('content');
  const { tasks, saveDocument, projects } = useData();
  const [isSigning, setIsSigning] = useState(false);
  const [actionToast, setActionToast] = useState<string | null>(null);

  const isCTO = isFullAccessAdmin || role === 'CTO';

  const handleQuickApprove = async () => {
    setIsSigning(true);
    try {
      const updatedContent = {
        ...(document.content || {}),
        cto_approval: 'Approved',
        approval_date: new Date().toISOString().split('T')[0],
        approval_notes: 'Officially verified, signed, and certified by CTO Office.',
      };
      await saveDocument(document.id, updatedContent, 'CTO Executive Sign-off Approved', 'Approved', 100);
      setActionToast('Document successfully signed & approved by CTO!');
      setTimeout(() => setActionToast(null), 4000);
    } catch (err) {
      console.error('Error signing document:', err);
      setActionToast('Failed to sign document.');
    } finally {
      setIsSigning(false);
    }
  };

  const handleRequestRevisions = async () => {
    setIsSigning(true);
    try {
      const updatedContent = {
        ...(document.content || {}),
        cto_approval: 'Revisions Requested',
      };
      await saveDocument(document.id, updatedContent, 'CTO Revisions Requested', 'In Review', 70);
      setActionToast('Revisions requested from project team.');
      setTimeout(() => setActionToast(null), 4000);
    } catch (err) {
      console.error('Error requesting revisions:', err);
      setActionToast('Failed to update status.');
    } finally {
      setIsSigning(false);
    }
  };

  const linkedTasks = tasks.filter(
    (t) => t.docId === document.id || t.templateId === document.templateId
  );
  const rootDocTasks = linkedTasks.filter((t) => !t.parentTaskId);
  const totalCompletion = documentSyncService.calculateDocumentCompletion(document, linkedTasks);

  return (
    <div className="space-y-6 pb-12 animate-fade-in">
      {/* Action Toast */}
      {actionToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-2 border border-slate-700 text-xs animate-slide-up">
          <Sparkles className="w-4 h-4 text-cyan-400" />
          <span>{actionToast}</span>
        </div>
      )}

      {/* Back button */}
      <button
        onClick={onBack}
        className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-blue-600 transition-colors"
      >
        <ArrowLeft className="w-4 h-4 text-slate-400 hover:text-blue-600" />
        <span>{backButtonLabel || 'Back to Documents'}</span>
      </button>

      {/* Minimal CTO Executive Verification Action Bar */}
      {isCTO && document.status === 'In Review' && (
        <div className="bg-amber-50/90 rounded-2xl border border-amber-300 px-4 py-3 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-fade-in">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center font-bold shadow-2xs shrink-0">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-extrabold text-slate-900">
                  CTO Verification Required
                </span>
                <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-amber-100 text-amber-800 border border-amber-300">
                  In Review
                </span>
              </div>
              <p className="text-[11px] text-slate-500">
                Submitted by <strong className="text-slate-700">{document.ownerName}</strong>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              disabled={isSigning}
              onClick={handleRequestRevisions}
              className="px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs rounded-xl border border-slate-300 transition-all flex items-center gap-1 cursor-pointer shadow-2xs"
            >
              <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
              <span>Request Revision</span>
            </button>

            <button
              type="button"
              disabled={isSigning}
              onClick={handleQuickApprove}
              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-2xs transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-white" />
              <span>{isSigning ? 'Authorizing...' : 'Authorize'}</span>
            </button>
          </div>
        </div>
      )}

      {/* Document Header Banner */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
              {document.name}
            </h2>
            <StatusBadge status={document.status} size="md" />
          </div>
          <p className="text-xs text-slate-500 font-medium mt-1">
            Document #{document.docNumber} • {document.phase} Phase • Project: <span className="font-semibold text-slate-700">{document.projectName}</span>
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={onExport}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl border border-slate-200 transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-slate-700" />
            <span>Export Document</span>
          </button>

          {(isCTO || (document.status !== 'In Review' && document.status !== 'Approved')) ? (
            <button
              onClick={onEdit}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Edit className="w-3.5 h-3.5 text-white" />
              <span>Edit Form</span>
            </button>
          ) : (
            <div className="px-3 py-2 bg-slate-100 text-slate-500 font-bold text-xs rounded-xl border border-slate-200 flex items-center gap-1.5 select-none" title="Document is locked while under CTO verification">
              <Lock className="w-3.5 h-3.5 text-slate-400" />
              <span>Submitted (Read-Only)</span>
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200 flex items-center gap-2 text-xs font-semibold">
        {(['overview', 'content', 'tasks', 'history'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`pb-3 px-4 capitalize transition-all border-b-2 ${
              activeTab === tab
                ? 'border-blue-600 text-blue-600 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            {tab === 'tasks' ? `Tasks (${linkedTasks.length})` : tab}
          </button>
        ))}
      </div>

      {/* Tab: Overview */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Metadata Card */}
          <div className="lg:col-span-8 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Document Information
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-150">
                <span className="text-slate-400 font-medium block">Owner</span>
                <span className="font-bold text-slate-800 text-sm">{document.ownerName}</span>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-150">
                <span className="text-slate-400 font-medium block">Version</span>
                <span className="font-bold text-slate-800 text-sm">v{document.version}</span>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-150">
                <span className="text-slate-400 font-medium block">Created On</span>
                <span className="font-semibold text-slate-700">{document.createdAt}</span>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-150">
                <span className="text-slate-400 font-medium block">Last Updated</span>
                <span className="font-semibold text-slate-700">{document.lastUpdated}</span>
              </div>
            </div>

            <div>
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                Description
              </span>
              <p className="text-xs text-slate-700 leading-relaxed bg-slate-50/60 p-3 rounded-xl border border-slate-200">
                {document.description}
              </p>
            </div>

            {/* Attached Export Files */}
            <div className="pt-2">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">
                Exported Deliverables
              </span>
              <div className="space-y-2">
                {document.files?.map((f, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-blue-600" />
                      <span className="font-bold text-slate-800">{f.name}</span>
                      <span className="text-slate-400">({f.size})</span>
                    </div>
                    <button
                      onClick={onExport}
                      className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1"
                    >
                      <Download className="w-3.5 h-3.5 text-blue-600" />
                      <span>Download</span>
                    </button>
                  </div>
                ))}
                {(!document.files || document.files.length === 0) && (
                  <p className="text-xs text-slate-400 py-1 font-medium">No external file uploads attached.</p>
                )}
              </div>
            </div>
          </div>

          {/* Completion Progress Ring Card */}
          <div className="lg:col-span-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col items-center justify-center text-center space-y-4">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Document Completion
            </h3>

            <ProgressRing progress={totalCompletion} size={150} />

            <p className="text-xs text-slate-500 max-w-[200px]">
              {totalCompletion === 100
                ? 'All mandatory template fields filled, deliverables verified, and signed off.'
                : linkedTasks.length > 0
                ? `${linkedTasks.filter(t => t.status === 'Verified').length} of ${linkedTasks.length} linked deliverables verified.`
                : document.status === 'Approved'
                ? 'Charter baseline formally approved by CTO.'
                : 'Sections are currently being drafted and verified by team leads.'}
            </p>

            <button
              onClick={onEdit}
              className="w-full py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs rounded-xl border border-blue-200 transition-colors"
            >
              Continue Editing Form
            </button>
          </div>
        </div>
      )}

      {/* Tab: Content (Exact Word-Template Mirror with Company Watermark & Letterhead) */}
      {activeTab === 'content' && (() => {
        const template = DOCUMENT_TEMPLATES.find((t) => t.id === document.templateId) || DOCUMENT_TEMPLATES[1];
        const project = projects.find((p) => p.id === document.projectId);
        const autoFillFallback = documentService.generateAutoFillContent(
          template.id,
          (project || { name: document.projectName, code: 'UNAI-PRJ', client: 'Enterprise Client', sponsor: 'Executive Sponsor', pmName: document.ownerName, department: 'Engineering', startDate: document.createdAt, targetEndDate: document.createdAt, description: document.description, priority: 'High', lifecyclePhase: document.phase }) as any,
          user?.fullName
        );
        const content = { ...autoFillFallback, ...(document.content || {}) };

        const hdr = documentBranding?.header;
        const ftr = documentBranding?.footer;
        const orgName = user?.organizationName || hdr?.leftText || 'Organization';
        const orgLogo = user?.organizationLogo;
        const headerAlignment = hdr?.alignment || 'split';
        const headerLayout = hdr?.layout || 'inline';
        const showHeaderLogo = (hdr?.showLogo ?? true) && !!orgLogo;
        const headerIsBold = hdr?.isBold ?? true;
        const headerLeft = hdr?.leftText || orgName || 'Project Management Office';
        const headerRight = hdr?.rightText || `${document.projectName} • v${document.version}`;
        const headerEnabled = hdr?.enabled ?? true;

        const footerEnabled = ftr?.enabled ?? true;
        const footerCopyright = ftr?.copyrightText || `© ${new Date().getFullYear()} ${orgName}. All Rights Reserved.`;
        const footerConfidentiality = ftr?.confidentialityNotice || 'Strictly Confidential - Internal & Client Delivery Use Only';
        const showPageNumber = ftr?.showPageNumber ?? true;

        return (
          <div className="bg-white p-8 sm:p-10 rounded-2xl border border-slate-200 shadow-md space-y-6 text-xs font-sans text-slate-800 relative overflow-hidden transition-all">
            {/* Watermark Overlay with company customization */}
            <DocumentWatermarkOverlay
              branding={documentBranding}
              companyName={orgName}
              logoUrl={orgLogo}
            />

            {/* Document Sheet Content Layer */}
            <div className="relative z-10 space-y-6">
              {/* Header / Document Control Banner with Company Branding */}
              {headerEnabled && (
                <div
                  className={`border-b border-slate-200 pb-3 ${
                    headerAlignment === 'split'
                      ? 'flex items-center justify-between'
                      : headerAlignment === 'center'
                      ? `flex ${headerLayout === 'stacked' ? 'flex-col' : 'flex-row'} items-center justify-center gap-2 text-center`
                      : headerAlignment === 'left'
                      ? `flex ${headerLayout === 'stacked' ? 'flex-col' : 'flex-row'} items-start gap-2`
                      : 'flex items-center justify-end gap-2'
                  }`}
                >
                  <div className={`flex items-center gap-2 ${headerAlignment === 'center' ? 'justify-center' : ''}`}>
                    {showHeaderLogo && (
                      <img src={orgLogo} alt="Logo" className="h-6 max-w-[90px] object-contain" />
                    )}
                    <span
                      className={`text-[11px] text-slate-700 tracking-wider ${
                        headerIsBold ? 'font-bold uppercase' : 'font-medium'
                      }`}
                    >
                      {headerLeft}
                    </span>
                  </div>
                  {headerRight && (
                    <span
                      className={`text-[10px] text-slate-400 ${
                        headerIsBold ? 'font-semibold' : 'font-normal'
                      }`}
                    >
                      {headerRight}
                    </span>
                  )}
                </div>
              )}

              {/* Document Title Banner */}
              <div>
                <h2 className="text-xl font-extrabold text-blue-950 uppercase tracking-tight">
                  {document.name}
                </h2>
                <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                  <span>Phase: <strong className="text-blue-700">{document.phase}</strong></span>
                  <span>•</span>
                  <span>Classification: <strong className="text-slate-700">Internal Governance Baseline</strong></span>
                  <span>•</span>
                  <span>Status: <strong className={document.status === 'Approved' ? 'text-emerald-700' : 'text-amber-600'}>{document.status}</strong></span>
                </div>
              </div>

              {/* Table 1: DOCUMENT CONTROL */}
              <div className="space-y-1.5">
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">DOCUMENT CONTROL</h3>
                <div className="overflow-x-auto rounded-xl border border-slate-300 shadow-2xs bg-white/90 backdrop-blur-2xs">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-[#1B365D] text-white font-bold uppercase text-[10px] tracking-wider">
                        <th className="p-2.5">Version</th>
                        <th className="p-2.5">Date</th>
                        <th className="p-2.5">Prepared By</th>
                        <th className="p-2.5">Reviewed By</th>
                        <th className="p-2.5">Approved By</th>
                        <th className="p-2.5">Description of Changes</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200/70 bg-white text-[11px]">
                      <tr>
                        <td className="p-2.5 font-bold text-blue-700">v{document.version}</td>
                        <td className="p-2.5 text-slate-600">{document.lastUpdated || document.createdAt}</td>
                        <td className="p-2.5 text-slate-800 font-medium">{document.ownerName}</td>
                        <td className="p-2.5 text-slate-600">Tech Lead / PM</td>
                        <td className="p-2.5 text-slate-800 font-medium">{document.status === 'Approved' ? 'Kamalesh S (CTO)' : 'Pending'}</td>
                        <td className="p-2.5 text-slate-600">Baseline governance update</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Table 2: PROJECT METADATA */}
              <div className="overflow-x-auto rounded-xl border border-slate-300 shadow-2xs">
                <table className="w-full text-left text-xs border-collapse bg-slate-50/70 backdrop-blur-2xs">
                  <tbody className="divide-y divide-slate-200/70 text-[11px]">
                    <tr>
                      <td className="p-2.5 w-1/2 font-bold text-slate-700">Project Name: <span className="font-normal text-slate-900">{document.projectName}</span></td>
                      <td className="p-2.5 w-1/2 font-bold text-slate-700">Document Version: <span className="font-normal text-slate-900">v{document.version}</span></td>
                    </tr>
                    <tr>
                      <td className="p-2.5 w-1/2 font-bold text-slate-700">Prepared By: <span className="font-normal text-slate-900">{document.ownerName}</span></td>
                      <td className="p-2.5 w-1/2 font-bold text-slate-700">Date: <span className="font-normal text-slate-900">{document.createdAt}</span></td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Numbered Sections & Custom Data Tables */}
              <div className="space-y-6 pt-2">
                {template.sections.map((sec) => {
                  if (sec.id === 'approvals') return null;

                  return (
                    <div key={sec.id} className="space-y-3">
                      <h3 className="text-xs font-bold text-[#1B365D] uppercase tracking-wider border-b border-blue-200 pb-1.5">
                        {sec.title}
                      </h3>

                      {sec.fields.map((field) => {
                        let val = content[field.id];

                        if (field.type === 'table') {
                          if (!Array.isArray(val) || val.length === 0) {
                            if (Array.isArray(autoFillFallback[field.id]) && autoFillFallback[field.id].length > 0) {
                              val = autoFillFallback[field.id];
                            }
                          }
                          const tableRows: Record<string, any>[] = Array.isArray(val) && val.length > 0 ? val : [];
                          const columns = field.columns || [{ id: 'col1', label: 'Column' }];

                          return (
                            <div key={field.id} className="space-y-1.5 pt-1">
                              <h4 className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                                {field.label}
                              </h4>
                              <div className="overflow-x-auto rounded-xl border border-slate-300 shadow-2xs bg-white/90">
                                <table className="w-full text-left text-xs border-collapse">
                                  <thead>
                                    <tr className="bg-[#1B365D] text-white font-bold uppercase text-[10px] tracking-wider">
                                      <th className="p-2 w-8 text-center text-slate-300">#</th>
                                      {columns.map((col) => (
                                        <th key={col.id} className="p-2">{col.label}</th>
                                      ))}
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-200/70 bg-white text-[11px]">
                                    {tableRows.length > 0 ? (
                                      tableRows.map((row, rIdx) => (
                                        <tr key={rIdx} className="hover:bg-slate-50/50">
                                          <td className="p-2 text-center text-slate-400 font-bold text-[10px]">{rIdx + 1}</td>
                                          {columns.map((col) => {
                                            let cellVal = row[col.id];
                                            if (cellVal === undefined || cellVal === null || String(cellVal).trim() === '') {
                                              const camelKey = col.id.replace(/_([a-z])/g, (_, l) => l.toUpperCase());
                                              cellVal = row[camelKey];
                                            }
                                            if (cellVal === undefined || cellVal === null || String(cellVal).trim() === '') {
                                              const aliases: Record<string, string[]> = {
                                                deliverable: ['task_name', 'task', 'feature', 'milestone', 'name', 'item', 'deliverable_name'],
                                                task_name: ['deliverable', 'task', 'feature_name', 'name', 'activity', 'title'],
                                                milestone: ['deliverable', 'phase', 'name', 'title'],
                                                owner: ['assignee', 'lead', 'name', 'responsible_person', 'subtask_assignee', 'verified_by'],
                                                target_date: ['targetDate', 'end_date', 'dueDate', 'date'],
                                                start_date: ['startDate', 'start'],
                                                end_date: ['endDate', 'end', 'target_date'],
                                                requirement: ['description', 'title', 'req_name', 'name', 'feature', 'summary', 'details', 'text', 'business_requirement', 'specification', 'functional_requirement'],
                                                justification: ['notes', 'description', 'rationale', 'business_value', 'reason', 'impact', 'remarks', 'comments', 'benefit', 'summary', 'details'],
                                                req_id: ['id', 'code', 'number', 'req_no', 'reqId', 'identifier'],
                                                func_id: ['id', 'code', 'number', 'func_no', 'funcId', 'req_id', 'identifier'],
                                                priority: ['importance', 'severity', 'level', 'status'],
                                                description: ['notes', 'justification', 'remarks', 'specification', 'requirement', 'summary', 'details'],
                                                estimate: ['cost', 'budget', 'amount', 'notes'],
                                                notes: ['remarks', 'estimate', 'description', 'justification', 'comments'],
                                                risk_or_constraint: ['risk', 'constraint', 'description', 'title'],
                                                impact: ['severity', 'priority'],
                                                mitigation_strategy: ['mitigation', 'strategy', 'action', 'plan'],
                                                name: ['stakeholder', 'member', 'owner', 'lead', 'title'],
                                                role: ['designation', 'position', 'title'],
                                                responsibility: ['responsibilities', 'duties', 'scope'],
                                                user_story: ['story', 'requirement', 'description'],
                                                story_points: ['points', 'estimate'],
                                                acceptance_criteria: ['criteria', 'expected_result'],
                                              };
                                              const aliasList = aliases[col.id] || [];
                                              for (const a of aliasList) {
                                                if (row[a] !== undefined && row[a] !== null && String(row[a]).trim() !== '') {
                                                  cellVal = row[a];
                                                  break;
                                                }
                                              }
                                            }

                                            // Contextual fallback for requirements and justifications if empty
                                            if ((cellVal === undefined || cellVal === null || String(cellVal).trim() === '') && (col.id === 'requirement' || col.id === 'justification')) {
                                              const reqCode = row.req_id || row.id || `BRD-0${rIdx + 1}`;
                                              if (col.id === 'requirement') {
                                                cellVal = `Core functional capability and business workflow for ${reqCode}`;
                                              } else if (col.id === 'justification') {
                                                cellVal = `Ensures organizational compliance, audit readiness, and operational efficiency for ${reqCode}`;
                                              }
                                            }

                                            const cellText = cellVal !== undefined && cellVal !== null && String(cellVal).trim() !== '' ? String(cellVal) : '—';
                                            return (
                                              <td key={col.id} className="p-2 text-slate-800 font-medium">
                                                {cellText}
                                              </td>
                                            );
                                          })}
                                        </tr>
                                      ))
                                    ) : (
                                      <tr>
                                        <td colSpan={columns.length + 1} className="p-3 text-center text-slate-400 italic">
                                          No rows entered yet in this table.
                                        </td>
                                      </tr>
                                    )}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          );
                        }

                        if (val === undefined || val === null || String(val).trim() === '') {
                          if (autoFillFallback[field.id] !== undefined && autoFillFallback[field.id] !== null && String(autoFillFallback[field.id]).trim() !== '') {
                            val = autoFillFallback[field.id];
                          }
                        }

                        if (val !== undefined && String(val).trim() !== '') {
                          return (
                            <div key={field.id} className="space-y-1 bg-slate-50/80 backdrop-blur-2xs p-3 rounded-xl border border-slate-200/60">
                              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                                {field.label}
                              </span>
                              <p className="text-xs text-slate-900 whitespace-pre-wrap font-medium leading-relaxed">
                                {String(val)}
                              </p>
                            </div>
                          );
                        }

                        return null;
                      })}
                    </div>
                  );
                })}
              </div>

              {/* Verified Contributor Deliverables */}
              <div className="pt-4 border-t border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-[#1B365D] uppercase tracking-wider flex items-center gap-1.5">
                    <GitBranch className="w-3.5 h-3.5 text-blue-600" />
                    <span>Team Contributions & Verified Task Deliverables</span>
                  </h4>
                  <span className="text-[10px] font-bold px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-md">
                    {linkedTasks.filter((t) => t.status === 'Verified').length} of {linkedTasks.length} Verified
                  </span>
                </div>

                {linkedTasks.length === 0 ? (
                  <p className="text-xs text-slate-400 py-2">No delegated tasks linked to this document yet.</p>
                ) : (
                  <div className="overflow-x-auto rounded-xl border border-slate-300 shadow-2xs bg-white/90">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-[#1B365D] text-white font-bold uppercase text-[10px] tracking-wider">
                          <th className="p-2.5">Task / Objective</th>
                          <th className="p-2.5">Contributor</th>
                          <th className="p-2.5">Status</th>
                          <th className="p-2.5">Deliverable Notes</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200/70 bg-white text-[11px]">
                        {linkedTasks.map((t) => (
                          <tr key={t.id} onClick={() => onSelectTask(t.id)} className="hover:bg-slate-50 cursor-pointer">
                            <td className="p-2.5 font-bold text-slate-900">{t.title}</td>
                            <td className="p-2.5 text-slate-600">{t.assignedToName} ({t.assignedToRole})</td>
                            <td className="p-2.5">
                              <StatusBadge status={t.status} size="sm" />
                            </td>
                            <td className="p-2.5 text-slate-600">
                              {t.submission?.notes || 'In progress'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Approval / Verification Signature Box */}
              <div className="pt-4 border-t border-slate-200 space-y-2">
                <h3 className="text-xs font-bold text-blue-900 uppercase tracking-wider">APPROVAL & EXECUTIVE SIGN-OFF</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl bg-slate-50/90 backdrop-blur-2xs border border-slate-200 space-y-1.5">
                    <div className="text-[11px] font-bold text-slate-800 uppercase">Primary Author / Sponsor</div>
                    <div className="text-xs text-slate-600">Name: <strong className="text-slate-800">{document.ownerName}</strong></div>
                    <div className="text-xs text-slate-600">Date: <strong className="text-slate-800">{document.createdAt}</strong></div>
                    <div className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 mt-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Certified Baseline</span>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-50/90 backdrop-blur-2xs border border-slate-200 space-y-1.5">
                    <div className="text-[11px] font-bold text-slate-800 uppercase">CTO / Executive Sign-off</div>
                    <div className="text-xs text-slate-600">Name: <strong className="text-slate-800">Kamalesh S (CTO)</strong></div>
                    <div className="text-xs text-slate-600">Date: <strong className="text-slate-800">{content.approval_date || document.lastUpdated || 'Pending'}</strong></div>
                    <div className="text-xs text-slate-600">
                      Status: <strong className={document.status === 'Approved' ? 'text-emerald-700 font-bold' : 'text-amber-600 font-bold'}>{content.cto_approval || document.status}</strong>
                    </div>
                    {content.approval_notes && (
                      <div className="text-[11px] text-slate-500 italic pt-1">
                        "{content.approval_notes}"
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Branded Footer */}
              {footerEnabled && (
                <div className="flex flex-col sm:flex-row items-center justify-between border-t border-slate-200 pt-3 text-[10px] text-slate-500 gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{footerCopyright}</span>
                    <span>•</span>
                    <span className="text-slate-400">{footerConfidentiality}</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-400 font-medium">
                    <span>Doc ID: {document.docNumber}</span>
                    {showPageNumber && <span>• Page 1 of 1</span>}
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {/* Tab: Tasks (Hierarchical Delegation Tree) */}
      {activeTab === 'tasks' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <GitBranch className="w-4 h-4 text-blue-600" />
                <span>Hierarchical Tasks Linked to this Document</span>
                <span className="text-xs font-semibold text-slate-400">({linkedTasks.length})</span>
              </h3>
              <p className="text-xs text-slate-500">
                Directives & delegated work: CTO ➔ PM ➔ TL ➔ Developers
              </p>
            </div>

            {(isFullAccessAdmin || user?.role === 'PM' || user?.role === 'TL') && (
              <button
                onClick={() => onAssignTask()}
                className="px-3.5 py-2 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-1.5 cursor-pointer transition-all transform hover:-translate-y-0.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>
                  {isFullAccessAdmin || user?.role === 'CTO'
                    ? '+ Assign Directive to PM'
                    : user?.role === 'PM'
                    ? '+ Delegate Task to TL'
                    : '+ Delegate to Developer'}
                </span>
              </button>
            )}
          </div>

          <div className="space-y-4 pt-2">
            {rootDocTasks.map((rootTask) => {
              const tlSubtasks = linkedTasks.filter((t) => t.parentTaskId === rootTask.id);

              return (
                <div key={rootTask.id} className="p-4 rounded-xl bg-slate-50/70 border border-slate-200 space-y-3">
                  {/* Root / Parent Directive */}
                  <div
                    onClick={() => onSelectTask(rootTask.id)}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer group"
                  >
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-indigo-100 text-indigo-800">
                          {rootTask.assignedToRole === 'PM' ? 'Directive to PM' : 'Primary Task'}
                        </span>
                        <h4 className="text-xs font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                          {rootTask.title}
                        </h4>
                      </div>
                      <p className="text-[11px] text-slate-500 line-clamp-1">{rootTask.description}</p>
                      <div className="flex items-center gap-3 text-[10px] text-slate-400">
                        <span>Lead: <strong className="text-slate-700">{rootTask.assignedToName}</strong></span>
                        <span>Due: {rootTask.dueDate}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <StatusBadge status={rootTask.status} size="sm" />
                      {(isFullAccessAdmin || user?.role === 'PM') && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onAssignTask({ id: rootTask.id, title: rootTask.title });
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
                    <div className="pl-4 sm:pl-6 space-y-2.5 border-l-2 border-indigo-100 ml-2">
                      {tlSubtasks.map((tlTask) => {
                        const devSubtasks = linkedTasks.filter((t) => t.parentTaskId === tlTask.id);

                        return (
                          <div key={tlTask.id} className="space-y-2">
                            <div
                              onClick={() => onSelectTask(tlTask.id)}
                              className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2.5 rounded-lg bg-purple-50/50 border border-purple-200/70 hover:border-purple-300 cursor-pointer group"
                            >
                              <div className="space-y-0.5 flex-1">
                                <div className="flex items-center gap-1.5">
                                  <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-purple-100 text-purple-800">
                                    PM ➔ TL
                                  </span>
                                  <h5 className="text-xs font-bold text-slate-800 group-hover:text-purple-700">
                                    {tlTask.title}
                                  </h5>
                                </div>
                                <div className="flex items-center gap-3 text-[10px] text-slate-400">
                                  <span>Tech Lead: <strong className="text-slate-700">{tlTask.assignedToName}</strong></span>
                                  <span>Due: {tlTask.dueDate}</span>
                                </div>
                              </div>

                              <div className="flex items-center gap-2 shrink-0">
                                <StatusBadge status={tlTask.status} size="sm" />
                                {(isFullAccessAdmin || user?.role === 'PM' || user?.role === 'TL') && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onAssignTask({ id: tlTask.id, title: tlTask.title });
                                    }}
                                    className="px-2 py-0.5 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-md text-[9px] font-bold border border-purple-200 flex items-center gap-1 cursor-pointer transition-colors"
                                  >
                                    <CornerDownRight className="w-2.5 h-2.5" />
                                    <span>+ Delegate to Dev</span>
                                  </button>
                                )}
                              </div>
                            </div>

                            {/* Level 3 Sub-tasks (TL -> Devs) */}
                            {devSubtasks.length > 0 && (
                              <div className="pl-4 sm:pl-6 space-y-1.5 border-l-2 border-purple-100 ml-2">
                                {devSubtasks.map((devTask) => (
                                  <div
                                    key={devTask.id}
                                    onClick={() => onSelectTask(devTask.id)}
                                    className="flex items-center justify-between gap-2 p-2 rounded-md bg-teal-50/40 border border-teal-200/60 hover:border-teal-300 cursor-pointer group"
                                  >
                                    <div className="space-y-0.5 flex-1">
                                      <div className="flex items-center gap-1.5">
                                        <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-teal-100 text-teal-800">
                                          Dev Deliverable
                                        </span>
                                        <h6 className="text-xs font-semibold text-slate-800 group-hover:text-teal-700">
                                          {devTask.title}
                                        </h6>
                                      </div>
                                      <span className="text-[10px] text-slate-400">
                                        Dev: <strong className="text-slate-600">{devTask.assignedToName}</strong> • Due: {devTask.dueDate}
                                      </span>
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

            {linkedTasks.length === 0 && (
              <p className="text-xs text-slate-400 py-6 text-center font-medium">
                No tasks linked to this document yet. Click above to assign deliverables to PM.
              </p>
            )}
          </div>
        </div>
      )}

      {/* Tab: History */}
      {activeTab === 'history' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4 text-xs">
          <h3 className="text-sm font-bold text-slate-900">Version History & Rollback Logs</h3>
          <div className="space-y-3">
            {document.history?.map((h, idx) => (
              <div key={idx} className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900">Version {h.version}</span>
                  <span className="text-slate-400">{h.date}</span>
                </div>
                <p className="text-slate-600">{h.summary}</p>
                <span className="text-[10px] text-blue-600 font-semibold block">Author: {h.author}</span>
              </div>
            ))}
            {(!document.history || document.history.length === 0) && (
              <p className="text-xs text-slate-400 py-6 text-center">No version control snapshots stored for this document.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
