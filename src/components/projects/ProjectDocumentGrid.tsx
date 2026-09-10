import React, { useState } from 'react';
import { Project, ProjectDocument, LifecyclePhase, UserRole } from '../../types';
import { DOCUMENT_TEMPLATES, LIFECYCLE_PHASES, PHASE_COLORS, isTemplateAllowedForUser } from '../../constants/documentTemplates';
import { isDocumentEditable } from '../../constants/documentDependencyGraph';
import { StatusBadge } from '../common/StatusBadge';
import { 
  Search, 
  ChevronRight, 
  Edit, 
  Download, 
  Zap, 
  FileText, 
  CheckCircle2,
  Sparkles,
  Lock
} from 'lucide-react';
import { exportService } from '../../services/exportService';
import { documentService } from '../../services/documentService';
import { useAuth } from '../../context/AuthContext';

interface ProjectDocumentGridProps {
  project: Project;
  documents: ProjectDocument[];
  onSelectDocument: (docId: string) => void;
  onEditDocument: (docId: string) => void;
  onDocumentUpdated?: (updatedDoc: ProjectDocument) => void;
}

export const ProjectDocumentGrid: React.FC<ProjectDocumentGridProps> = ({
  project,
  documents,
  onSelectDocument,
  onEditDocument,
  onDocumentUpdated,
}) => {
  const { user, documentBranding } = useAuth();
  const [selectedPhase, setSelectedPhase] = useState<LifecyclePhase | 'All'>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [actionInProgressDocId, setActionInProgressDocId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Filter templates matching user's role/designation (Master Document #0 is strictly CTO only)
  const allowedTemplates = DOCUMENT_TEMPLATES.filter((tpl) =>
    isTemplateAllowedForUser(tpl, user?.role || 'Employee', user?.designation)
  );

  // Map each template definition to the corresponding document instance for this project
  const templateDocMap = allowedTemplates.map((tpl) => {
    const existingDoc = documents.find(
      (d) => d.projectId === project.id && (d.templateId === tpl.id || d.docNumber === `PL-${tpl.id.toString().padStart(2, '0')}` || d.name.toLowerCase() === tpl.name.toLowerCase())
    );
    return {
      template: tpl,
      doc: existingDoc,
    };
  });

  // Filter templates by phase and search query
  const filteredTemplates = templateDocMap.filter(({ template }) => {
    const matchesPhase = selectedPhase === 'All' || template.phase === selectedPhase || template.phase === 'All Phases';
    const matchesSearch =
      template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.shortName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.number.includes(searchQuery);

    return matchesPhase && matchesSearch;
  });

  // Handle single-click Auto-Fill
  const handleAutoFill = async (e: React.MouseEvent, tplId: number, doc?: ProjectDocument) => {
    e.stopPropagation();
    if (!user) return;
    const targetDocId = doc?.id || `doc-${project.id}-${tplId}`;
    setActionInProgressDocId(targetDocId);

    try {
      const updated = await documentService.autoFillAndSaveDocument(
        targetDocId,
        tplId,
        project,
        user.id,
        user.fullName
      );
      if (onDocumentUpdated) {
        onDocumentUpdated(updated);
      }
      showToast(`Document #${tplId} "${doc?.name || 'Template'}" auto-populated with project variables!`);
    } catch (err) {
      console.error('Failed to auto-fill document:', err);
      showToast('Error auto-filling document template.');
    } finally {
      setActionInProgressDocId(null);
    }
  };

  // Handle direct download with branding
  const handleDownload = async (e: React.MouseEvent, tplId: number, doc?: ProjectDocument) => {
    e.stopPropagation();
    const docToExport: ProjectDocument = doc || {
      id: `doc-${project.id}-${tplId}`,
      projectId: project.id,
      projectName: project.name,
      templateId: tplId,
      docNumber: `DOC-${tplId.toString().padStart(2, '0')}`,
      name: DOCUMENT_TEMPLATES.find((t) => t.id === tplId)?.name || 'Document',
      phase: DOCUMENT_TEMPLATES.find((t) => t.id === tplId)?.phase || 'Initiate',
      version: '1.0',
      status: 'Draft',
      completion: 25,
      ownerName: project.pmName,
      ownerId: project.pmId,
      createdAt: project.startDate,
      lastUpdated: new Date().toLocaleDateString('en-GB'),
      description: `Digitized template #${tplId}`,
      content: documentService.generateAutoFillContent(tplId, project, user?.fullName),
    };

    setActionInProgressDocId(docToExport.id);
    try {
      await exportService.autoFillAndExportDocx(
        docToExport,
        project,
        documentBranding,
        user?.organizationName,
        user?.fullName
      );
      showToast(`Downloaded "${docToExport.name}.docx"`);
    } catch (err) {
      console.error('Failed to export document:', err);
      showToast('Failed to generate document export.');
    } finally {
      setActionInProgressDocId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2 border border-slate-700 text-xs animate-slide-up">
          <Sparkles className="w-4 h-4 text-cyan-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs font-semibold">
          <button
            onClick={() => setSelectedPhase('All')}
            className={`px-3 py-1.5 rounded-xl transition-all whitespace-nowrap ${
              selectedPhase === 'All'
                ? 'bg-blue-600 text-white shadow-xs font-bold'
                : 'bg-slate-50 border border-slate-200 text-slate-600 hover:bg-slate-100'
            }`}
          >
            All 16 Templates
          </button>

          {LIFECYCLE_PHASES.filter((p) => p !== 'All Phases').map((phase) => {
            const isSelected = selectedPhase === phase;
            return (
              <button
                key={phase}
                onClick={() => setSelectedPhase(phase)}
                className={`px-3 py-1.5 rounded-xl transition-all whitespace-nowrap border ${
                  isSelected
                    ? 'bg-blue-600 text-white border-blue-600 shadow-xs font-bold'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                {phase}
              </button>
            );
          })}
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search templates..."
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          />
        </div>
      </div>

      {/* 4-Column Template Matrix matching user design */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {filteredTemplates.map(({ template, doc }) => {
          const phaseStyle = PHASE_COLORS[template.phase] || PHASE_COLORS['All Phases'];
          const isBusy = actionInProgressDocId === (doc?.id || `doc-${project.id}-${template.id}`);
          const projectDocs = documents.filter((d) => d.projectId === project.id);
          const isExec = ['CEO', 'MD', 'COO', 'CTO', 'CIO'].includes(user?.role || '');
          const editCheck = isDocumentEditable(template.id, (user?.role || 'Employee') as UserRole, projectDocs);
          const isLocked = !isExec && !editCheck.editable;

          return (
            <div
              key={template.id}
              onClick={() => {
                if (doc) onSelectDocument(doc.id);
                else if (onEditDocument) onEditDocument(`doc-${project.id}-${template.id}`);
              }}
              className={`bg-white rounded-2xl border p-5 shadow-xs hover:shadow-md transition-all duration-200 cursor-pointer flex flex-col justify-between group relative overflow-hidden ${
                isLocked ? 'border-slate-200/60 bg-slate-50/40 opacity-90' : 'border-slate-200 hover:border-blue-300'
              }`}
            >
              {/* Left Accent Bar */}
              <div className="absolute top-0 bottom-0 left-0 w-1 bg-blue-600 opacity-0 group-hover:opacity-100 transition-opacity" />

              <div>
                {/* Number Pill & Phase Badge */}
                <div className="flex items-center justify-between gap-2 mb-3">
                  <div className={`w-8 h-8 rounded-xl font-extrabold text-sm flex items-center justify-center border transition-colors ${
                    isLocked 
                      ? 'bg-slate-100 text-slate-500 border-slate-200' 
                      : 'bg-blue-50 text-blue-700 border-blue-100 group-hover:bg-blue-600 group-hover:text-white'
                  }`}>
                    {isLocked ? <Lock className="w-3.5 h-3.5" /> : template.number}
                  </div>
                  <div className="flex items-center gap-1.5">
                    {doc && doc.completion === 100 && (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                    )}
                    {isLocked ? (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border bg-amber-50 text-amber-800 border-amber-200 flex items-center gap-1">
                        <Lock className="w-2.5 h-2.5" />
                        <span>Prereqs Pending</span>
                      </span>
                    ) : (
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${phaseStyle.bg} ${phaseStyle.text} ${phaseStyle.border}`}
                      >
                        {template.phase}
                      </span>
                    )}
                  </div>
                </div>

                {/* Template Name */}
                <h3 className="font-bold text-sm text-slate-900 group-hover:text-blue-600 transition-colors line-clamp-1">
                  {template.name}
                </h3>

                {/* Owner Role */}
                <p className="text-[11px] text-slate-400 font-medium mt-0.5">
                  Owner: <span className="text-slate-600 font-semibold">{template.ownerRole}</span>
                </p>

                {/* Description */}
                <p className="text-xs text-slate-500 mt-2 line-clamp-2 leading-relaxed">
                  {template.description}
                </p>

                {/* Completion bar if document exists */}
                {doc && (
                  <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">Completion</span>
                    <span className="font-bold text-blue-600">{doc.completion}%</span>
                  </div>
                )}
              </div>

              {/* Action Buttons Toolbar */}
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-[11px] font-semibold text-blue-600 group-hover:underline flex items-center gap-1">
                  <span>View Details</span>
                  <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                </span>

                <div className="flex items-center gap-1">
                  {/* Auto-Fill Button */}
                  <button
                    onClick={(e) => handleAutoFill(e, template.id, doc)}
                    disabled={isBusy}
                    title="Auto-fill document with Project details"
                    className="p-1.5 rounded-lg text-amber-600 hover:text-amber-700 hover:bg-amber-50 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    <Zap className="w-3.5 h-3.5" />
                  </button>

                  {/* Download DOCX Button */}
                  <button
                    onClick={(e) => handleDownload(e, template.id, doc)}
                    disabled={isBusy}
                    title="Download branded Word Document (.docx)"
                    className="p-1.5 rounded-lg text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </button>

                  {/* Edit Form Button */}
                  {doc && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onEditDocument(doc.id);
                      }}
                      title="Edit Document Form"
                      className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
                    >
                      <Edit className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
