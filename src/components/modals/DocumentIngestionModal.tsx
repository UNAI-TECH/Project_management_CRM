import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { Project, TeamMember, UserRole } from '../../types';
import { 
  UploadCloud, 
  FileText, 
  CheckCircle2, 
  ArrowRight, 
  ArrowLeft, 
  Sparkles, 
  Users, 
  Calendar, 
  FolderKanban, 
  Layers, 
  ShieldCheck, 
  AlertTriangle,
  Clock,
  Loader2,
  Download,
  UserCheck,
  Check
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { teamService } from '../../services/teamService';
import { 
  documentIngestionService, 
  ParsedProjectSpec, 
  TeamAssignments,
  AssignedRosterMember 
} from '../../services/documentIngestionService';
import { DOCUMENT_TEMPLATES, PHASE_COLORS } from '../../constants/documentTemplates';

interface DocumentIngestionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProjectCreated: (project: Project) => void;
}

interface IngestionAssignments extends TeamAssignments {
  selectedMembers: AssignedRosterMember[];
}

export const DocumentIngestionModal: React.FC<DocumentIngestionModalProps> = ({
  isOpen,
  onClose,
  onProjectCreated,
}) => {
  const { user } = useAuth();
  const { createProject, refreshData } = useData();

  // Wizard Step: 1 = Team & Roles, 2 = Ingest Document, 3 = Extract & Launch
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [activeInputTab, setActiveInputTab] = useState<'upload' | 'paste'>('upload');
  
  // File & Raw Text State
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [pastedText, setPastedText] = useState('');
  const [isParsing, setIsParsing] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  // Extracted Specification State
  const [spec, setSpec] = useState<ParsedProjectSpec | null>(null);
  const [previewDocId, setPreviewDocId] = useState<number | null>(1); // Preview Project Charter by default

  // Org Members for Dropdowns & Team Roster
  const [orgMembers, setOrgMembers] = useState<Array<{ id: string; authUserId: string; fullName: string; role: UserRole; designation: string; department?: string; email?: string }>>([]);

  // Assignment State (Initialized in Step 1)
  const [assignments, setAssignments] = useState<IngestionAssignments>({
    pmId: '',
    pmName: '',
    tlId: '',
    tlName: '',
    qaId: '',
    qaName: '',
    selectedMembers: [],
    devAssignments: {},
    clientSignatory: '',
  });

  const [isLaunching, setIsLaunching] = useState(false);

  // Unique Org Members for Dropdowns (Deduplicated by name)
  const uniqueOrgMembers = React.useMemo(() => {
    const seen = new Set<string>();
    return orgMembers.filter((m) => {
      const key = m.fullName.trim().toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [orgMembers]);

  // EMPLOYEES ONLY: Filter out any TL, PM, or higher officials / executives / managers
  const employeeMembers = React.useMemo(() => {
    const higherRoles: UserRole[] = ['CEO', 'MD', 'COO', 'CTO', 'CIO', 'PM', 'TL'];
    const seenNames = new Set<string>();

    return orgMembers.filter((m) => {
      const cleanName = m.fullName.trim().toLowerCase();
      if (seenNames.has(cleanName)) return false;

      // 1. Must be Employee role (exclude TL, PM, CEO, CTO, etc.)
      if (higherRoles.includes(m.role) || m.role !== 'Employee') return false;

      // 2. Exclude leadership / executive designations
      const des = (m.designation || '').toLowerCase();
      const isLeadership =
        des.includes('ceo') ||
        des.includes('cto') ||
        des.includes('coo') ||
        des.includes('cio') ||
        des.includes('cfo') ||
        des.includes('chief') ||
        des.includes('managing director') ||
        des.includes('director') ||
        des.includes('president') ||
        des.includes('founder') ||
        des.includes('owner') ||
        des.includes('project manager') ||
        des.includes('technical lead') ||
        des.includes('team lead') ||
        des.includes('tech lead');

      if (isLeadership) return false;

      // 3. Exclude if currently selected as Project Manager or Technical Lead
      if (m.fullName === assignments.pmName || m.fullName === assignments.tlName) {
        return false;
      }

      seenNames.add(cleanName);
      return true;
    });
  }, [orgMembers, assignments.pmName, assignments.tlName]);

  // Load Organization Members and Setup Initial Leadership & Employee Roster
  useEffect(() => {
    const loadMembers = async () => {
      const members = await teamService.getOrgMembers(user?.organizationId);
      if (members && members.length > 0) {
        setOrgMembers(members);
        
        // Find defaults for PM, TL, QA
        const higherRoles: UserRole[] = ['CEO', 'MD', 'COO', 'CTO', 'CIO', 'PM', 'TL'];
        const defaultPm = members.find((m) => m.role === 'PM' || m.designation?.toLowerCase().includes('project manager')) || members[0];
        const defaultTl = members.find((m) => (m.role === 'TL' || m.designation?.toLowerCase().includes('lead')) && m.id !== defaultPm.id) || members.find((m) => m.id !== defaultPm.id) || members[0];
        const defaultQa = members.find((m) => m.designation?.toLowerCase().includes('qa') && m.id !== defaultPm.id && m.id !== defaultTl.id) || members[0];

        // Filter employees only for initial selection
        const seenNames = new Set<string>();
        const initialEmployees: AssignedRosterMember[] = members
          .filter((m) => {
            const cleanName = m.fullName.trim().toLowerCase();
            if (seenNames.has(cleanName)) return false;
            if (higherRoles.includes(m.role) || m.role !== 'Employee') return false;
            const des = (m.designation || '').toLowerCase();
            if (
              des.includes('ceo') ||
              des.includes('cto') ||
              des.includes('coo') ||
              des.includes('cio') ||
              des.includes('cfo') ||
              des.includes('chief') ||
              des.includes('director') ||
              des.includes('president') ||
              des.includes('founder') ||
              des.includes('owner') ||
              des.includes('project manager') ||
              des.includes('technical lead') ||
              des.includes('team lead') ||
              des.includes('tech lead')
            ) {
              return false;
            }
            if (m.fullName === defaultPm.fullName || m.fullName === defaultTl.fullName) return false;
            seenNames.add(cleanName);
            return true;
          })
          .map((m) => ({
            id: m.id,
            name: m.fullName,
            role: m.role,
            designation: m.designation,
            department: m.department || 'Engineering',
            email: m.email,
          }));

        setAssignments((prev) => ({
          ...prev,
          pmId: defaultPm.id,
          pmName: defaultPm.fullName,
          tlId: defaultTl.id,
          tlName: defaultTl.fullName,
          qaId: defaultQa.id,
          qaName: defaultQa.fullName,
          selectedMembers: initialEmployees,
        }));
      }
    };

    if (isOpen) {
      loadMembers();
    }
  }, [isOpen, user?.organizationId]);

  // Handlers for leadership changes that prune them from employee roster if selected
  const handlePmChange = (name: string) => {
    const selected = uniqueOrgMembers.find((m) => m.fullName === name);
    setAssignments((prev) => ({
      ...prev,
      pmId: selected?.id || '',
      pmName: name,
      selectedMembers: prev.selectedMembers.filter((m) => m.name !== name),
    }));
  };

  const handleTlChange = (name: string) => {
    const selected = uniqueOrgMembers.find((m) => m.fullName === name);
    setAssignments((prev) => ({
      ...prev,
      tlId: selected?.id || '',
      tlName: name,
      selectedMembers: prev.selectedMembers.filter((m) => m.name !== name),
    }));
  };

  const handleQaChange = (name: string) => {
    const selected = uniqueOrgMembers.find((m) => m.fullName === name);
    setAssignments((prev) => ({
      ...prev,
      qaId: selected?.id || '',
      qaName: name,
    }));
  };

  // Handle Team Member Toggle (Employees Only)
  const handleToggleMember = (member: { id: string; fullName: string; role: UserRole; designation: string; department?: string; email?: string }) => {
    setAssignments((prev) => {
      const exists = prev.selectedMembers.some((m) => m.id === member.id);
      const updated = exists
        ? prev.selectedMembers.filter((m) => m.id !== member.id)
        : [
            ...prev.selectedMembers,
            {
              id: member.id,
              name: member.fullName,
              role: member.role,
              designation: member.designation,
              department: member.department || 'Engineering',
              email: member.email,
            },
          ];
      return { ...prev, selectedMembers: updated };
    });
  };

  const handleSelectAllMembers = () => {
    const all: AssignedRosterMember[] = employeeMembers.map((m) => ({
      id: m.id,
      name: m.fullName,
      role: m.role,
      designation: m.designation,
      department: m.department || 'Engineering',
      email: m.email,
    }));
    setAssignments((prev) => ({ ...prev, selectedMembers: all }));
  };

  const handleClearSelectedMembers = () => {
    setAssignments((prev) => ({ ...prev, selectedMembers: [] }));
  };

  // Handle File Selection & Drag Drop
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedFile(file);
    setParseError(null);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      setSelectedFile(file);
      setParseError(null);
    }
  };

  // Run Parsing on File or Pasted Text and Auto-Distribute to Assigned Team
  const handleAnalyzeAndExtractWithTeam = async () => {
    setIsParsing(true);
    setParseError(null);

    try {
      let rawContent = '';
      let filename = 'New Project';

      if (activeInputTab === 'upload') {
        if (!selectedFile) {
          throw new Error('Please select a Word (.docx), Markdown (.md), or Text (.txt) file.');
        }
        const parsed = await documentIngestionService.parseDocumentFile(selectedFile);
        rawContent = parsed.text;
        filename = parsed.fileName;
      } else {
        if (!pastedText.trim()) {
          throw new Error('Please paste your specification text or scope document content.');
        }
        rawContent = pastedText;
      }

      // 1. Extract specification from document
      const extracted = documentIngestionService.extractProjectSpecification(rawContent, filename);
      setSpec(extracted);

      // 2. Automatically distribute extracted modules across the selected team members from Step 1
      const initialDevMap = documentIngestionService.distributeModulesToTeam(
        extracted.modules,
        assignments.selectedMembers,
        assignments.tlName
      );

      // Pre-populate client signatory and dev assignments
      setAssignments((prev) => ({
        ...prev,
        clientSignatory: extracted.client || 'Client Representative',
        devAssignments: initialDevMap,
      }));

      // Advance to Step 3 (Extract & Review)
      setStep(3);
    } catch (err: any) {
      console.error('[DocumentIngestionModal] Parse Error:', err);
      setParseError(err.message || 'Could not parse document. Please check the file format.');
    } finally {
      setIsParsing(false);
    }
  };

  // Final Project Launch Handler
  const handleLaunchProject = async () => {
    if (!spec) return;
    setIsLaunching(true);

    try {
      // 1. Create the project record in Supabase
      const newProject = await createProject({
        name: spec.name,
        code: spec.code,
        client: spec.client,
        sponsor: spec.sponsor,
        department: spec.department,
        priority: spec.priority,
        status: 'Planning',
        startDate: spec.startDate,
        targetEndDate: spec.targetEndDate,
        budget: parseInt(spec.budget.replace(/[^0-9]/g, ''), 10) || 2500000,
        description: spec.description,
        pmName: assignments.pmName || 'PM',
        technology: spec.techStack.frontend + ' / ' + spec.techStack.backend,
        businessObjective: spec.businessObjective,
      });

      // 2. Provision all selected team members into project_members
      const memberPromises = (assignments.selectedMembers || []).map((m) =>
        teamService.addProjectMember(
          {
            id: m.id,
            projectId: newProject.id,
            name: m.name,
            role: m.role,
            designation: m.designation,
            department: m.department,
            reportsTo: assignments.pmId || null,
          },
          user?.id,
          user?.organizationId
        )
      );

      if (assignments.pmId) {
        memberPromises.push(
          teamService.addProjectMember(
            {
              id: assignments.pmId,
              projectId: newProject.id,
              name: assignments.pmName,
              role: 'PM',
              designation: 'Project Manager',
            },
            user?.id,
            user?.organizationId
          )
        );
      }

      if (assignments.tlId && assignments.tlId !== assignments.pmId) {
        memberPromises.push(
          teamService.addProjectMember(
            {
              id: assignments.tlId,
              projectId: newProject.id,
              name: assignments.tlName,
              role: 'TL',
              designation: 'Technical Lead',
              reportsTo: assignments.pmId || null,
            },
            user?.id,
            user?.organizationId
          )
        );
      }

      await Promise.allSettled(memberPromises);

      // 3. Generate content dictionaries for all 16 documents using team assignments
      const all16DocsContent = documentIngestionService.mapSpecTo16Documents(
        spec,
        newProject,
        assignments
      );

      // 4. Batch save into project_documents table (doc_type)
      await documentIngestionService.batchSaveProjectDocuments(
        newProject.id,
        all16DocsContent
      );

      // 5. Refresh all documents and project state across the CRM
      await refreshData();

      // 6. Notify parent & close modal
      onProjectCreated(newProject);
      onClose();
    } catch (err: any) {
      console.error('[DocumentIngestionModal] Launch error:', err);
      setParseError('Failed to launch project: ' + (err.message || 'Unknown database error'));
    } finally {
      setIsLaunching(false);
    }
  };

  // Generate Document Preview mapping for Step 3
  const docContentsMap = spec ? documentIngestionService.mapSpecTo16Documents(spec, {}, assignments) : {};

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Create Project from Document — Multi-Document Auto-Provisioning"
      maxWidth="4xl"
    >
      <div className="space-y-6">
        {/* Wizard Stepper Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          {/* Step 1 */}
          <div className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
              step === 1 ? 'bg-blue-600 text-white ring-4 ring-blue-100' : 'bg-emerald-500 text-white'
            }`}>
              {step > 1 ? '✓' : '1'}
            </div>
            <div>
              <div className="text-xs font-bold text-slate-800">1. Team & Roles</div>
              <div className="text-[10px] text-slate-400">Assign PM, TL & Engineers</div>
            </div>
          </div>

          <div className="w-8 h-0.5 bg-slate-200" />

          {/* Step 2 */}
          <div className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
              step === 2 ? 'bg-blue-600 text-white ring-4 ring-blue-100' : step > 2 ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-400'
            }`}>
              {step > 2 ? '✓' : '2'}
            </div>
            <div>
              <div className="text-xs font-bold text-slate-800">2. Ingest Document</div>
              <div className="text-[10px] text-slate-400">Upload or Drag & Drop Spec</div>
            </div>
          </div>

          <div className="w-8 h-0.5 bg-slate-200" />

          {/* Step 3 */}
          <div className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
              step === 3 ? 'bg-blue-600 text-white ring-4 ring-blue-100' : 'bg-slate-100 text-slate-400'
            }`}>
              3
            </div>
            <div>
              <div className="text-xs font-bold text-slate-800">3. Extract & Launch</div>
              <div className="text-[10px] text-slate-400">Verify Team Matrix & Launch</div>
            </div>
          </div>
        </div>

        {/* Error Alert */}
        {parseError && (
          <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2.5 text-xs text-rose-800 font-medium">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{parseError}</span>
          </div>
        )}

        {/* ─────────────────────────────────────────────────────────────
            STEP 1: TEAM LEADERSHIP & ROLES SETUP (FIRST)
        ───────────────────────────────────────────────────────────── */}
        {step === 1 && (
          <div className="space-y-5 animate-fade-in">
            {/* Step Instructions Banner */}
            <div className="p-3.5 bg-gradient-to-r from-blue-50/90 to-indigo-50/70 border border-blue-200 rounded-2xl flex items-center gap-3 text-xs text-blue-900 shadow-2xs">
              <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center shrink-0">
                <Users className="w-4 h-4" />
              </div>
              <div>
                <strong>Step 1 — Team & Roles First:</strong> Select your Project Manager, Tech Lead, and engineering staff. Once selected, the document ingestion engine will automatically bind these team members directly into the WBS, Sprint Backlog, and 16 governance documents!
              </div>
            </div>

            {/* Leadership Assignment Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Project Manager (PM) *
                </label>
                <select
                  value={assignments.pmName}
                  onChange={(e) => handlePmChange(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold text-slate-800"
                >
                  {uniqueOrgMembers.map((m) => (
                    <option key={m.id} value={m.fullName}>
                      {m.fullName} ({m.designation || m.role})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Technical Lead (TL) *
                </label>
                <select
                  value={assignments.tlName}
                  onChange={(e) => handleTlChange(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold text-slate-800"
                >
                  {uniqueOrgMembers.map((m) => (
                    <option key={m.id} value={m.fullName}>
                      {m.fullName} ({m.designation || m.role})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  QA Lead / Reviewer *
                </label>
                <select
                  value={assignments.qaName}
                  onChange={(e) => handleQaChange(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold text-slate-800"
                >
                  {uniqueOrgMembers.map((m) => (
                    <option key={m.id} value={m.fullName}>
                      {m.fullName} ({m.designation || m.role})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Team Roster Selection - EMPLOYEES ONLY */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Employees as Project Members ({assignments.selectedMembers.length} Selected)
                  </h4>
                  <span className="text-[11px] text-slate-500">
                    Select individual contributor employees who will receive module, sprint, and WBS assignments
                  </span>
                </div>
                {employeeMembers.length > 0 && (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleSelectAllMembers}
                      className="text-[11px] font-bold text-blue-600 hover:text-blue-800 px-2.5 py-1 rounded-lg hover:bg-blue-50 transition-colors cursor-pointer"
                    >
                      Select All
                    </button>
                    <button
                      type="button"
                      onClick={handleClearSelectedMembers}
                      className="text-[11px] font-bold text-slate-500 hover:text-slate-700 px-2.5 py-1 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                    >
                      Clear
                    </button>
                  </div>
                )}
              </div>

              {/* Members Grid - EMPLOYEES ONLY */}
              {employeeMembers.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 max-h-[260px] overflow-y-auto pr-1">
                  {employeeMembers.map((member) => {
                    const isSelected = assignments.selectedMembers.some((m) => m.id === member.id);
                    return (
                      <div
                        key={member.id}
                        onClick={() => handleToggleMember(member)}
                        className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                          isSelected
                            ? 'bg-blue-50/70 border-blue-300 ring-2 ring-blue-100 shadow-2xs'
                            : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/50'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                            isSelected ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'
                          }`}>
                            {member.fullName.slice(0, 2).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <div className="text-xs font-bold text-slate-800 truncate">
                              {member.fullName}
                            </div>
                            <div className="text-[10px] text-slate-400 truncate">
                              {member.designation || 'Employee'}
                            </div>
                          </div>
                        </div>

                        <div className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 border ${
                          isSelected
                            ? 'bg-blue-600 border-blue-600 text-white'
                            : 'border-slate-300 bg-white'
                        }`}>
                          {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-center text-xs text-slate-500">
                  No individual contributor employees found in organization. You can proceed with the leadership team assigned above.
                </div>
              )}
            </div>

            {/* Footer Action */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
              <div className="text-xs text-slate-500 font-medium">
                {assignments.selectedMembers.length} team members assembled for this project
              </div>
              <button
                type="button"
                onClick={() => setStep(2)}
                disabled={!assignments.pmName || assignments.selectedMembers.length === 0}
                className="px-5 py-2.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl shadow-sm transition-all flex items-center gap-2 cursor-pointer"
              >
                <span>Proceed to Document Ingestion</span>
                <ArrowRight className="w-4 h-4 text-white" />
              </button>
            </div>
          </div>
        )}

        {/* ─────────────────────────────────────────────────────────────
            STEP 2: INGEST DOCUMENT (DRAG & DROP SPECIFICATION)
        ───────────────────────────────────────────────────────────── */}
        {step === 2 && (
          <div className="space-y-5 animate-fade-in">
            {/* Team Roster Pill Summary */}
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs text-slate-700 shadow-3xs">
              <div className="flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-emerald-600" />
                <span>
                  <strong>Team Configured:</strong> PM: {assignments.pmName} • TL: {assignments.tlName} • QA: {assignments.qaName} • <strong>{assignments.selectedMembers.length} Developers</strong> ready
                </span>
              </div>
              <button
                type="button"
                onClick={() => setStep(1)}
                className="text-[11px] font-bold text-blue-600 hover:underline cursor-pointer"
              >
                Edit Team
              </button>
            </div>

            {/* Input Switcher Tabs */}
            <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
              <button
                type="button"
                onClick={() => setActiveInputTab('upload')}
                className={`px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                  activeInputTab === 'upload'
                    ? 'bg-blue-50 text-blue-700 border border-blue-200 shadow-2xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Upload File (.docx, .md, .txt)
              </button>
              <button
                type="button"
                onClick={() => setActiveInputTab('paste')}
                className={`px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                  activeInputTab === 'paste'
                    ? 'bg-blue-50 text-blue-700 border border-blue-200 shadow-2xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Paste Specification Text
              </button>
            </div>

            {/* Downloadable Reference Specification Banner */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-slate-50 border border-slate-200 rounded-2xl shadow-2xs">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-blue-100/70 text-blue-600 rounded-xl flex items-center justify-center border border-blue-200/50 shrink-0 shadow-3xs">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-800">
                    Download Reference Specification Template
                  </div>
                  <div className="text-[10px] text-slate-500">
                    Use our standardized format to draft and auto-provision all 16 documents
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => documentIngestionService.downloadReferenceDocument('docx')}
                  className="px-3 py-1.5 text-[11px] font-bold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl shadow-3xs transition-all flex items-center gap-1.5 cursor-pointer"
                  title="Download standard Word template"
                >
                  <Download className="w-3.5 h-3.5 text-blue-600" />
                  <span>Word (.docx)</span>
                </button>

                <button
                  type="button"
                  onClick={() => documentIngestionService.downloadReferenceDocument('md')}
                  className="px-3 py-1.5 text-[11px] font-bold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl shadow-3xs transition-all flex items-center gap-1.5 cursor-pointer"
                  title="Download standard Markdown template"
                >
                  <Download className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Markdown (.md)</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setActiveInputTab('paste');
                    setPastedText(documentIngestionService.getSampleSpecificationText());
                    setParseError(null);
                  }}
                  className="px-3 py-1.5 text-[11px] font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-xl shadow-3xs transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                  <span>Load Sample</span>
                </button>
              </div>
            </div>

            {/* Upload Area with Drag & Drop */}
            {activeInputTab === 'upload' ? (
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragOver(true);
                }}
                onDragLeave={() => setIsDragOver(false)}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-2xl p-8 text-center transition-all bg-white flex flex-col items-center justify-center cursor-pointer ${
                  isDragOver
                    ? 'border-blue-500 bg-blue-50/50 scale-[1.01]'
                    : selectedFile
                    ? 'border-emerald-400 bg-emerald-50/30'
                    : 'border-slate-200 hover:border-blue-400'
                }`}
                onClick={() => document.getElementById('spec-file-input')?.click()}
              >
                <input
                  id="spec-file-input"
                  type="file"
                  accept=".docx,.md,.txt,.json"
                  className="hidden"
                  onChange={handleFileChange}
                />

                <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mb-3 shadow-3xs">
                  <UploadCloud className="w-6 h-6" />
                </div>

                {selectedFile ? (
                  <div className="space-y-1">
                    <div className="text-sm font-bold text-slate-800 flex items-center justify-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>{selectedFile.name}</span>
                    </div>
                    <p className="text-xs text-slate-500">
                      {(selectedFile.size / 1024).toFixed(1)} KB • Ready for extraction
                    </p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <p className="text-sm font-bold text-slate-800">
                      Click to upload or drag and drop specification
                    </p>
                    <p className="text-xs text-slate-400">
                      Word Documents (.docx), Markdown (.md), or Plain Text (.txt)
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                <textarea
                  rows={9}
                  value={pastedText}
                  onChange={(e) => setPastedText(e.target.value)}
                  placeholder="Paste your SOW, project charter, PRD, or technical specification text here..."
                  className="w-full p-3.5 text-xs bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono leading-relaxed resize-none"
                />
              </div>
            )}

            {/* Footer Navigation */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to Team & Roles</span>
              </button>

              <button
                type="button"
                disabled={isParsing || (activeInputTab === 'upload' && !selectedFile) || (activeInputTab === 'paste' && !pastedText.trim())}
                onClick={handleAnalyzeAndExtractWithTeam}
                className="px-5 py-2.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl shadow-sm transition-all flex items-center gap-2 cursor-pointer"
              >
                {isParsing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    <span>Extracting & Assigning Team...</span>
                  </>
                ) : (
                  <>
                    <span>Analyze & Extract Suite with Team</span>
                    <ArrowRight className="w-4 h-4 text-white" />
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* ─────────────────────────────────────────────────────────────
            STEP 3: EXTRACT WITH ASSIGNED EMPLOYEES & LAUNCH
        ───────────────────────────────────────────────────────────── */}
        {step === 3 && spec && (
          <div className="space-y-5 animate-fade-in">
            {/* Success Extraction Banner */}
            <div className="p-3.5 bg-emerald-50/90 border border-emerald-200 rounded-2xl flex items-center justify-between text-xs text-emerald-900 shadow-2xs">
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <div>
                  <strong>Extraction Complete:</strong> 16 governance documents pre-filled with <strong>{spec.name}</strong>, assigned to PM <strong>{assignments.pmName}</strong> and distributed to your engineering team!
                </div>
              </div>
              <span className="text-[11px] font-bold bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-full shrink-0">
                16 of 16 Docs Ready
              </span>
            </div>

            {/* Extracted Project Metadata Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-white p-3.5 rounded-2xl border border-slate-200 shadow-3xs text-xs">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Project Code</span>
                <span className="font-bold text-slate-800">{spec.code}</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Client</span>
                <span className="font-bold text-slate-800 truncate block">{spec.client}</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Initial Budget</span>
                <span className="font-bold text-emerald-700">{spec.budget}</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Target Timeline</span>
                <span className="font-bold text-slate-800">{spec.startDate} → {spec.targetEndDate}</span>
              </div>
            </div>

            {/* Module Assignee Mapping (Pre-Filled with Step 1 Team) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Module-to-Developer Distribution ({spec.modules.length} In-Scope Modules)
                </label>
                <span className="text-[10px] text-slate-400">
                  Auto-assigned across your selected team (adjust if needed)
                </span>
              </div>

              <div className="border border-slate-200 rounded-2xl bg-white overflow-hidden shadow-2xs divide-y divide-slate-100 max-h-[160px] overflow-y-auto">
                {spec.modules.map((mod, idx) => (
                  <div key={idx} className="p-2.5 flex items-center justify-between gap-4 hover:bg-slate-50/50">
                    <div className="min-w-0">
                      <span className="text-xs font-bold text-slate-800 block truncate">
                        {idx + 1}. {mod.name}
                      </span>
                      <span className="text-[10px] text-slate-400 truncate block">
                        {mod.description}
                      </span>
                    </div>

                    <div className="shrink-0 w-48">
                      <select
                        value={assignments.devAssignments?.[mod.name]?.memberName || assignments.tlName}
                        onChange={(e) => {
                          const selectedMember = orgMembers.find((m) => m.fullName === e.target.value);
                          setAssignments((prev) => ({
                            ...prev,
                            devAssignments: {
                              ...prev.devAssignments,
                              [mod.name]: {
                                memberId: selectedMember?.id || '',
                                memberName: e.target.value,
                              },
                            },
                          }));
                        }}
                        className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium text-slate-800"
                      >
                        {assignments.selectedMembers.length > 0 ? (
                          assignments.selectedMembers.map((m) => (
                            <option key={m.id} value={m.name}>
                              {m.name} ({m.designation || m.role})
                            </option>
                          ))
                        ) : (
                          orgMembers.map((m) => (
                            <option key={m.id} value={m.fullName}>
                              {m.fullName}
                            </option>
                          ))
                        )}
                      </select>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Document Preview & Verification Split Grid */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
              {/* Left Column: 16 Templates */}
              <div className="md:col-span-5 border border-slate-200 rounded-2xl p-2.5 bg-slate-50/50 max-h-[220px] overflow-y-auto space-y-1.5">
                <div className="text-[11px] font-bold text-slate-500 px-2 py-1 uppercase tracking-wider">
                  Governance Suite (16 Documents)
                </div>
                {DOCUMENT_TEMPLATES.map((tpl) => {
                  const isSelected = previewDocId === tpl.id;
                  const phaseColor = PHASE_COLORS[tpl.phase] || { bg: 'bg-slate-100', text: 'text-slate-700' };

                  return (
                    <button
                      key={tpl.id}
                      type="button"
                      onClick={() => setPreviewDocId(tpl.id)}
                      className={`w-full text-left p-2 rounded-xl transition-all flex items-center justify-between gap-2 border cursor-pointer ${
                        isSelected
                          ? 'bg-white border-blue-500 shadow-xs ring-2 ring-blue-100'
                          : 'bg-white/80 border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-bold flex items-center justify-center shrink-0">
                          ✓
                        </span>
                        <div className="truncate">
                          <div className="text-xs font-bold text-slate-800 truncate">
                            #{tpl.id}. {tpl.shortName}
                          </div>
                          <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded ${phaseColor.bg} ${phaseColor.text}`}>
                            {tpl.phase}
                          </span>
                        </div>
                      </div>
                      <span className="text-[10px] text-blue-600 font-bold shrink-0">View</span>
                    </button>
                  );
                })}
              </div>

              {/* Right Column: Active Document Live Preview */}
              <div className="md:col-span-7 border border-slate-200 rounded-2xl p-3.5 bg-white max-h-[220px] overflow-y-auto space-y-3">
                {(() => {
                  const selectedTpl = DOCUMENT_TEMPLATES.find((t) => t.id === previewDocId) || DOCUMENT_TEMPLATES[1];
                  const docData = docContentsMap[selectedTpl.id] || {};

                  return (
                    <div>
                      <div className="border-b border-slate-100 pb-2 mb-2 flex items-center justify-between">
                        <div>
                          <h4 className="text-xs font-extrabold text-blue-950 uppercase tracking-wider">
                            Doc #{selectedTpl.id}: {selectedTpl.name}
                          </h4>
                          <span className="text-[10px] text-slate-400">
                            Phase: {selectedTpl.phase} • Owner: {selectedTpl.ownerRole}
                          </span>
                        </div>
                        <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                          Generated
                        </span>
                      </div>

                      <div className="space-y-2.5 text-xs text-slate-700">
                        {Object.entries(docData).map(([k, v]) => {
                          if (k.startsWith('_') || !v) return null;

                          if (Array.isArray(v)) {
                            return (
                              <div key={k} className="space-y-1 bg-slate-50 p-2 rounded-xl border border-slate-200/80">
                                <span className="font-bold text-[10px] uppercase tracking-wider text-slate-500 block">
                                  {k.replace(/_/g, ' ')} ({v.length} rows)
                                </span>
                                <div className="space-y-1 text-[11px]">
                                  {v.slice(0, 3).map((row, rIdx) => (
                                    <div key={rIdx} className="bg-white p-1 rounded border border-slate-200 truncate">
                                      {Object.values(row).filter(Boolean).join(' • ')}
                                    </div>
                                  ))}
                                  {v.length > 3 && (
                                    <div className="text-[10px] text-slate-400 italic text-center">
                                      +{v.length - 3} more rows populated
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          }

                          return (
                            <div key={k} className="bg-slate-50/80 p-2 rounded-xl border border-slate-200/60">
                              <span className="font-bold text-[10px] uppercase tracking-wider text-slate-500 block mb-0.5">
                                {k.replace(/_/g, ' ')}
                              </span>
                              <p className="text-[11px] text-slate-800 whitespace-pre-wrap leading-relaxed">
                                {String(v)}
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* Footer Launch Buttons */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to Ingest</span>
              </button>

              <button
                type="button"
                disabled={isLaunching}
                onClick={handleLaunchProject}
                className="px-6 py-2.5 text-xs font-bold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer transform hover:-translate-y-0.5 disabled:opacity-50"
              >
                {isLaunching ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    <span>Provisioning All 16 Documents...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4 text-white" />
                    <span>Certify & Launch Project</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};
