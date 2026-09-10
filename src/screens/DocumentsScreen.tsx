import React, { useState, useEffect } from 'react';
import { DOCUMENT_TEMPLATES, LIFECYCLE_PHASES, PHASE_COLORS, isTemplateAllowedForUser } from '../constants/documentTemplates';
import { isDocumentEditable } from '../constants/documentDependencyGraph';
import { LifecyclePhase, Project, ProjectDocument, UserRole } from '../types';
import { StatusBadge } from '../components/common/StatusBadge';
import { 
  Search, 
  ChevronRight, 
  Edit, 
  Download, 
  FolderKanban, 
  FileText, 
  CheckCircle2, 
  Clock, 
  Lock, 
  Sparkles, 
  ArrowLeft, 
  FileCheck, 
  Calendar, 
  ShieldCheck, 
  FileEdit,
  PenTool
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { exportService } from '../services/exportService';

interface DocumentsScreenProps {
  initialProjectId?: string | null;
  onProjectChange?: (projectId: string | null) => void;
  onSelectDocument?: (docId: string, projectId?: string) => void;
  onEditDocument?: (docId: string, projectId?: string) => void;
  onSelectProject?: (projectId: string) => void;
  onSelectTemplate?: (templateId: number) => void;
  onEditTemplate?: (templateId: number) => void;
}

// Explicit authoring template assignments per role for "Need to be Filled"
const ROLE_AUTHORING_TEMPLATES: Record<string, number[]> = {
  CTO: [0, 1, 2, 4], // Master Record (0), Project Charter (1), Project Plan (2), BRD (4)
  CEO: [0, 1, 2, 4],
  MD: [0, 1, 2, 4],
  COO: [0, 1, 2, 4],
  CIO: [0, 1, 2, 4],
  PM: [2, 3, 5, 6, 7, 8, 9, 12, 13, 14, 15],
  TL: [5, 6, 7, 8, 9, 10, 11, 13, 15],
  Employee: [8, 10, 11],
};

export const DocumentsScreen: React.FC<DocumentsScreenProps> = ({
  initialProjectId,
  onProjectChange,
  onSelectDocument,
  onEditDocument,
  onSelectProject,
  onSelectTemplate,
  onEditTemplate,
}) => {
  const { role, user, isFullAccessAdmin, documentBranding } = useAuth();
  const { projects, documents, tasks } = useData();

  // State: selected project for documents view (null means showing projects list)
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(initialProjectId || null);

  useEffect(() => {
    if (initialProjectId) {
      setSelectedProjectId(initialProjectId);
    }
  }, [initialProjectId]);

  const handleSelectProjectWorkspace = (id: string | null) => {
    setSelectedProjectId(id);
    onProjectChange?.(id);
  };
  const [activeClassification, setActiveClassification] = useState<'to-fill' | 'to-verify' | 'approved' | 'all'>('to-fill');
  const [selectedPhase, setSelectedPhase] = useState<LifecyclePhase | 'All'>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [downloadingDocId, setDownloadingDocId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const userRole = (user?.role || role || 'Employee') as UserRole;
  const isExec = isFullAccessAdmin || ['CEO', 'MD', 'COO', 'CTO', 'CIO'].includes(role);

  // Filter allowed templates based on role
  const designationAllowedTemplates = DOCUMENT_TEMPLATES.filter((tpl) =>
    isTemplateAllowedForUser(tpl, role, user?.designation)
  );

  // Filter accessible projects
  const accessibleProjects = projects.filter((p) => {
    if (isFullAccessAdmin) return true;
    if (!user) return false;
    if (p.pmId === user.id || p.pmName?.toLowerCase() === user.fullName?.toLowerCase()) return true;
    return true;
  });

  const filteredProjects = accessibleProjects.filter((p) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      p.name.toLowerCase().includes(q) ||
      p.code.toLowerCase().includes(q) ||
      p.client.toLowerCase().includes(q) ||
      p.pmName.toLowerCase().includes(q)
    );
  });

  const activeProject = selectedProjectId
    ? accessibleProjects.find((p) => p.id === selectedProjectId)
    : null;

  // Handle direct DOCX download with branding & task completion records
  const handleDownloadDocx = async (e: React.MouseEvent, doc: ProjectDocument) => {
    e.stopPropagation();
    setDownloadingDocId(`${doc.id}-docx`);
    try {
      const linkedTasks = tasks.filter((t) => t.docId === doc.id || t.templateId === doc.templateId);
      await exportService.exportToDocx(
        doc,
        documentBranding,
        user?.organizationName,
        linkedTasks
      );
      showToast(`Exported "${doc.name}.docx" with verified deliverables records!`);
    } catch (err) {
      console.error('Failed to export DOCX:', err);
      showToast('Error exporting document. Please try again.');
    } finally {
      setDownloadingDocId(null);
    }
  };

  // Handle direct PDF download
  const handleDownloadPdf = async (e: React.MouseEvent, doc: ProjectDocument) => {
    e.stopPropagation();
    setDownloadingDocId(`${doc.id}-pdf`);
    try {
      const linkedTasks = tasks.filter((t) => t.docId === doc.id || t.templateId === doc.templateId);
      await exportService.exportToPdf(
        doc,
        documentBranding,
        user?.organizationName,
        user?.organizationLogo,
        linkedTasks
      );
      showToast(`Exported "${doc.name}.pdf" with official letterhead!`);
    } catch (err) {
      console.error('Failed to export PDF:', err);
      showToast('Error exporting PDF document.');
    } finally {
      setDownloadingDocId(null);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // VIEW 1: PROJECTS GRID (Clean Light Theme matching Screenshot 2)
  // ─────────────────────────────────────────────────────────────────────────────
  if (!activeProject) {
    return (
      <div className="space-y-6 pb-12 animate-fade-in font-sans">
        {/* Toast Notification */}
        {toastMessage && (
          <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-2 border border-slate-700 text-xs animate-slide-up">
            <Sparkles className="w-4 h-4 text-cyan-400" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* Top Header & Search Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-2xl font-black font-display text-slate-900 tracking-tight">
                Project Document Workspaces
              </h2>
              <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200">
                {accessibleProjects.length} Projects
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Select a project card below to view and manage its lifecycle documents, filtered by your role.
            </p>
          </div>

          {/* Search */}
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search projects, client, PM..."
              className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            />
          </div>
        </div>

        {/* Projects Cards Grid (Exact matching styling from Screenshot 2) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredProjects.length === 0 ? (
            <div className="col-span-full py-16 text-center text-slate-400 bg-white rounded-3xl border border-dashed border-slate-300">
              <FolderKanban className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="font-semibold text-sm text-slate-600">No projects found</p>
              <p className="text-xs text-slate-400 mt-1">Try adjusting your search criteria.</p>
            </div>
          ) : (
            filteredProjects.map((prj) => {
              const projectDocs = documents.filter((d) => d.projectId === prj.id);
              const completedDocs = projectDocs.filter((d) => d.status === 'Approved').length;
              
              const assignedAuthorTemplateIds = ROLE_AUTHORING_TEMPLATES[userRole] || [0, 1, 2, 4];
              const toFillCount = assignedAuthorTemplateIds.filter((tid) => {
                const doc = projectDocs.find((d) => d.templateId === tid);
                return !doc || (doc.status !== 'Approved' && doc.status !== 'In Review');
              }).length;

              const toVerifyCount = projectDocs.filter(
                (d) =>
                  d.status === 'In Review' ||
                  d.content?.cto_approval === 'Pending Review'
              ).length;

              return (
                <div
                  key={prj.id}
                  onClick={() => handleSelectProjectWorkspace(prj.id)}
                  className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs hover:shadow-xl hover:border-blue-400 transition-all duration-300 cursor-pointer flex flex-col justify-between group relative overflow-hidden transform hover:-translate-y-1"
                >
                  {/* Top Subtle Gradient Stripe */}
                  <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-blue-600 via-cyan-500 to-indigo-600" />

                  <div>
                    {/* Header: Project Icon, Name, Status & Code */}
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-sm border border-blue-100 group-hover:bg-blue-600 group-hover:text-white transition-all shadow-xs">
                          <FolderKanban className="w-5 h-5" />
                        </div>
                        <div>
                          <h3 className="font-extrabold text-base text-slate-900 group-hover:text-blue-600 transition-colors line-clamp-1">
                            {prj.name}
                          </h3>
                          <span className="text-[11px] text-slate-400 font-mono">{prj.code}</span>
                        </div>
                      </div>

                      <StatusBadge status={prj.status} size="sm" />
                    </div>

                    {/* Client & Lifecycle Phase */}
                    <div className="flex items-center justify-between text-xs py-2 border-y border-slate-100/80 mb-3">
                      <span className="text-slate-500">
                        Client: <strong className="text-slate-800 font-bold">{prj.client}</strong>
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                        Phase: {prj.lifecyclePhase || 'Initiate'}
                      </span>
                    </div>

                    {/* Assigned PM & Timeline */}
                    <div className="space-y-2 mb-4">
                      <div className="flex items-center gap-2 text-xs text-slate-600">
                        <div className="w-5 h-5 rounded-full bg-slate-200 text-slate-700 font-bold text-[10px] flex items-center justify-center">
                          {(prj.pmName || 'PM').charAt(0)}
                        </div>
                        <span>PM: <strong>{prj.pmName || 'Unassigned'}</strong></span>
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-slate-400">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-slate-400" />
                          {prj.startDate || 'Start Date'}
                        </span>
                        <span>Target: {prj.targetEndDate || 'Ongoing'}</span>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="space-y-1.5 mb-4">
                      <div className="flex justify-between text-[11px]">
                        <span className="text-slate-400 font-medium">Completion</span>
                        <span className="font-bold text-slate-800">{prj.progress || 0}%</span>
                      </div>
                      <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-blue-600 to-cyan-500 transition-all duration-500"
                          style={{ width: `${Math.max(5, prj.progress || 0)}%` }}
                        />
                      </div>
                    </div>

                    {/* Quick Document Status Badges */}
                    <div className="grid grid-cols-2 gap-2 bg-slate-50/80 p-2.5 rounded-2xl border border-slate-100 text-center text-xs">
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">To Fill ({userRole})</span>
                        <span className="font-extrabold text-blue-600 text-sm">
                          {toFillCount} Docs
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">To Authorize</span>
                        <span className="font-extrabold text-amber-600 text-sm">
                          {toVerifyCount} Pending
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Card Footer Link */}
                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-xs font-bold text-blue-600 group-hover:text-blue-700 flex items-center gap-1">
                      <span>View Project Documents</span>
                      <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                    </span>
                    <span className="text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-100 px-2 py-0.5 rounded-full">
                      16 Master Docs
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // VIEW 2: DEDICATED PROJECT DOCUMENTS PAGE (CLASSIFIED: TO FILL / TO VERIFY)
  // ─────────────────────────────────────────────────────────────────────────────
  const projectDocs = documents.filter((d) => d.projectId === activeProject.id);

  // Authoring template IDs specifically assigned to this user role:
  const assignedAuthorTemplateIds = ROLE_AUTHORING_TEMPLATES[userRole] || [0, 1, 2, 4];

  const docSlots = designationAllowedTemplates.map((template) => {
    const existingDoc = projectDocs.find(
      (d) => d.templateId === template.id || d.name.toLowerCase() === template.name.toLowerCase()
    );
    const editCheck = isDocumentEditable(template.id, userRole, projectDocs);
    const isLocked = !isExec && !editCheck.editable;
    
    // Check if the document has been populated with spec/table content
    const hasContent = !!(
      existingDoc &&
      existingDoc.content &&
      Object.keys(existingDoc.content).length > 2 &&
      Object.values(existingDoc.content).some(
        (v) => v !== '' && v !== null && (!Array.isArray(v) || v.length > 0)
      )
    );

    const isApproved = existingDoc 
      ? (existingDoc.status === 'Approved' || existingDoc.content?.cto_approval === 'Approved')
      : false;

    // Signatures & Authorizations (Realtime Verification Queue):
    // Documents that are populated and pending executive sign-off, or explicitly marked In Review / Pending Review
    const isToVerify =
      !!existingDoc &&
      !isApproved &&
      (existingDoc.status === 'In Review' ||
        existingDoc.status === 'Ready for Review' ||
        existingDoc.content?.cto_approval === 'Pending Review' ||
        (hasContent && isExec));

    // Need to be Filled / Drafts:
    // Only documents that lack content, or are still unpopulated
    const isToFill =
      assignedAuthorTemplateIds.includes(template.id) &&
      !isApproved &&
      !isToVerify &&
      (!existingDoc || !hasContent);

    const status = isApproved 
      ? 'Approved' 
      : isToVerify 
      ? 'In Review' 
      : hasContent 
      ? 'In Progress' 
      : (existingDoc?.status || (isLocked ? 'Locked' : 'Draft'));

    return {
      template,
      existingDoc,
      status,
      isLocked,
      isApproved,
      isToVerify,
      isToFill,
      hasContent,
      editCheck,
      docToExport: existingDoc || {
        id: `doc-${activeProject.id}-${template.id}`,
        projectId: activeProject.id,
        projectName: activeProject.name,
        templateId: template.id,
        docNumber: `DOC-${template.id.toString().padStart(2, '0')}`,
        name: template.name,
        phase: template.phase,
        version: '1.0',
        status: 'Draft',
        completion: 0,
        ownerName: activeProject.pmName || 'PM',
        ownerId: activeProject.pmId || '',
        createdAt: activeProject.startDate,
        lastUpdated: new Date().toLocaleDateString('en-GB'),
        description: template.description,
        content: {},
      },
    };
  });

  const docsToFill = docSlots.filter((s) => s.isToFill);
  const docsToVerify = docSlots.filter((s) => s.isToVerify);
  const docsApproved = docSlots.filter((s) => s.isApproved);

  const displayedSlots = 
    activeClassification === 'to-fill' ? docsToFill :
    activeClassification === 'to-verify' ? docsToVerify :
    activeClassification === 'approved' ? docsApproved :
    docSlots;

  // Filter by phase & search query within active tab
  const filteredSlots = displayedSlots.filter(({ template }) => {
    const matchesPhase = selectedPhase === 'All' || template.phase === selectedPhase || template.phase === 'All Phases';
    const matchesSearch =
      !searchQuery ||
      template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.number.includes(searchQuery);
    return matchesPhase && matchesSearch;
  });

  return (
    <div className="space-y-6 pb-12 animate-fade-in font-sans">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-2 border border-slate-700 text-xs animate-slide-up">
          <Sparkles className="w-4 h-4 text-cyan-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Back Navigation Bar */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => handleSelectProjectWorkspace(null)}
          className="inline-flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-blue-600 transition-colors bg-white px-3.5 py-2 rounded-xl border border-slate-200 shadow-xs cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4 text-slate-400" />
          <span>Back to All Projects</span>
        </button>

        {onSelectProject && (
          <button
            onClick={() => onSelectProject(activeProject.id)}
            className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 cursor-pointer"
          >
            <span>Open Project Hub</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* ── Active Project Summary Header Card (Light Theme) ── */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs relative overflow-hidden">
        {/* Top Blue Gradient Accent */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-blue-600 via-cyan-500 to-indigo-600" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-sm border border-blue-100 shadow-xs shrink-0">
              <FolderKanban className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-blue-100 text-blue-800 border border-blue-200">
                  {activeProject.code}
                </span>
                <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
                  {activeProject.name} — Lifecycle Documents
                </h2>
                <StatusBadge status={activeProject.status} size="sm" />
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Client: <strong className="text-slate-800 font-bold">{activeProject.client}</strong> • Assigned PM: <strong className="text-slate-800 font-bold">{activeProject.pmName || 'Unassigned'}</strong> • Phase: <span className="font-semibold text-blue-700">{activeProject.lifecyclePhase || 'Initiate'}</span>
              </p>
            </div>
          </div>

          {/* Completion Stats */}
          <div className="flex items-center gap-4 bg-slate-50 p-3 rounded-2xl border border-slate-100 self-end md:self-auto">
            <div className="text-right text-xs">
              <span className="text-slate-400 font-medium block text-[10px] uppercase">Approved Deliverables</span>
              <span className="font-extrabold text-emerald-600 text-sm">
                {docsApproved.length} / 16 Done
              </span>
            </div>
            <div className="w-24 bg-slate-200 h-2 rounded-full overflow-hidden">
              <div
                className="bg-emerald-500 h-full rounded-full transition-all"
                style={{ width: `${Math.round((docsApproved.length / 16) * 100)}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* ── TWO PRIMARY CLASSIFICATION TABS ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-2 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-2 overflow-x-auto p-1">
          {/* Classification 1: Need to be Filled (Filtered specifically for user role) */}
          <button
            onClick={() => setActiveClassification('to-fill')}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs transition-all flex items-center gap-2 cursor-pointer ${
              activeClassification === 'to-fill'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <FileEdit className="w-4 h-4" />
            <span>Need to be Filled ({userRole})</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
              activeClassification === 'to-fill' ? 'bg-white text-blue-700' : 'bg-blue-100 text-blue-800'
            }`}>
              {docsToFill.length}
            </span>
          </button>

          {/* Classification 2: Signatures & Authorizations (CTO only) vs Submitted for CTO Review (PM / Team) */}
          <button
            onClick={() => setActiveClassification('to-verify')}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs transition-all flex items-center gap-2 cursor-pointer ${
              activeClassification === 'to-verify'
                ? 'bg-amber-500 text-white shadow-xs'
                : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>{isExec ? 'Signatures & Authorizations' : 'Submitted for CTO Review'}</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
              activeClassification === 'to-verify' ? 'bg-white text-amber-700' : 'bg-amber-100 text-amber-800'
            }`}>
              {docsToVerify.length}
            </span>
          </button>

          {/* Classification 3: Approved & Download Ready */}
          <button
            onClick={() => setActiveClassification('approved')}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs transition-all flex items-center gap-2 cursor-pointer ${
              activeClassification === 'approved'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Approved & Download Ready</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
              activeClassification === 'approved' ? 'bg-white text-emerald-700' : 'bg-emerald-100 text-emerald-800'
            }`}>
              {docsApproved.length}
            </span>
          </button>

          {/* Classification 4: All 16 Documents */}
          <button
            onClick={() => setActiveClassification('all')}
            className={`px-3.5 py-2.5 rounded-xl font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer ${
              activeClassification === 'all'
                ? 'bg-slate-800 text-white shadow-xs'
                : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <span>All 16 Docs</span>
          </button>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-64 px-2">
          <Search className="w-4 h-4 text-slate-400 absolute left-5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search in this tab..."
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          />
        </div>
      </div>

      {/* Phase Filters Row */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs font-semibold">
        <button
          onClick={() => setSelectedPhase('All')}
          className={`px-3 py-1.5 rounded-xl transition-all whitespace-nowrap ${
            selectedPhase === 'All'
              ? 'bg-blue-600 text-white font-bold shadow-xs'
              : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
        >
          All Phases
        </button>

        {LIFECYCLE_PHASES.filter((p) => p !== 'All Phases').map((phase) => {
          const isSelected = selectedPhase === phase;
          return (
            <button
              key={phase}
              onClick={() => setSelectedPhase(phase)}
              className={`px-3 py-1.5 rounded-xl transition-all whitespace-nowrap border ${
                isSelected
                  ? 'bg-blue-600 text-white border-blue-600 font-bold shadow-xs'
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              {phase}
            </button>
          );
        })}
      </div>

      {/* ── Document Cards Grid (Clean, Compact, Tailored Actions) ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {filteredSlots.length === 0 ? (
          <div className="col-span-full py-16 text-center text-slate-400 bg-white rounded-3xl border border-dashed border-slate-300">
            <FileText className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="font-semibold text-sm text-slate-600">
              No documents in this classification
            </p>
            <p className="text-xs text-slate-400 mt-1">
              {activeClassification === 'to-fill'
                ? `No pending documents assigned to ${userRole} to fill in this project.`
                : activeClassification === 'to-verify'
                ? 'All documents have been verified or are not yet ready for authorization.'
                : activeClassification === 'approved'
                ? 'No documents approved yet. Fill and authorize required documents to generate downloads.'
                : 'Try adjusting filters to see other lifecycle documents.'}
            </p>
          </div>
        ) : (
          filteredSlots.map(({ template, existingDoc, status, isLocked, isApproved, isToVerify, hasContent, docToExport }) => {
            const phaseStyle = PHASE_COLORS[template.phase] || PHASE_COLORS['All Phases'];
            const linkedTasks = tasks.filter(
              (t) => (existingDoc && t.docId === existingDoc.id) || t.templateId === template.id
            );
            const verifiedTasksCount = linkedTasks.filter((t) => t.status === 'Verified').length;
            const completionLog = existingDoc?.content?.task_completion_log || [];
            const hasDownloadRecords = completionLog.length > 0 || verifiedTasksCount > 0 || isApproved;
            const isDownloadingThis = downloadingDocId === `${docToExport.id}-docx` || downloadingDocId === `${docToExport.id}-pdf`;

            return (
              <div
                key={template.id}
                className={`bg-white rounded-2xl border p-4 flex flex-col justify-between transition-all duration-200 shadow-xs hover:shadow-md ${
                  isApproved
                    ? 'border-emerald-200 hover:border-emerald-300'
                    : activeClassification === 'to-verify'
                    ? 'border-amber-200 hover:border-amber-300'
                    : isLocked
                    ? 'border-slate-200 bg-slate-50/70 opacity-90'
                    : 'border-slate-200 hover:border-blue-300'
                }`}
              >
                <div>
                  {/* Card Header: Number & Status Pill */}
                  <div className="flex items-center justify-between gap-2 mb-2.5">
                    <div
                      className={`w-7 h-7 rounded-xl font-extrabold text-xs flex items-center justify-center border transition-colors ${
                        isApproved
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : activeClassification === 'to-verify'
                          ? 'bg-amber-50 text-amber-700 border-amber-200'
                          : isLocked
                          ? 'bg-slate-100 text-slate-500 border-slate-200'
                          : 'bg-blue-50 text-blue-700 border-blue-100'
                      }`}
                    >
                      {isLocked ? <Lock className="w-3 h-3" /> : template.number}
                    </div>

                    <div className="flex items-center gap-1.5">
                      {/* Status Badges contextual to tab */}
                      {isApproved ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          <span>Approved</span>
                        </span>
                      ) : activeClassification === 'to-verify' || isToVerify ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 flex items-center gap-1">
                          {isExec ? <PenTool className="w-2.5 h-2.5 text-amber-600" /> : <Clock className="w-2.5 h-2.5 text-amber-600" />}
                          <span>{isExec ? 'Sign-off Required' : 'Awaiting CTO Sign-off'}</span>
                        </span>
                      ) : hasContent ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-50 text-cyan-800 border border-cyan-200 flex items-center gap-1">
                          <Sparkles className="w-2.5 h-2.5 text-cyan-600" />
                          <span>Populated ({existingDoc?.completion || 95}%)</span>
                        </span>
                      ) : isLocked ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200 flex items-center gap-1">
                          <Lock className="w-2.5 h-2.5" />
                          <span>Prereqs Pending</span>
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-100">
                          {existingDoc?.status || 'Draft'}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Title & Phase */}
                  <h4 className="font-bold text-xs text-slate-900 line-clamp-1">
                    {template.name}
                  </h4>
                  <p className="text-[10px] text-slate-400 font-medium mt-0.5">
                    Owner: <span className="text-slate-600 font-semibold">{template.ownerRole}</span> • {template.phase}
                  </p>

                  {/* Status / Task Sync Info */}
                  <div className="mt-3 pt-2 border-t border-slate-100">
                    {isApproved ? (
                      <div className="p-2 bg-emerald-50/60 rounded-xl border border-emerald-100 flex items-center justify-between text-[10px]">
                        <span className="text-slate-600 font-medium">Deliverables Log:</span>
                        <span className="font-bold text-emerald-700 flex items-center gap-1">
                          <FileCheck className="w-3 h-3 text-emerald-600" />
                          <span>{verifiedTasksCount > 0 ? `${verifiedTasksCount} Task(s) Synced` : 'Certified Record'}</span>
                        </span>
                      </div>
                    ) : activeClassification === 'to-verify' || isToVerify ? (
                      <div className="p-2 bg-amber-50/60 rounded-xl border border-amber-100 flex items-center justify-between text-[10px]">
                        <span className="text-amber-800 font-medium">Verification:</span>
                        <span className="font-bold text-amber-700">{isExec ? 'Awaiting Sign-off' : 'Pending CTO Review'}</span>
                      </div>
                    ) : hasContent ? (
                      <div className="p-2 bg-blue-50/50 rounded-xl border border-blue-100 flex items-center justify-between text-[10px] text-blue-900 font-medium">
                        <span>Workflow:</span>
                        <span className="font-bold text-blue-700 flex items-center gap-1">
                          <Sparkles className="w-3 h-3 text-blue-600" />
                          <span>Populated from Spec</span>
                        </span>
                      </div>
                    ) : (
                      <div className="p-2 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between text-[10px] text-slate-400">
                        <span>Workflow:</span>
                        <span>{isLocked ? 'Prerequisites Pending' : 'Ready to Fill'}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* ── Action Buttons contextual to each tab ── */}
                <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between gap-1.5">
                  {/* TAB 1: NEED TO BE FILLED ACTIONS (Fill/Edit Form + View, NO download, NO sign-off) */}
                  {activeClassification === 'to-fill' && (
                    <>
                      <div className="flex items-center gap-1">
                        {existingDoc && onSelectDocument && (
                          <button
                            onClick={() => onSelectDocument(existingDoc.id, activeProject.id)}
                            className="px-2.5 py-1 text-[10px] font-bold text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                          >
                            View
                          </button>
                        )}
                      </div>

                      {onEditDocument && (
                        (!isExec && (status === 'In Review' || status === 'Approved')) ? (
                          <button
                            onClick={() => existingDoc && onSelectDocument && onSelectDocument(existingDoc.id, activeProject.id)}
                            className="px-3 py-1.5 text-xs font-bold bg-slate-100 text-slate-600 hover:bg-slate-200 rounded-xl transition-all cursor-pointer flex items-center gap-1.5"
                          >
                            <Lock className="w-3.5 h-3.5 text-slate-400" />
                            <span>View (Locked)</span>
                          </button>
                        ) : (
                          <button
                            onClick={() => onEditDocument(existingDoc?.id || docToExport.id, activeProject.id)}
                            className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
                              isLocked
                                ? 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                : 'bg-blue-600 hover:bg-blue-700 text-white shadow-xs'
                            }`}
                          >
                            {isLocked ? <Lock className="w-3.5 h-3.5" /> : <Edit className="w-3.5 h-3.5" />}
                            <span>{isLocked ? 'View Gate' : hasContent ? 'Edit Form' : 'Fill Form'}</span>
                          </button>
                        )
                      )}
                    </>
                  )}

                  {/* TAB 2: SIGNATURES & AUTHORIZATIONS ACTIONS (CTO only signs; PM views submitted doc) */}
                  {activeClassification === 'to-verify' && (
                    <>
                      <div className="flex items-center gap-1">
                        {existingDoc && onSelectDocument && (
                          <button
                            onClick={() => onSelectDocument(existingDoc.id, activeProject.id)}
                            className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
                              isExec
                                ? 'text-slate-600 hover:text-blue-600 hover:bg-blue-50'
                                : 'bg-blue-600 hover:bg-blue-700 text-white shadow-xs'
                            }`}
                          >
                            <FileText className="w-3.5 h-3.5" />
                            <span>{isExec ? 'View' : 'View Submitted Doc'}</span>
                          </button>
                        )}
                      </div>

                      {isExec && onEditDocument && (
                        <button
                          onClick={() => onEditDocument(existingDoc?.id || docToExport.id, activeProject.id)}
                          className="px-3 py-1.5 text-xs font-bold bg-amber-500 hover:bg-amber-600 text-white rounded-xl shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
                        >
                          <PenTool className="w-3.5 h-3.5" />
                          <span>Sign & Authorize</span>
                        </button>
                      )}
                    </>
                  )}

                  {/* TAB 3: APPROVED & DOWNLOAD READY ACTIONS (Direct .docx and .pdf downloads) */}
                  {activeClassification === 'approved' && (
                    <>
                      <div className="flex items-center gap-1">
                        {existingDoc && onSelectDocument && (
                          <button
                            onClick={() => onSelectDocument(existingDoc.id, activeProject.id)}
                            className="px-2 py-1 text-[10px] font-bold text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                          >
                            View
                          </button>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={(e) => handleDownloadDocx(e, docToExport)}
                          disabled={isDownloadingThis}
                          className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
                          title="Download official Word Document with task completion records"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>.docx</span>
                        </button>

                        <button
                          onClick={(e) => handleDownloadPdf(e, docToExport)}
                          disabled={isDownloadingThis}
                          className="px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
                          title="Download official PDF document"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>.pdf</span>
                        </button>
                      </div>
                    </>
                  )}

                  {/* TAB 4: ALL 16 DOCS ACTIONS */}
                  {activeClassification === 'all' && (
                    <>
                      <div className="flex items-center gap-1">
                        {existingDoc && onSelectDocument && (
                          <button
                            onClick={() => onSelectDocument(existingDoc.id, activeProject.id)}
                            className="px-2 py-1 text-[10px] font-bold text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                          >
                            View
                          </button>
                        )}

                        {onEditDocument && (isExec || (status !== 'In Review' && status !== 'Approved')) && (
                          <button
                            onClick={() => onEditDocument(existingDoc?.id || docToExport.id, activeProject.id)}
                            className="px-2 py-1 text-[10px] font-bold text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                          >
                            Edit
                          </button>
                        )}
                      </div>

                      {isApproved && (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={(e) => handleDownloadDocx(e, docToExport)}
                            disabled={isDownloadingThis}
                            className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg text-[10px] font-bold flex items-center gap-0.5 cursor-pointer transition-colors"
                          >
                            <Download className="w-3 h-3" />
                            <span>.docx</span>
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
