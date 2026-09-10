import React, { useState, useEffect } from 'react';
import { Project, ProjectDocument, Task, TeamMember, UserRole } from '../../types';
import { DOCUMENT_TEMPLATES, isTemplateAllowedForUser } from '../../constants/documentTemplates';
import { isDocumentEditable } from '../../constants/documentDependencyGraph';
import { 
  CheckCircle2, 
  FolderKanban, 
  Users, 
  FileText, 
  CheckSquare, 
  ArrowRight, 
  ArrowLeft, 
  Save, 
  Sparkles, 
  Download, 
  Zap, 
  Plus, 
  Calendar,
  Building,
  Shield,
  Layers,
  Edit3,
  Lock,
  UploadCloud
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { exportService } from '../../services/exportService';
import { documentService } from '../../services/documentService';
import { teamService } from '../../services/teamService';
import { auditService } from '../../services/auditService';
import { documentIngestionService } from '../../services/documentIngestionService';

interface ProjectOnboardingPanelProps {
  project: Project;
  onClose?: () => void;
  onSelectDocument?: (docId: string) => void;
  onEditDocument?: (docId: string) => void;
  onNavigateToDocument?: (docId: string) => void;
}

function formatToDateInputValue(dateStr?: string): string {
  if (!dateStr) return new Date().toISOString().split('T')[0];
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
  if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(dateStr)) {
    const [day, month, year] = dateStr.split('/');
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }
  const d = new Date(dateStr);
  if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
  return new Date().toISOString().split('T')[0];
}

export const ProjectOnboardingPanel: React.FC<ProjectOnboardingPanelProps> = ({
  project,
  onClose,
  onSelectDocument,
  onEditDocument,
  onNavigateToDocument,
}) => {
  const { user, documentBranding, isFullAccessAdmin } = useAuth();
  const { updateProject, documents, tasks, assignTask, teamMembers, addTeamMember } = useData();

  const isCtoRole = Boolean(isFullAccessAdmin || user?.role === 'CTO' || ['CEO', 'MD', 'COO', 'CIO'].includes(user?.role || ''));
  const isPmRole = user?.role === 'PM';

  const allowedTemplates = DOCUMENT_TEMPLATES.filter((tpl) =>
    isTemplateAllowedForUser(tpl, user?.role || 'Employee', user?.designation)
  );
  const canEditProjectParameters = Boolean(isFullAccessAdmin || user?.role === 'PM');

  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1);
  const [isSaving, setIsSaving] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [handoverRemarks, setHandoverRemarks] = useState<string>('');
  const [orgMembers, setOrgMembers] = useState<Array<{ id: string; authUserId: string; fullName: string; email: string; role: UserRole; designation: string; department: string }>>([]);

  useEffect(() => {
    const fetchMembers = async () => {
      const members = await teamService.getOrgMembers(user?.organizationId);
      if (members && members.length > 0) {
        setOrgMembers(members);
      } else if (user) {
        setOrgMembers([
          {
            id: user.id,
            authUserId: user.id,
            fullName: user.fullName,
            email: user.email,
            role: user.role,
            designation: user.designation,
            department: user.department,
          }
        ]);
      }
    };
    fetchMembers();
  }, [user?.organizationId, user?.id]);

  // Leadership Edit Toggle States
  const [isEditingPm, setIsEditingPm] = useState(false);
  const [isEditingTl, setIsEditingTl] = useState(false);

  // Form State initialized from project & teamMembers
  const [formData, setFormData] = useState(() => {
    const pmMem = teamMembers.find((m) => m.projectId === project.id && m.role === 'PM');
    const tlMem = teamMembers.find((m) => m.projectId === project.id && m.role === 'TL');
    return {
      name: project.name,
      code: project.code,
      client: project.client,
      sponsor: project.sponsor || 'CTO Office',
      department: project.department || 'Engineering',
      priority: project.priority || 'High',
      startDate: project.startDate,
      targetEndDate: project.targetEndDate,
      description: project.description || '',
      pmName: project.pmName || pmMem?.name || '',
      pmId: project.pmId || pmMem?.id || '',
      tlName: tlMem?.name || '',
      tlId: tlMem?.id || '',
    };
  });

  useEffect(() => {
    const pmMem = teamMembers.find((m) => m.projectId === project.id && m.role === 'PM');
    const tlMem = teamMembers.find((m) => m.projectId === project.id && m.role === 'TL');
    setFormData((prev) => ({
      ...prev,
      pmName: prev.pmName || project.pmName || pmMem?.name || '',
      pmId: prev.pmId || project.pmId || pmMem?.id || '',
      tlName: prev.tlName || tlMem?.name || '',
      tlId: prev.tlId || tlMem?.id || '',
    }));
  }, [project.id, project.pmName, project.pmId, teamMembers]);

  // Task creation draft state for Step 4
  const [draftTask, setDraftTask] = useState<{
    title: string;
    description: string;
    assignedToRole: UserRole;
    assignedToName: string;
    dueDate: string;
  }>({
    title: '',
    description: '',
    assignedToRole: isCtoRole ? 'PM' : 'Employee',
    assignedToName: '',
    dueDate: formatToDateInputValue(project.targetEndDate),
  });

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  const projectDocs = documents.filter((d) => d.projectId === project.id);
  const projectTasks = tasks.filter((t) => t.projectId === project.id);

  // Save Project Changes
  const handleSaveStep1And2 = async () => {
    setIsSaving(true);
    try {
      await updateProject(project.id, {
        name: formData.name,
        code: formData.code,
        client: formData.client,
        sponsor: formData.sponsor,
        department: formData.department,
        priority: formData.priority as any,
        startDate: formData.startDate,
        targetEndDate: formData.targetEndDate,
        description: formData.description,
        pmName: formData.pmName,
        pmId: formData.pmId,
      });

      // If PM was changed/swapped, record Handover Audit Log with remarks
      if (formData.pmName && project.pmName && formData.pmName !== project.pmName && user) {
        await auditService.logAction(
          user.id,
          user.fullName,
          user.role,
          'Leadership Handover',
          'Project',
          project.id,
          `Project Manager swapped from "${project.pmName}" to "${formData.pmName}". Handover Remarks: "${handoverRemarks || 'Formal transition of project governance and deliverables.'}"`,
          user.organizationId
        );
      }

      // If PM is assigned, ensure they are registered in project team members (PM reports to CTO / assigner)
      let resolvedPmId = formData.pmId;
      if (formData.pmName && user) {
        const selPm = orgMembers.find((m) => m.fullName === formData.pmName);
        const pmUserId = selPm?.authUserId || selPm?.id || formData.pmId;
        resolvedPmId = pmUserId;
        const existingPm = teamMembers.find(
          (m) => m.projectId === project.id && (m.id === pmUserId || m.name === formData.pmName)
        );
        if (!existingPm) {
          await addTeamMember({
            id: pmUserId,
            projectId: project.id,
            name: formData.pmName,
            email: selPm?.email || `${formData.pmName.toLowerCase().replace(/\s+/g, '.')}@swaxthika.com`,
            role: 'PM',
            designation: selPm?.designation || 'Project Manager',
            department: selPm?.department || 'Management',
            accessLevel: 'Full Access',
            reportsTo: user.id, // PM reports to CTO / Executive Sponsor
          });
        }
      }

      // If TL is assigned, ensure they are registered in project team members (TL reports to PM)
      let resolvedTlId = formData.tlId;
      if (formData.tlName && user) {
        const selTl = orgMembers.find((m) => m.fullName === formData.tlName);
        const tlUserId = selTl?.authUserId || selTl?.id || formData.tlId;
        resolvedTlId = tlUserId;
        const existingTl = teamMembers.find(
          (m) => m.projectId === project.id && (m.id === tlUserId || m.name === formData.tlName)
        );
        if (!existingTl) {
          await addTeamMember({
            id: tlUserId,
            projectId: project.id,
            name: formData.tlName,
            email: selTl?.email || `${formData.tlName.toLowerCase().replace(/\s+/g, '.')}@swaxthika.com`,
            role: 'TL',
            designation: selTl?.designation || 'Technical Lead',
            department: selTl?.department || 'Engineering',
            accessLevel: 'Team Access',
            reportsTo: resolvedPmId || user.id, // TL reports to assigned PM
          });
        }
      }

      showToast('Project onboarding parameters updated successfully!');
    } catch (err) {
      console.error(err);
      showToast('Failed to save project parameters.');
    } finally {
      setIsSaving(false);
    }
  };

  // Step 3: Batch Auto-Fill all allowed templates for this project
  const handleBatchAutoFillAllDocs = async () => {
    setIsSaving(true);
    if (!user) return;
    try {
      let count = 0;
      for (const tpl of allowedTemplates) {
        const docId = `doc-${project.id}-${tpl.id}`;
        await documentService.autoFillAndSaveDocument(
          docId,
          tpl.id,
          { ...project, ...formData },
          user.id,
          user.fullName
        );
        count++;
      }
      showToast(`Successfully auto-filled ${count} project document templates!`);
    } catch (err) {
      console.error(err);
      showToast('Error during batch document auto-fill.');
    } finally {
      setIsSaving(false);
    }
  };

  // Quick download a specific template filled with project data
  const handleDownloadDoc = async (tplId: number) => {
    const tpl = DOCUMENT_TEMPLATES.find((t) => t.id === tplId);
    if (!tpl) return;

    const docToExport: ProjectDocument = {
      id: `doc-${project.id}-${tplId}`,
      projectId: project.id,
      projectName: formData.name,
      templateId: tplId,
      docNumber: `PL-${tplId.toString().padStart(2, '0')}`,
      name: tpl.name,
      phase: tpl.phase,
      version: '1.0',
      status: 'Approved',
      completion: 100,
      ownerName: formData.pmName || user?.fullName || 'CTO',
      ownerId: formData.pmId || user?.id || '',
      createdAt: formData.startDate,
      lastUpdated: new Date().toLocaleDateString('en-GB'),
      description: tpl.description,
      content: documentService.generateAutoFillContent(tplId, { ...project, ...formData }, user?.fullName),
    };

    try {
      await exportService.autoFillAndExportDocx(
        docToExport,
        formData,
        documentBranding,
        user?.organizationName,
        user?.fullName
      );
      showToast(`Exported "${tpl.name}.docx"`);
    } catch (err) {
      console.error(err);
      showToast('Failed to download document.');
    }
  };

  // Step 4: Quick Add Task
  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!draftTask.title.trim() || !user) return;

    const selMember = orgMembers.find((m) => m.fullName === draftTask.assignedToName);
    const resolvedAssigneeId = selMember?.authUserId || selMember?.id || draftTask.assignedToName;

    try {
      await assignTask({
        projectId: project.id,
        projectName: formData.name,
        title: draftTask.title,
        description: draftTask.description || `Deliverable task for ${formData.name}`,
        assignedBy: user.id,
        assignedByName: user.fullName,
        assignedByRole: user.role,
        assignedTo: resolvedAssigneeId || 'Unassigned',
        assignedToName: draftTask.assignedToName || 'Team Member',
        assignedToRole: draftTask.assignedToRole,
        assignedToDesignation: draftTask.assignedToRole === 'PM' ? 'Project Manager' : draftTask.assignedToRole === 'TL' ? 'Technical Lead' : 'Software Engineer',
        status: 'Open',
        priority: 'High',
        dueDate: formatToDateInputValue(draftTask.dueDate),
        progress: 0,
        referenceFiles: [
          {
            id: `ref-${Date.now()}`,
            name: `${formData.name} - Project Spec.pdf`,
            type: 'file',
            url: '#',
          },
        ],
      });

      setDraftTask({
        title: '',
        description: '',
        assignedToRole: isCtoRole ? 'PM' : 'Employee',
        assignedToName: '',
        dueDate: formatToDateInputValue(project.targetEndDate),
      });
      showToast('Task delegated and assigned successfully!');
    } catch (err) {
      console.error(err);
      showToast('Failed to create task.');
    }
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-md p-6 lg:p-8 space-y-8 animate-fade-in relative overflow-hidden">
      {/* Toast */}
      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2 border border-slate-700 text-xs">
          <Sparkles className="w-4 h-4 text-cyan-400" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Header & Steps Stepper */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-6">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-cyan-500 text-white flex items-center justify-center font-bold">
              <FolderKanban className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
                Project Onboarding & Lifecycle Hub
              </h2>
              <p className="text-xs text-slate-500">
                Setup project governance, team assignments, document automation, and task delegation
              </p>
            </div>
          </div>
        </div>

        {/* Step Indicator Tabs */}
        <div className="flex items-center gap-2">
          {[
            { step: 1, label: 'Identity & Scope' },
            { step: 2, label: 'Roles & PM' },
            { step: 3, label: 'Documents & Templates' },
            { step: 4, label: 'Task Delegation' },
          ].map((s) => (
            <button
              key={s.step}
              onClick={() => setCurrentStep(s.step as any)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                currentStep === s.step
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
              }`}
            >
              <span
                className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${
                  currentStep === s.step ? 'bg-white text-blue-600' : 'bg-slate-200 text-slate-600'
                }`}
              >
                {s.step}
              </span>
              <span className="hidden md:inline">{s.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* STEP 1: Project Identity & Scope */}
      {currentStep === 1 && (
        <div className="space-y-6">
          {!isCtoRole && (
            <div className="p-4 bg-blue-50/70 border border-blue-200 rounded-2xl flex items-center gap-3 text-xs text-blue-900 animate-fade-in">
              <Shield className="w-5 h-5 text-blue-600 shrink-0" />
              <div>
                <p className="font-bold">Executive Project Charter (Read-Only)</p>
                <p className="text-[11px] text-blue-700 mt-0.5">
                  Project identity, client specs, and baseline milestones are established by the CTO / Executive Sponsor. As Project Manager, you have governance and delegation authority in Steps 2, 3, and 4.
                </p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Project Name *
              </label>
              <input
                type="text"
                disabled={!isCtoRole}
                readOnly={!isCtoRole}
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className={`w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 ${
                  !isCtoRole ? 'cursor-not-allowed opacity-80' : ''
                }`}
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Project Code
              </label>
              <input
                type="text"
                disabled={!isCtoRole}
                readOnly={!isCtoRole}
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                className={`w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl font-mono ${
                  !isCtoRole ? 'cursor-not-allowed opacity-80' : ''
                }`}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Client / Company *
              </label>
              <input
                type="text"
                disabled={!isCtoRole}
                readOnly={!isCtoRole}
                value={formData.client}
                onChange={(e) => setFormData({ ...formData, client: e.target.value })}
                className={`w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl ${
                  !isCtoRole ? 'cursor-not-allowed opacity-80' : ''
                }`}
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Executive Sponsor
              </label>
              <input
                type="text"
                disabled={!isCtoRole}
                readOnly={!isCtoRole}
                value={formData.sponsor}
                onChange={(e) => setFormData({ ...formData, sponsor: e.target.value })}
                className={`w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl ${
                  !isCtoRole ? 'cursor-not-allowed opacity-80' : ''
                }`}
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Department
              </label>
              <select
                disabled={!isCtoRole}
                value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                className={`w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl ${
                  !isCtoRole ? 'cursor-not-allowed opacity-80' : ''
                }`}
              >
                <option value="Web Development">Web Development</option>
                <option value="Mobile Engineering">Mobile Engineering</option>
                <option value="AI & Data Platforms">AI & Data Platforms</option>
                <option value="Cloud Ops & DevOps">Cloud Ops & DevOps</option>
                <option value="Enterprise Architecture">Enterprise Architecture</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-slate-400" /> Start Date
              </label>
              <input
                type="text"
                disabled={!isCtoRole}
                readOnly={!isCtoRole}
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                className={`w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl font-mono ${
                  !isCtoRole ? 'cursor-not-allowed opacity-80' : ''
                }`}
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-slate-400" /> Target End Date
              </label>
              <input
                type="text"
                disabled={!isCtoRole}
                readOnly={!isCtoRole}
                value={formData.targetEndDate}
                onChange={(e) => setFormData({ ...formData, targetEndDate: e.target.value })}
                className={`w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl font-mono ${
                  !isCtoRole ? 'cursor-not-allowed opacity-80' : ''
                }`}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Project Overview & Objectives (Written by CTO)
            </label>
            <textarea
              rows={4}
              disabled={!isCtoRole}
              readOnly={!isCtoRole}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Detail the technical architecture, deliverables, business expectations, and milestone checkpoints..."
              className={`w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl leading-relaxed resize-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 ${
                !isCtoRole ? 'cursor-not-allowed opacity-80' : ''
              }`}
            />
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-slate-100">
            {isCtoRole ? (
              <button
                type="button"
                onClick={handleSaveStep1And2}
                disabled={isSaving}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer transition-colors"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Save Draft</span>
              </button>
            ) : <div />}

            <button
              type="button"
              onClick={() => setCurrentStep(2)}
              className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs cursor-pointer transition-all transform hover:-translate-y-0.5"
            >
              <span>Next: Team Assignments</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: Role Allocation */}
      {currentStep === 2 && (
        <div className="space-y-6">
          <div className="p-4 rounded-2xl bg-blue-50/50 border border-blue-100 text-xs text-blue-900 flex items-center gap-3">
            <Shield className="w-5 h-5 text-blue-600 shrink-0" />
            <div>
              <p className="font-bold">Project Governance Assignment</p>
              <p className="text-blue-700/80 text-[11px]">
                Assign the Project Manager (PM) and Technical Lead (TL) responsible for delivering this project.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* PM Selection / Assigned Box */}
            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                  Assigned Project Manager (PM)
                </span>
                {formData.pmName && !isEditingPm && isCtoRole && (
                  <button
                    type="button"
                    onClick={() => setIsEditingPm(true)}
                    className="px-2.5 py-1 text-[11px] font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <Edit3 className="w-3 h-3" />
                    <span>Change</span>
                  </button>
                )}
              </div>

              {formData.pmName && !isEditingPm ? (
                <div className="p-3.5 bg-white rounded-xl border border-blue-200 shadow-xs flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-cyan-500 text-white font-bold text-sm flex items-center justify-center shadow-xs">
                      {formData.pmName.charAt(0)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-xs text-slate-900">{formData.pmName}</h4>
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 border border-blue-200">
                          PM
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                        {orgMembers.find((m) => m.fullName === formData.pmName)?.designation || 'Project Manager'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-[11px] text-emerald-600 font-bold bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Assigned</span>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <select
                    value={formData.pmName}
                    onChange={(e) => {
                      const sel = orgMembers.find((m) => m.fullName === e.target.value);
                      setFormData({
                        ...formData,
                        pmName: e.target.value,
                        pmId: sel?.authUserId || sel?.id || formData.pmId,
                      });
                      if (e.target.value) setIsEditingPm(false);
                    }}
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl font-semibold focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer"
                  >
                    <option value="">-- Select Project Manager --</option>
                    {orgMembers.map((m) => (
                      <option key={m.id} value={m.fullName}>
                        {m.fullName} ({m.role} • {m.designation})
                      </option>
                    ))}
                  </select>
                  {isEditingPm && (
                    <button
                      type="button"
                      onClick={() => setIsEditingPm(false)}
                      className="text-[11px] text-slate-500 hover:text-slate-700 underline cursor-pointer"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              )}
              <p className="text-[11px] text-slate-500 leading-relaxed">
                The PM oversees document approvals, timelines, sprint planning, and client communications.
              </p>
            </div>

            {/* TL Selection / Assigned Box */}
            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                  Assigned Technical Lead (TL)
                </span>
                {formData.tlName && !isEditingTl && (
                  isCtoRole ? (
                    <button
                      type="button"
                      onClick={() => setIsEditingTl(true)}
                      className="px-2.5 py-1 text-[11px] font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      <Edit3 className="w-3 h-3" />
                      <span>Change</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setIsEditingTl(true)}
                      className="px-2.5 py-1 text-[11px] font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      <Edit3 className="w-3 h-3" />
                      <span>Request Change to CTO</span>
                    </button>
                  )
                )}
              </div>

              {formData.tlName && !isEditingTl ? (
                <div className="p-3.5 bg-white rounded-xl border border-blue-200 shadow-xs flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-500 text-white font-bold text-sm flex items-center justify-center shadow-xs">
                      {formData.tlName.charAt(0)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-xs text-slate-900">{formData.tlName}</h4>
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-700 border border-indigo-200">
                          TL
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                        {orgMembers.find((m) => m.fullName === formData.tlName)?.designation || 'Technical Lead'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-[11px] text-emerald-600 font-bold bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Assigned</span>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <select
                    value={formData.tlName}
                    onChange={(e) => {
                      const sel = orgMembers.find((m) => m.fullName === e.target.value);
                      setFormData({
                        ...formData,
                        tlName: e.target.value,
                        tlId: sel?.authUserId || sel?.id || formData.tlId,
                      });
                      if (e.target.value) setIsEditingTl(false);
                    }}
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl font-semibold focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer"
                  >
                    <option value="">-- Select Technical Lead --</option>
                    {orgMembers.map((m) => (
                      <option key={m.id} value={m.fullName}>
                        {m.fullName} ({m.role} • {m.designation})
                      </option>
                    ))}
                  </select>
                  {isEditingTl && (
                    <button
                      type="button"
                      onClick={() => setIsEditingTl(false)}
                      className="text-[11px] text-slate-500 hover:text-slate-700 underline cursor-pointer"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              )}
              <p className="text-[11px] text-slate-500 leading-relaxed">
                The TL manages architecture, code specifications, technical reviews, and engineering tasks.
              </p>
            </div>
          </div>

          {/* Role Handover Remarks Notice */}
          {Boolean(formData.pmName && project.pmName && formData.pmName !== project.pmName) && (
            <div className="p-4 rounded-2xl bg-amber-50/80 border border-amber-200 text-xs space-y-2 animate-fade-in">
              <div className="flex items-center gap-2 text-amber-900 font-bold">
                <Sparkles className="w-4 h-4 text-amber-600" />
                <span>Project Leadership Handover Detected</span>
              </div>
              <p className="text-amber-800 text-[11px] leading-relaxed">
                You are transitioning Project Leadership from <strong>{project.pmName}</strong> to <strong>{formData.pmName}</strong>. Previous contributions, document versions, and tasks created by {project.pmName} will be preserved in the immutable audit ledger.
              </p>
              <div>
                <label className="block text-[11px] font-bold text-amber-900 uppercase tracking-wider mb-1">
                  Handover Remarks / Transition Note *
                </label>
                <textarea
                  rows={2}
                  value={handoverRemarks}
                  onChange={(e) => setHandoverRemarks(e.target.value)}
                  placeholder="e.g. Handover of sprint delivery, technical specifications, and client milestones..."
                  className="w-full px-3 py-2 text-xs bg-white border border-amber-300 rounded-xl focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 resize-none"
                />
              </div>
            </div>
          )}

          {/* Team Members Allocation */}
          <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Organization Team Members ({orgMembers.length})
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {orgMembers.map((member) => (
                <div key={member.id} className="p-3 bg-white rounded-xl border border-slate-200 flex items-center gap-2.5 shadow-xs">
                  <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-bold text-xs flex items-center justify-center shrink-0">
                    {member.fullName.charAt(0)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <p className="font-bold text-xs text-slate-800 truncate">{member.fullName}</p>
                      <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-blue-50 text-blue-700 border border-blue-100 shrink-0">
                        {member.role}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-400 truncate">{member.designation}</p>
                  </div>
                </div>
              ))}
              {orgMembers.length === 0 && (
                <p className="text-xs text-slate-400 col-span-3 py-2">
                  All active organization members will have scoped access to this project.
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setCurrentStep(1)}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </button>

            <button
              type="button"
              onClick={() => {
                handleSaveStep1And2();
                setCurrentStep(3);
              }}
              className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs cursor-pointer transition-all transform hover:-translate-y-0.5"
            >
              <span>Next: Document Automation</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: Document Automation */}
      {currentStep === 3 && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-blue-50/60 p-5 rounded-2xl border border-blue-100">
            <div>
              <h3 className="text-sm font-bold text-blue-900 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-blue-600" />
                <span>16 Digitized Template Automation Engine</span>
              </h3>
              <p className="text-xs text-blue-700/80 mt-1">
                Auto-fill all standard documents with project parameters and download them directly formatted in Word (.docx).
              </p>
            </div>

            <div className="flex items-center gap-2.5 shrink-0">
              <label
                className="px-3.5 py-2.5 bg-white hover:bg-slate-50 text-blue-700 font-bold text-xs rounded-xl border border-blue-200 shadow-2xs flex items-center gap-1.5 cursor-pointer transition-all"
                title="Upload SOW, PRD, or scope document to auto-fill all templates from document content"
              >
                <UploadCloud className="w-3.5 h-3.5 text-blue-600" />
                <span>Upload Spec (.docx / .md)</span>
                <input
                  type="file"
                  accept=".docx,.doc,.txt,.md,.json"
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    setIsSaving(true);
                    try {
                      const parsed = await documentIngestionService.parseDocumentFile(file);
                      const extracted = documentIngestionService.extractProjectSpecification(parsed.text, file.name);
                      const allDocsMap = documentIngestionService.mapSpecTo16Documents(extracted, project, {
                        pmName: formData.pmName,
                        tlName: formData.tlName,
                      });
                      await documentIngestionService.batchSaveProjectDocuments(project.id, allDocsMap);
                      showToast(`Successfully auto-filled all documents from ${file.name}!`);
                    } catch (err: any) {
                      showToast(`Error parsing document: ${err.message}`);
                    } finally {
                      setIsSaving(false);
                    }
                  }}
                />
              </label>

              <button
                type="button"
                onClick={handleBatchAutoFillAllDocs}
                disabled={isSaving}
                className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-2 cursor-pointer transition-all shrink-0"
              >
                <Zap className="w-4 h-4 text-amber-300" />
                <span>Auto-Fill Available Templates ({allowedTemplates.length})</span>
              </button>
            </div>
          </div>

          {/* Compact Template Checklist */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {allowedTemplates.map((tpl) => {
              const matchedDoc = projectDocs.find(
                (d) => d.templateId === tpl.id || d.name.toLowerCase() === tpl.name.toLowerCase()
              );
              const isExec = ['CEO', 'MD', 'COO', 'CTO', 'CIO'].includes(user?.role || '');
              const editCheck = isDocumentEditable(tpl.id, (user?.role || 'Employee') as UserRole, projectDocs);
              const isLocked = !isExec && !editCheck.editable;
              const isApproved = matchedDoc?.status === 'Approved';

              return (
                <div
                  key={tpl.id}
                  className={`p-3.5 rounded-xl border transition-all flex flex-col justify-between ${
                    isApproved
                      ? 'border-emerald-200 bg-emerald-50/30'
                      : isLocked
                      ? 'border-slate-200 bg-slate-50/60 opacity-80'
                      : 'border-slate-200 bg-white hover:border-blue-300'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-1 mb-1.5">
                      <span className={`w-6 h-6 rounded-lg font-extrabold text-[11px] flex items-center justify-center ${
                        isApproved
                          ? 'bg-emerald-100 text-emerald-700'
                          : isLocked
                          ? 'bg-slate-200 text-slate-500'
                          : 'bg-blue-50 text-blue-700'
                      }`}>
                        {isLocked ? <Lock className="w-3 h-3" /> : tpl.number}
                      </span>
                      <div className="flex items-center gap-1">
                        {isApproved && <CheckCircle2 className="w-3 h-3 text-emerald-600" />}
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                          isApproved 
                            ? 'bg-emerald-100 text-emerald-800'
                            : isLocked
                            ? 'bg-amber-50 text-amber-800 border border-amber-200'
                            : 'bg-slate-100 text-slate-600'
                        }`}>
                          {isApproved ? 'Approved' : isLocked ? 'Locked' : tpl.phase}
                        </span>
                      </div>
                    </div>
                    <h4 className="font-bold text-xs text-slate-900 line-clamp-1">{tpl.name}</h4>
                    <p className="text-[10px] text-slate-400 mt-0.5">Owner: {tpl.ownerRole}</p>
                  </div>

                  <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between">
                    <button
                      onClick={() => handleDownloadDoc(tpl.id)}
                      className="text-[11px] font-bold text-emerald-600 hover:text-emerald-800 flex items-center gap-1 cursor-pointer"
                    >
                      <Download className="w-3 h-3" />
                      <span>Download</span>
                    </button>

                    {onEditDocument && (
                      <button
                        onClick={() => onEditDocument(matchedDoc?.id || `doc-${project.id}-${tpl.id}`)}
                        className={`text-[10px] font-semibold hover:underline cursor-pointer flex items-center gap-0.5 ${
                          isLocked ? 'text-amber-700' : 'text-blue-600'
                        }`}
                      >
                        {isLocked ? 'View Gate' : 'Edit Form'}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setCurrentStep(2)}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </button>

            <button
              type="button"
              onClick={() => setCurrentStep(4)}
              className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs cursor-pointer transition-all transform hover:-translate-y-0.5"
            >
              <span>Next: Task Delegation</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 4: Task Delegation & Review */}
      {currentStep === 4 && (
        <div className="space-y-6">
          {/* Governance Hierarchy Directive Header */}
          <div className="p-5 rounded-2xl bg-gradient-to-r from-blue-50 via-indigo-50/50 to-slate-50 border border-blue-100/80 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-xs font-extrabold text-blue-950 uppercase tracking-wider flex items-center gap-2">
                  <Shield className="w-4 h-4 text-blue-600" />
                  <span>Official Task Governance & Delegation Flow</span>
                </h3>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                  Project tasks are derived strictly from approved architecture and assigned along the official management chain (<span className="font-bold text-blue-700">CTO/PM</span> → <span className="font-bold text-indigo-700">Tech Lead</span> → <span className="font-bold text-slate-800">Developers</span>).
                </p>
              </div>

              {(isCtoRole || isPmRole || user?.role === 'TL') && (
                <button
                  type="button"
                  onClick={async () => {
                    setIsSaving(true);
                    try {
                      const charterDoc = projectDocs.find((d) => d.templateId === 1);
                      const srsDoc = projectDocs.find((d) => d.templateId === 3);
                      const brdDoc = projectDocs.find((d) => d.templateId === 4);
                      const funcDoc = projectDocs.find((d) => d.templateId === 5);
                      const wbsDoc = projectDocs.find((d) => d.templateId === 2);

                      const autoFill1 = documentService.generateAutoFillContent(1, project, user?.fullName);
                      const autoFill3 = documentService.generateAutoFillContent(3, project, user?.fullName);

                      const deliverables = (charterDoc?.content?.deliverables_table?.length ? charterDoc.content.deliverables_table : autoFill1.deliverables_table) || [];
                      const frList = (srsDoc?.content?.fr_table?.length ? srsDoc.content.fr_table : autoFill3.fr_table) || [];
                      const funcList = funcDoc?.content?.func_reqs_table || [];
                      const wbsList = wbsDoc?.content?.wbs_table || [];
                      const brdList = brdDoc?.content?.business_reqs_table || [];

                      const modulesToUse: Array<{ name: string; description: string; priority?: 'High' | 'Medium' | 'Low'; docName?: string }> = [];
                      const seenNames = new Set<string>();

                      // 1. Ingest from Charter Deliverables
                      deliverables.forEach((d: any) => {
                        const name = (d.deliverable || d.name || d.task_name || '').trim();
                        if (name && !seenNames.has(name.toLowerCase())) {
                          seenNames.add(name.toLowerCase());
                          modulesToUse.push({
                            name,
                            description: d.description || `Implement and verify ${name} deliverable`,
                            priority: 'High',
                            docName: 'Project Charter',
                          });
                        }
                      });

                      // 2. Ingest from Functional Requirements (SRS & Functional Spec)
                      [...frList, ...funcList].forEach((f: any) => {
                        const name = (f.description || f.requirement || f.name || f.req_id || '').trim();
                        if (name && !seenNames.has(name.toLowerCase())) {
                          seenNames.add(name.toLowerCase());
                          modulesToUse.push({
                            name: f.req_id ? `${f.req_id}: ${name}` : name,
                            description: f.description || f.justification || `Core workflow implementation for ${name}`,
                            priority: f.priority === 'Must Have' || f.priority === 'High' ? 'High' : 'Medium',
                            docName: 'SRS / Functional Spec',
                          });
                        }
                      });

                      // 3. Ingest from WBS
                      wbsList.forEach((w: any) => {
                        const name = (w.task_name || w.deliverable || w.name || '').trim();
                        if (name && !seenNames.has(name.toLowerCase())) {
                          seenNames.add(name.toLowerCase());
                          modulesToUse.push({
                            name: w.code ? `${w.code}: ${name}` : name,
                            description: `WBS Activity: Implement ${name}`,
                            priority: 'High',
                            docName: 'Project Plan (WBS)',
                          });
                        }
                      });

                      // 4. Ingest from BRD
                      brdList.forEach((b: any) => {
                        const name = (b.requirement || b.description || b.name || '').trim();
                        if (name && !seenNames.has(name.toLowerCase())) {
                          seenNames.add(name.toLowerCase());
                          modulesToUse.push({
                            name: b.req_id ? `${b.req_id}: ${name}` : name,
                            description: b.justification || b.description || `Business capability requirement`,
                            priority: b.priority || 'High',
                            docName: 'Business Requirement Doc',
                          });
                        }
                      });

                      if (modulesToUse.length === 0) {
                        modulesToUse.push(
                          { name: 'Core Architecture & DB Schema', description: 'Design PostgreSQL schema, indexes, and RLS policies', priority: 'High', docName: 'Technical Architecture' },
                          { name: 'Feature Workflows & REST APIs', description: 'Implement REST endpoints, form validations, and realtime sync', priority: 'High', docName: 'Functional Specification' },
                          { name: 'QA Verification & UAT Suite', description: 'Run automated test matrix and certify acceptance criteria', priority: 'Medium', docName: 'Test Plan' }
                        );
                      }

                      const availableDevs = orgMembers.filter((m) => m.role === 'Employee' || m.role === 'TL');
                      const assignedTl = orgMembers.find((m) => m.fullName === formData.tlName) || orgMembers.find((m) => m.role === 'TL') || orgMembers[0];

                      let createdCount = 0;
                      for (let i = 0; i < modulesToUse.length; i++) {
                        const mod = modulesToUse[i];
                        const assignedMember = availableDevs.length > 0 ? availableDevs[i % availableDevs.length] : assignedTl;

                        await assignTask({
                          projectId: project.id,
                          projectName: formData.name,
                          title: `${mod.name}`,
                          description: `Official Engineering Directive: ${mod.description}\n\nDeliverable Scope: ${formData.name}\nSupervised by: ${formData.tlName || 'Technical Lead'}`,
                          assignedBy: user?.id || 'system',
                          assignedByName: user?.fullName || 'Project Leadership',
                          assignedByRole: user?.role || 'CTO',
                          assignedTo: assignedMember?.authUserId || assignedMember?.id || 'Unassigned',
                          assignedToName: assignedMember?.fullName || formData.tlName || 'Team Lead',
                          assignedToRole: assignedMember?.role || 'Employee',
                          assignedToDesignation: assignedMember?.designation || 'Software Engineer',
                          status: 'Open',
                          priority: mod.priority || 'High',
                          dueDate: formatToDateInputValue(project.targetEndDate),
                          progress: 0,
                          referenceFiles: [
                            {
                              id: `ref-${Date.now()}-${i}`,
                              name: `${formData.name} - Official Directive.pdf`,
                              type: 'file',
                              url: '#',
                            },
                          ],
                        });
                        createdCount++;
                      }

                      showToast(`Generated & delegated ${createdCount} official tasks from project specifications!`);
                    } catch (err: any) {
                      console.error(err);
                      showToast(`Error generating tasks: ${err.message}`);
                    } finally {
                      setIsSaving(false);
                    }
                  }}
                  disabled={isSaving}
                  className="px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-2 cursor-pointer transition-all shrink-0"
                >
                  <Zap className="w-4 h-4 text-amber-300" />
                  <span>Auto-Generate Official Tasks from Specs</span>
                </button>
              )}
            </div>
          </div>

          {/* Create Task Form (Supervisor Only) */}
          {(isCtoRole || isPmRole || user?.role === 'TL') ? (
            <form onSubmit={handleCreateTask} className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                  <Plus className="w-4 h-4 text-blue-600" />
                  <span>Assign Official Task Directive</span>
                </h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-800">
                  Issuer: {user?.fullName} ({user?.role})
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Task Directive Title *</label>
                  <input
                    type="text"
                    required
                    value={draftTask.title}
                    onChange={(e) => setDraftTask({ ...draftTask, title: e.target.value })}
                    placeholder="e.g. Implement Architecture Review & Database Schemas"
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Target Role Level</label>
                  <select
                    value={draftTask.assignedToRole}
                    onChange={(e) => setDraftTask({ ...draftTask, assignedToRole: e.target.value as any })}
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl cursor-pointer"
                  >
                    <option value="TL">Technical Lead (TL Directive)</option>
                    <option value="Employee">Developer / Engineer (Implementation)</option>
                    {isCtoRole && <option value="PM">Project Manager (Governance)</option>}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    Assignee Member
                  </label>
                  <select
                    value={draftTask.assignedToName}
                    onChange={(e) => {
                      const sel = orgMembers.find((m) => m.fullName === e.target.value);
                      setDraftTask({
                        ...draftTask,
                        assignedToName: e.target.value,
                        assignedToRole: sel?.role || draftTask.assignedToRole,
                      });
                    }}
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl cursor-pointer"
                  >
                    <option value="">-- Select Member --</option>
                    {orgMembers
                      .filter((m) => {
                        if (isCtoRole) return true;
                        if (isPmRole) return m.role === 'TL' || m.role === 'Employee';
                        return m.role === 'Employee';
                      })
                      .map((m) => (
                        <option key={m.id} value={m.fullName}>
                          {m.fullName} ({m.role} • {m.designation})
                        </option>
                      ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Due Date</label>
                  <input
                    type="date"
                    value={formatToDateInputValue(draftTask.dueDate)}
                    onChange={(e) => setDraftTask({ ...draftTask, dueDate: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl"
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs cursor-pointer transition-colors flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Assign Directive</span>
                </button>
              </div>
            </form>
          ) : (
            <div className="p-4 rounded-2xl bg-amber-50/80 border border-amber-200 text-xs text-amber-900 flex items-center gap-3">
              <Lock className="w-4 h-4 text-amber-600 shrink-0" />
              <div>
                <p className="font-bold">Official Delegation Policy Active</p>
                <p className="text-amber-800 text-[11px] mt-0.5">
                  Tasks are created and assigned strictly by officials (CTO, PM, and TL). Team members work on assigned directives.
                </p>
              </div>
            </div>
          )}

          {/* Existing Project Tasks */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Assigned Project Tasks & Directives ({projectTasks.length})
              </h4>
              <span className="text-[10px] text-slate-400 font-semibold">
                Audit Verified & Logged
              </span>
            </div>

            <div className="divide-y divide-slate-100 bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
              {projectTasks.map((t) => (
                <div key={t.id} className="p-3.5 flex items-center justify-between hover:bg-slate-50 transition-colors">
                  <div className="space-y-0.5">
                    <p className="font-bold text-xs text-slate-900">{t.title}</p>
                    <p className="text-[11px] text-slate-500 font-medium">
                      Assigned to: <span className="font-bold text-slate-800">{t.assignedToName}</span>{' '}
                      <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-slate-100 text-slate-700">
                        {t.assignedToRole}
                      </span>{' '}
                      • Issuer:{' '}
                      <span className="font-semibold text-blue-700">{t.assignedByName || 'CTO Office'}</span>{' '}
                      • Due: <span className="text-slate-700">{t.dueDate}</span>
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      (t.status === 'Verified' || t.status === 'Closed')
                        ? 'bg-emerald-100 text-emerald-800'
                        : t.status === 'In Progress'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-slate-100 text-slate-700'
                    }`}>
                      {t.status}
                    </span>
                  </div>
                </div>
              ))}

              {projectTasks.length === 0 && (
                <div className="p-8 text-center text-xs text-slate-400 space-y-1">
                  <p className="font-semibold">No tasks delegated for this project yet.</p>
                  <p className="text-[11px]">Click "Auto-Generate Official Tasks from Specs" above to synthesize tasks from specifications.</p>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setCurrentStep(3)}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </button>

            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-700 hover:to-teal-600 text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-2 cursor-pointer transition-all"
              >
                <CheckCircle2 className="w-4 h-4 text-white" />
                <span>Complete Onboarding & View Project</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
