import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { ProjectDocument, UserRole, DocumentStatus } from '../types';
import { DOCUMENT_TEMPLATES } from '../constants/documentTemplates';
import { 
  isDocumentEditable, 
  getUnsatisfiedDependencies,
  DOCUMENT_DEPENDENCY_GRAPH 
} from '../constants/documentDependencyGraph';
import { documentAutoFillService } from '../services/documentAutoFillService';
import { documentService } from '../services/documentService';
import { 
  ArrowLeft, 
  Check, 
  CheckCircle2, 
  ArrowRight,
  ShieldCheck,
  Lock,
  AlertTriangle,
  Sparkles,
  Bell,
  FileText,
  Clock,
  Plus,
  Trash2,
  List,
  ListOrdered,
  Cloud
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { EmployeeSelect } from '../components/common/EmployeeSelect';
import { DocumentSelect } from '../components/common/DocumentSelect';
import { DocumentWatermarkOverlay } from '../components/common/DocumentWatermarkOverlay';

interface DocumentEditScreenProps {
  document: ProjectDocument;
  onBack: () => void;
  onSave: (updatedDoc: Partial<ProjectDocument>) => void;
  backButtonLabel?: string;
}

export const DocumentEditScreen: React.FC<DocumentEditScreenProps> = ({
  document,
  onBack,
  onSave,
  backButtonLabel,
}) => {
  const { user, isFullAccessAdmin, documentBranding } = useAuth();
  const { documents, teamMembers, projects, features, tasks, autosaveDocument } = useData();
  const [viewMode, setViewMode] = useState<'form' | 'preview'>('form');

  const template = DOCUMENT_TEMPLATES.find((t) => t.id === document.templateId) || DOCUMENT_TEMPLATES[1];
  
  // Dependency Gating Check - memoize projectDocs to avoid unstable reference
  const projectDocs = useMemo(
    () => documents.filter((d) => d.projectId === document.projectId),
    [documents, document.projectId]
  );
  const userRole = (user?.role || 'Employee') as UserRole;
  const editCheck = isDocumentEditable(document.templateId, userRole, projectDocs);
  const isGated = !isFullAccessAdmin && !editCheck.editable;

  // Build wizard steps from template sections
  const templateSections = template.sections || [];
  const hasApprovalSection = templateSections.some(
    (s) => s.id === 'approvals' || s.title.toLowerCase().includes('approval') || s.title.toLowerCase().includes('sign-off')
  );

  const steps = useMemo(() => [
    ...templateSections.map((sec, idx) => ({
      id: sec.id || `step_${idx}`,
      label: sec.title,
      description: sec.description,
      fields: sec.fields,
    })),
    ...(!hasApprovalSection ? [{
      id: 'approvals',
      label: 'Sign-off & Approvals',
      description: 'Formal stakeholder sign-offs and CTO certification',
      fields: [],
    }] : [])
  ], [templateSections, hasApprovalSection]);

  // Ping / Notification State
  const [pingSent, setPingSent] = useState(false);

  // Restore step where user last left off (from Supabase Cloud or localStorage)
  const [currentStep, setCurrentStep] = useState<number>(() => {
    const savedStep = document.content?._draft_step;
    if (typeof savedStep === 'number' && savedStep >= 0 && savedStep < steps.length) {
      return savedStep;
    }
    try {
      const cached = localStorage.getItem(`doc_draft_${document.id}`);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (typeof parsed._draft_step === 'number' && parsed._draft_step >= 0 && parsed._draft_step < steps.length) {
          return parsed._draft_step;
        }
      }
    } catch {}
    return 0;
  });

  // Notice banner when resumed from previous draft
  const [resumedNotice, setResumedNotice] = useState<string | null>(() => {
    const savedStep = document.content?._draft_step;
    if (typeof savedStep === 'number' && savedStep > 0 && savedStep < steps.length) {
      return `Restored cloud draft at Step ${savedStep + 1}: ${steps[savedStep]?.label || ''}`;
    }
    return null;
  });

  // Cloud Autosave State
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'error'>('saved');
  const [lastSavedTime, setLastSavedTime] = useState<string>(() => {
    if (document.content?._last_autosaved_at) {
      try {
        return new Date(document.content._last_autosaved_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      } catch {}
    }
    return 'Synced';
  });

  const autosaveTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Compute auto-fill sources cleanly with useMemo to prevent setState re-render cascades
  const autoFillSources = useMemo(() => {
    const { sourceDocNames } = documentAutoFillService.getAutoFilledFields(
      document.templateId,
      projectDocs
    );
    if (document.templateId === 9 && teamMembers.some((m) => m.projectId === document.projectId)) {
      if (!sourceDocNames.includes('Project Team Members')) {
        sourceDocNames.push('Project Team Members');
      }
    }
    return sourceDocNames;
  }, [document.templateId, document.projectId, projectDocs, teamMembers]);

  const prj = projects.find((p) => p.id === document.projectId) || null;
  const autoFillFallback = useMemo(() => {
    return documentService.generateAutoFillContent(
      document.templateId,
      (prj || { name: document.projectName, code: 'UNAI-PRJ', client: 'Enterprise Client', sponsor: 'Executive Sponsor', pmName: document.ownerName, department: 'Engineering', startDate: document.createdAt, targetEndDate: document.createdAt, description: document.description, priority: 'High', lifecyclePhase: document.phase }) as any,
      user?.fullName
    );
  }, [document.templateId, prj, user?.fullName, document.projectName, document.ownerName, document.createdAt, document.description, document.phase]);

  const [formData, setFormData] = useState<Record<string, any>>(() => {
    let initialContent = document.content || {};

    // Check if local cache has newer unsaved edits
    try {
      const cached = localStorage.getItem(`doc_draft_${document.id}`);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed._last_autosaved_at) {
          const localTime = new Date(parsed._last_autosaved_at).getTime();
          const docTime = document.lastUpdated ? new Date(document.lastUpdated).getTime() : 0;
          if (localTime > docTime) {
            initialContent = { ...initialContent, ...parsed };
          }
        }
      }
    } catch {}

    const { autoFilledContent } = documentAutoFillService.getAutoFilledFields(
      document.templateId,
      projectDocs
    );
    
    let sprintAutoFill = {};
    if (document.templateId === 9) {
      const prjMembers = teamMembers.filter((m) => m.projectId === document.projectId);
      const prjFeatures = features.filter((f) => f.projectId === document.projectId);
      const prjTasks = tasks.filter((t) => t.projectId === document.projectId);
      sprintAutoFill = documentAutoFillService.getSprintPlanAutoFill(
        prjMembers,
        projectDocs,
        prj,
        prjFeatures,
        prjTasks
      );
    }

    const merged = documentAutoFillService.mergeWithExisting(
      { ...autoFillFallback, ...initialContent },
      { ...autoFilledContent, ...sprintAutoFill }
    );

    // Fallback any empty table fields to rich generated defaults
    template.sections?.forEach((sec) => {
      sec.fields?.forEach((f) => {
        if (f.type === 'table') {
          if (!Array.isArray(merged[f.id]) || merged[f.id].length === 0) {
            if (Array.isArray(autoFillFallback[f.id]) && autoFillFallback[f.id].length > 0) {
              merged[f.id] = autoFillFallback[f.id];
            }
          }
        }
      });
    });

    return merged;
  });

  // Real Cloud Autosave Implementation
  const performCloudAutosave = useCallback(async (contentToSave: Record<string, any>, stepIdx?: number) => {
    setSaveStatus('saving');
    try {
      const activeStep = stepIdx !== undefined ? stepIdx : currentStep;
      const payload = {
        ...contentToSave,
        _draft_step: activeStep,
        _last_autosaved_at: new Date().toISOString(),
      };
      
      // Save directly to Supabase cloud
      if (autosaveDocument) {
        await autosaveDocument(document.id, payload);
      }
      
      // Keep local backup
      try {
        localStorage.setItem(`doc_draft_${document.id}`, JSON.stringify(payload));
      } catch {}

      setSaveStatus('saved');
      setLastSavedTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    } catch (err) {
      console.warn('[DocumentEditScreen] Cloud autosave notice:', err);
      setSaveStatus('error');
    }
  }, [document.id, currentStep, autosaveDocument]);

  const scheduleAutosave = (newFormData: Record<string, any>, stepIndex?: number) => {
    setSaveStatus('saving');
    if (autosaveTimerRef.current) {
      clearTimeout(autosaveTimerRef.current);
    }
    autosaveTimerRef.current = setTimeout(() => {
      performCloudAutosave(newFormData, stepIndex !== undefined ? stepIndex : currentStep);
    }, 1200);
  };

  useEffect(() => {
    return () => {
      if (autosaveTimerRef.current) {
        clearTimeout(autosaveTimerRef.current);
      }
    };
  }, []);

  const handleStepChange = (newStep: number) => {
    setCurrentStep(newStep);
    performCloudAutosave(formData, newStep);
  };

  const handleFieldChange = (key: string, value: any) => {
    setFormData((prev) => {
      const nextData = { ...prev, [key]: value };
      scheduleAutosave(nextData, currentStep);
      return nextData;
    });
  };

  // Helper to auto-format multi-line text with bullet points (•) or sequential numbers (1, 2, 3...)
  const formatAsList = (text: string, mode: 'bullet' | 'number' = 'bullet'): string => {
    if (!text) return '';
    const lines = text.split(/\r?\n/);
    let counter = 1;

    return lines
      .map((line) => {
        const trimmed = line.trim();
        if (!trimmed) return ''; // Preserve blank line separators between paragraphs

        // Strip existing bullet or number prefixes
        const cleaned = trimmed
          .replace(/^[•\-\*⁃▪–—]\s*/, '')
          .replace(/^\d+[\.\)]\s*/, '');

        if (mode === 'bullet') {
          return `• ${cleaned}`;
        } else {
          const res = `${counter}. ${cleaned}`;
          counter++;
          return res;
        }
      })
      .join('\n');
  };

  // Helper to detect if content is bulleted or numbered
  const detectListType = (text: string): 'bullet' | 'number' | 'none' => {
    if (!text) return 'none';
    const nonEmptyLines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    if (nonEmptyLines.length === 0) return 'none';

    const bulletCount = nonEmptyLines.filter((l) => /^[•\-\*⁃▪–—]\s/.test(l)).length;
    const numberCount = nonEmptyLines.filter((l) => /^\d+[\.\)]\s/.test(l)).length;

    if (bulletCount >= nonEmptyLines.length / 2) return 'bullet';
    if (numberCount >= nonEmptyLines.length / 2) return 'number';
    return 'none';
  };

  // Smart Paste Handler: Automatically organizes multi-line pasted text with bullet points
  const handleTextareaPaste = (
    e: React.ClipboardEvent<HTMLTextAreaElement>,
    fieldId: string
  ) => {
    const pasteText = e.clipboardData.getData('text');
    if (!pasteText) return;

    const lines = pasteText.split(/\r?\n/).map((l) => l.trim());
    const nonEmptyLines = lines.filter((l) => l.length > 0);

    // If multi-line content (2 or more items)
    if (nonEmptyLines.length >= 2) {
      const currentListType = detectListType(pasteText);

      // If not already formatted as bullet or number list, automatically format with bullet points
      if (currentListType === 'none') {
        e.preventDefault();
        const formatted = formatAsList(pasteText, 'bullet');

        const target = e.currentTarget;
        const start = target.selectionStart;
        const end = target.selectionEnd;
        const currentValue = target.value;

        const newValue =
          currentValue.substring(0, start) +
          formatted +
          currentValue.substring(end);

        handleFieldChange(fieldId, newValue);

        setTimeout(() => {
          if (target) {
            target.selectionStart = target.selectionEnd = start + formatted.length;
          }
        }, 0);
      }
    }
  };

  // Smart KeyDown Handler: Automatically continues bullet points or numbers when pressing Enter
  const handleTextareaKeyDown = (
    e: React.KeyboardEvent<HTMLTextAreaElement>,
    fieldId: string
  ) => {
    if (e.key === 'Enter') {
      const target = e.currentTarget;
      const { selectionStart, selectionEnd, value } = target;

      const textBeforeCursor = value.substring(0, selectionStart);
      const textAfterCursor = value.substring(selectionEnd);
      const lastLineBreak = textBeforeCursor.lastIndexOf('\n');
      const currentLine = textBeforeCursor.substring(lastLineBreak + 1);

      // Bullet list continuation
      const bulletMatch = currentLine.match(/^([•\-\*⁃▪–—]\s*)(.*)$/);
      if (bulletMatch) {
        e.preventDefault();
        const contentAfterBullet = bulletMatch[2];

        // If user pressed Enter on an empty bullet line (just "• "), remove it and exit list
        if (!contentAfterBullet.trim()) {
          const lineStart = lastLineBreak + 1;
          const newValue = value.substring(0, lineStart) + textAfterCursor;
          handleFieldChange(fieldId, newValue);
          setTimeout(() => {
            target.selectionStart = target.selectionEnd = lineStart;
          }, 0);
          return;
        }

        // Continue bullet on next line
        const insert = '\n• ';
        const newValue = textBeforeCursor + insert + textAfterCursor;
        handleFieldChange(fieldId, newValue);
        setTimeout(() => {
          target.selectionStart = target.selectionEnd = selectionStart + insert.length;
        }, 0);
        return;
      }

      // Numbered list continuation
      const numberMatch = currentLine.match(/^(\d+)[\.\)]\s*(.*)$/);
      if (numberMatch) {
        e.preventDefault();
        const currentNum = parseInt(numberMatch[1], 10);
        const contentAfterNumber = numberMatch[2];

        // If user pressed Enter on an empty number line (e.g. "2. "), remove it and exit list
        if (!contentAfterNumber.trim()) {
          const lineStart = lastLineBreak + 1;
          const newValue = value.substring(0, lineStart) + textAfterCursor;
          handleFieldChange(fieldId, newValue);
          setTimeout(() => {
            target.selectionStart = target.selectionEnd = lineStart;
          }, 0);
          return;
        }

        // Continue with next sequential number
        const insert = `\n${currentNum + 1}. `;
        const newValue = textBeforeCursor + insert + textAfterCursor;
        handleFieldChange(fieldId, newValue);
        setTimeout(() => {
          target.selectionStart = target.selectionEnd = selectionStart + insert.length;
        }, 0);
        return;
      }
    }
  };

  // Smart Blur Handler: Automatically organizes any unbulleted multi-line text into bullet points on blur
  const handleTextareaBlur = (
    e: React.FocusEvent<HTMLTextAreaElement>,
    fieldId: string
  ) => {
    const rawVal = e.target.value;
    if (!rawVal) return;

    const lines = rawVal.split(/\r?\n/).map((l) => l.trim());
    const nonEmptyLines = lines.filter((l) => l.length > 0);

    // If multiple lines are entered without bullets or numbers, automatically organize them
    if (nonEmptyLines.length >= 2) {
      const detected = detectListType(rawVal);
      if (detected === 'none') {
        const formatted = formatAsList(rawVal, 'bullet');
        handleFieldChange(fieldId, formatted);
      }
    }
  };

  const getNextCode = (colId: string, rowIndex: number): string => {
    const num = rowIndex + 1;
    const padded = num < 10 ? `0${num}` : `${num}`;
    
    if (colId === 'code' || colId === 'wbs_code') {
      return `WBS-1.${num}`;
    }
    if (colId === 'req_id') {
      return `REQ-${padded}`;
    }
    if (colId === 'story_id') {
      return `US-${padded}`;
    }
    if (colId === 'use_case_id') {
      return `UC-${padded}`;
    }
    if (colId === 'func_id') {
      return `FNC-${padded}`;
    }
    if (colId === 'test_case_id') {
      return `TC-${padded}`;
    }
    if (colId === 'scenario_id') {
      return `SC-${padded}`;
    }
    if (colId === 'issue_id') {
      return `ISS-${padded}`;
    }
    if (colId === 'step_no') {
      return `${num}`;
    }
    return '';
  };

  const handleTableRowChange = (fieldId: string, rowIndex: number, colId: string, cellValue: any) => {
    setFormData((prev) => {
      const currentRows = Array.isArray(prev[fieldId]) ? [...prev[fieldId]] : [];
      const targetRow = { ...(currentRows[rowIndex] || {}) };
      targetRow[colId] = cellValue;
      currentRows[rowIndex] = targetRow;
      const nextData = { ...prev, [fieldId]: currentRows };
      scheduleAutosave(nextData, currentStep);
      return nextData;
    });
  };

  const handleAddTableRow = (fieldId: string, columns?: Array<{ id: string }>) => {
    setFormData((prev) => {
      const currentRows = Array.isArray(prev[fieldId]) ? [...prev[fieldId]] : [];
      const newRowIndex = currentRows.length;
      const newRow: Record<string, string> = {};
      if (columns) {
        columns.forEach((c) => {
          newRow[c.id] = getNextCode(c.id, newRowIndex);
        });
      }
      const nextData = { ...prev, [fieldId]: [...currentRows, newRow] };
      scheduleAutosave(nextData, currentStep);
      return nextData;
    });
  };

  const handleAutoPopulateFromScope = (fieldId: string, columns?: Array<{ id: string }>) => {
    const rawScope = formData.wbs_summary || formData.in_scope || formData.scope || '';
    if (!rawScope.trim()) return;

    const lines = rawScope
      .split('\n')
      .map((l: string) => l.replace(/^[-*•\d.]+\s*/, '').trim())
      .filter((l: string) => l.length > 3);

    if (lines.length === 0) return;

    const newRows = lines.map((line: string, idx: number) => {
      const row: Record<string, string> = {};
      if (columns) {
        columns.forEach((c) => {
          if (c.id === 'code' || c.id === 'wbs_code') {
            row[c.id] = `WBS-1.${idx + 1}`;
          } else if (c.id === 'task_name' || c.id === 'deliverable' || c.id === 'objective' || c.id === 'description') {
            row[c.id] = line;
          } else if (c.id === 'owner' || c.id === 'lead' || c.id === 'assignee') {
            row[c.id] = document.ownerName || 'Lead Engineer';
          } else if (c.id === 'dependencies') {
            row[c.id] = idx === 0 ? 'None' : `WBS-1.${idx}`;
          } else if (c.id === 'priority') {
            row[c.id] = 'High';
          } else if (c.id === 'status') {
            row[c.id] = 'In Progress';
          } else {
            row[c.id] = getNextCode(c.id, idx);
          }
        });
      }
      return row;
    });

    setFormData((prev) => {
      const nextData = { ...prev, [fieldId]: newRows };
      scheduleAutosave(nextData, currentStep);
      return nextData;
    });
  };

  const handleDeleteTableRow = (fieldId: string, rowIndex: number) => {
    setFormData((prev) => {
      const currentRows = Array.isArray(prev[fieldId]) ? [...prev[fieldId]] : [];
      currentRows.splice(rowIndex, 1);
      const nextData = { ...prev, [fieldId]: currentRows };
      scheduleAutosave(nextData, currentStep);
      return nextData;
    });
  };

  const handlePingOwner = () => {
    setPingSent(true);
    setTimeout(() => setPingSent(false), 5000);
  };

  const handleSaveAndNext = async () => {
    if (currentStep < steps.length - 1) {
      const nextStep = currentStep + 1;
      setCurrentStep(nextStep);
      await performCloudAutosave(formData, nextStep);
    } else {
      const isCTO = isFullAccessAdmin || userRole === 'CTO';
      
      let finalStatus: DocumentStatus = document.status;
      let finalCompletion: number = document.completion || 50;

      if (isCTO) {
        const ctoDecision = formData.cto_approval || 'Approved';
        if (ctoDecision === 'Approved') {
          finalStatus = 'Approved';
          finalCompletion = 100;
        } else if (ctoDecision === 'Revisions Requested') {
          finalStatus = 'In Review';
          finalCompletion = 70;
        } else {
          finalStatus = 'In Review';
          finalCompletion = 85;
        }
      } else {
        // Non-CTO Submitter: Submitting to CTO Verification Queue
        if (document.status !== 'Approved') {
          finalStatus = 'In Review';
          finalCompletion = 90;
          formData.submitted_by_name = user?.fullName || document.ownerName;
          formData.submitted_by_role = userRole;
          formData.submitted_at = new Date().toISOString();
        }
      }

      // Reset draft step upon formal completion
      formData._draft_step = 0;

      onSave({
        content: formData,
        status: finalStatus,
        lastUpdated: new Date().toLocaleDateString('en-GB'),
        completion: finalCompletion,
      });
      onBack();
    }
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // RENDER: SUBMITTED / LOCKED READ-ONLY VIEW FOR NON-CTO USERS
  // ─────────────────────────────────────────────────────────────────────────────
  const isSubmittedLocked = !isFullAccessAdmin && userRole !== 'CTO' && (document.status === 'In Review' || document.status === 'Approved') && formData.cto_approval !== 'Revisions Requested';
  if (isSubmittedLocked) {
    return (
      <div className="space-y-6 pb-12 animate-fade-in max-w-4xl mx-auto">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-blue-600 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4 text-slate-400" />
          <span>Back to Document Details</span>
        </button>

        <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm text-center space-y-4">
          <div className="w-14 h-14 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center mx-auto border border-amber-200 shadow-xs">
            <Lock className="w-7 h-7" />
          </div>
          <div className="space-y-1">
            <h2 className="text-xl font-extrabold text-slate-900">
              Document Submitted for CTO Verification
            </h2>
            <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
              This document (<strong>{document.name}</strong>) has been submitted to the CTO Office and is currently in <strong className="text-amber-700 font-bold">{document.status}</strong> mode. Editing is locked while awaiting executive certification.
            </p>
          </div>
          <div className="pt-2">
            <button
              onClick={onBack}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer"
            >
              View Document Details
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // RENDER: GATED / LOCKED VIEW (PRE-REQUISITES PENDING)
  // ─────────────────────────────────────────────────────────────────────────────
  if (isGated) {
    const unsatisfiedIds = getUnsatisfiedDependencies(document.templateId, projectDocs);
    const unsatisfiedDocs = unsatisfiedIds.map((reqId) => {
      const tpl = DOCUMENT_TEMPLATES.find((t) => t.id === reqId);
      const existingDoc = projectDocs.find((d) => d.templateId === reqId);
      const depNode = DOCUMENT_DEPENDENCY_GRAPH[reqId];
      return {
        id: reqId,
        name: tpl?.name || `Template #${reqId}`,
        ownerRole: tpl?.ownerRole || depNode?.editableByRoles.join(', ') || 'CTO',
        status: existingDoc?.status || 'Not Started',
      };
    });

    return (
      <div className="space-y-6 pb-12 animate-fade-in max-w-4xl mx-auto">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-blue-600 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 text-slate-400" />
          <span>Back to Document List</span>
        </button>

        <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm text-center space-y-6">
          <div className="w-16 h-16 bg-amber-50 border border-amber-200 rounded-2xl flex items-center justify-center mx-auto text-amber-600 shadow-sm">
            <Lock className="w-8 h-8" />
          </div>

          <div className="max-w-md mx-auto space-y-2">
            <h2 className="text-xl font-black text-slate-900 tracking-tight">
              Document Locked by Process Governance
            </h2>
            <p className="text-xs text-slate-500 leading-relaxed">
              <strong>{document.name}</strong> cannot be edited yet because prerequisite lifecycle documents have not been formally completed and approved.
            </p>
          </div>

          {unsatisfiedDocs.length > 0 && (
            <div className="max-w-lg mx-auto bg-slate-50 border border-slate-200 rounded-2xl p-4 text-left space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-700 uppercase tracking-wider">
                <Clock className="w-3.5 h-3.5 text-amber-500" />
                <span>Required Prerequisite Documents:</span>
              </div>
              <div className="space-y-2">
                {unsatisfiedDocs.map((req) => (
                  <div
                    key={req.id}
                    className="flex items-center justify-between p-2.5 bg-white border border-slate-200 rounded-xl text-xs"
                  >
                    <div className="flex items-center gap-2.5">
                      <FileText className="w-4 h-4 text-blue-500" />
                      <div>
                        <div className="font-bold text-slate-800">{req.name}</div>
                        <div className="text-[10px] text-slate-400">Owner: {req.ownerRole}</div>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                      {req.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {editCheck.reason && unsatisfiedDocs.length === 0 && (
            <div className="max-w-md mx-auto p-4 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-800 font-semibold">
              {editCheck.reason}
            </div>
          )}

          <div className="flex items-center justify-center gap-3 pt-2">
            <button
              onClick={onBack}
              className="px-5 py-2.5 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all"
            >
              Return to Project
            </button>
            <button
              onClick={handlePingOwner}
              disabled={pingSent}
              className={`px-5 py-2.5 text-xs font-bold rounded-xl shadow-sm transition-all flex items-center gap-2 ${
                pingSent
                  ? 'bg-emerald-600 text-white'
                  : 'bg-blue-600 hover:bg-blue-700 text-white cursor-pointer'
              }`}
            >
              <Bell className="w-3.5 h-3.5" />
              <span>{pingSent ? '✓ Ping Sent to Document Owner' : 'Ping Document Owner on Dashboard'}</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // RENDER: ACTIVE EDITING WIZARD
  // ─────────────────────────────────────────────────────────────────────────────
  const currentStepData = steps[currentStep];

  return (
    <div className="space-y-6 pb-12 animate-fade-in">
      {/* Header with Back and Auto-Save indicator */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-blue-600 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 text-slate-400 hover:text-blue-600" />
          <span>{backButtonLabel || 'Back to Document'}</span>
        </button>

        <div className="flex items-center gap-2">
          {saveStatus === 'saving' && (
            <div className="flex items-center gap-1.5 text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 px-3 py-1 rounded-full animate-fade-in shadow-2xs">
              <Cloud className="w-3.5 h-3.5 text-blue-600 animate-pulse" />
              <span>Autosaving to cloud...</span>
            </div>
          )}
          {saveStatus === 'saved' && (
            <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full animate-fade-in shadow-2xs">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
              <span>Saved in Cloud {lastSavedTime ? `(${lastSavedTime})` : ''}</span>
            </div>
          )}
          {saveStatus === 'error' && (
            <button
              type="button"
              onClick={() => performCloudAutosave(formData, currentStep)}
              className="flex items-center gap-1.5 text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 px-3 py-1 rounded-full hover:bg-rose-100 transition-colors cursor-pointer"
              title="Click to retry cloud save"
            >
              <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
              <span>Cloud Sync Failed — Click to Retry</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => performCloudAutosave(formData, currentStep)}
            disabled={saveStatus === 'saving'}
            className="px-3 py-1 text-xs font-bold text-slate-600 hover:text-blue-700 bg-white hover:bg-blue-50 border border-slate-200 hover:border-blue-200 rounded-xl transition-all shadow-2xs cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
            title="Save draft directly to cloud now"
          >
            <Cloud className="w-3.5 h-3.5 text-blue-600" />
            <span>Save Draft</span>
          </button>
        </div>
      </div>

      {/* Main Title Banner with Mode Toggle */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
            Edit Document — {document.name}
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Digitized Form Engine • Template #{document.docNumber} ({document.phase} Phase)
          </p>
        </div>

        {/* View Mode Switcher */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setViewMode('form')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              viewMode === 'form'
                ? 'bg-white text-blue-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Form Editor
          </button>
          <button
            type="button"
            onClick={() => setViewMode('preview')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              viewMode === 'preview'
                ? 'bg-white text-blue-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-blue-600" />
            <span>Live Branded Preview</span>
          </button>
        </div>
      </div>

      {viewMode === 'preview' ? (
        /* Live Branded Template Preview with Custom Watermark & Letterhead */
        (() => {
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
            <div className="bg-white p-8 sm:p-10 rounded-2xl border border-slate-200 shadow-md space-y-6 text-xs font-sans text-slate-800 relative overflow-hidden transition-all animate-fade-in">
              {/* Company Watermark Overlay */}
              <DocumentWatermarkOverlay
                branding={documentBranding}
                companyName={orgName}
                logoUrl={orgLogo}
              />

              {/* Document Sheet Content */}
              <div className="relative z-10 space-y-6">
                {/* Header Banner */}
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

                {/* Title */}
                <div>
                  <h2 className="text-xl font-extrabold text-blue-950 uppercase tracking-tight">
                    {document.name}
                  </h2>
                  <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                    <span>Phase: <strong className="text-blue-700">{document.phase}</strong></span>
                    <span>•</span>
                    <span>Status: <strong className="text-blue-700">{document.status}</strong></span>
                  </div>
                </div>

                {/* Table 1: DOCUMENT CONTROL */}
                <div className="space-y-1.5">
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">DOCUMENT CONTROL</h3>
                  <div className="overflow-x-auto rounded-xl border border-slate-300 shadow-2xs bg-white/90">
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
                          <td className="p-2.5 text-slate-800 font-medium">{formData.cto_approval || document.status}</td>
                          <td className="p-2.5 text-slate-600">In-progress live edit</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Table 2: METADATA */}
                <div className="overflow-x-auto rounded-xl border border-slate-300 shadow-2xs">
                  <table className="w-full text-left text-xs border-collapse bg-slate-50/70">
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

                {/* Sections & Live Form Data */}
                <div className="space-y-6 pt-2">
                  {template.sections.map((sec) => {
                    if (sec.id === 'approvals') return null;

                    return (
                      <div key={sec.id} className="space-y-3">
                        <h3 className="text-xs font-bold text-[#1B365D] uppercase tracking-wider border-b border-blue-200 pb-1.5">
                          {sec.title}
                        </h3>

                        {sec.fields.map((field) => {
                          const val = formData[field.id];

                          if (field.type === 'table') {
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
                                        {columns.map((col) => <th key={col.id} className="p-2">{col.label}</th>)}
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-200/70 bg-white text-[11px]">
                                      {tableRows.length > 0 ? (
                                        tableRows.map((row, rIdx) => (
                                          <tr key={rIdx} className="hover:bg-slate-50/50">
                                            <td className="p-2 text-center text-slate-400 font-bold text-[10px]">{rIdx + 1}</td>
                                            {columns.map((col) => (
                                              <td key={col.id} className="p-2 text-slate-800 font-medium">
                                                {row[col.id] !== undefined && String(row[col.id]).trim() !== '' ? String(row[col.id]) : '—'}
                                              </td>
                                            ))}
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

                {/* Footer */}
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
        })()
      ) : (
        <>
          {/* Resumed from Cloud Draft Notice */}
          {resumedNotice && (
            <div className="p-3.5 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl flex items-center justify-between text-xs text-blue-900 shadow-xs animate-fade-in">
              <div className="flex items-center gap-2.5 font-semibold">
                <Sparkles className="w-4 h-4 text-blue-600 shrink-0" />
                <span>{resumedNotice} — Your previous work has been loaded from the cloud.</span>
              </div>
              <button
                type="button"
                onClick={() => setResumedNotice(null)}
                className="text-slate-400 hover:text-slate-700 font-bold px-2 py-0.5 rounded-md hover:bg-white/60 transition-colors cursor-pointer"
                title="Dismiss notice"
              >
                ✕
              </button>
            </div>
          )}

          {/* Auto-Fill Banner */}
          {autoFillSources.length > 0 && (
            <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl flex items-center gap-3 text-xs text-blue-900 shadow-xs">
              <div className="w-7 h-7 bg-blue-100 rounded-xl flex items-center justify-center text-blue-600 shrink-0">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <span className="font-bold">Auto-Populated from Lifecycle Pipeline:</span> Data has been pre-filled from <strong>{autoFillSources.join(', ')}</strong>. You can modify any value as needed.
              </div>
            </div>
          )}

      {/* Multi-Step Wizard Stepper */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center justify-between max-w-3xl mx-auto overflow-x-auto py-1">
          {steps.map((step, idx) => {
            const isCurrent = currentStep === idx;
            const isCompleted = currentStep > idx;

            return (
              <div key={step.id} className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => handleStepChange(idx)}
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                    isCurrent
                      ? 'bg-blue-600 text-white ring-4 ring-blue-100 shadow-sm'
                      : isCompleted
                      ? 'bg-emerald-500 text-white'
                      : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  {isCompleted ? <Check className="w-3.5 h-3.5 text-white" /> : idx + 1}
                </button>
                <span
                  className={`text-xs font-semibold ${
                    isCurrent ? 'text-blue-700 font-bold' : isCompleted ? 'text-slate-800' : 'text-slate-400'
                  }`}
                >
                  {step.label}
                </span>

                {idx < steps.length - 1 && (
                  <div className={`w-6 sm:w-12 h-0.5 mx-1 ${isCompleted ? 'bg-emerald-500' : 'bg-slate-200'}`} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Form Content Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-6">
        <div className="border-b border-slate-100 pb-3">
          <h3 className="text-sm font-extrabold text-slate-900">
            {currentStepData.id === 'approvals' && !isFullAccessAdmin && userRole !== 'CTO'
              ? '5. SUBMISSION FOR CTO VERIFICATION'
              : currentStepData.label}
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            {currentStepData.id === 'approvals' && !isFullAccessAdmin && userRole !== 'CTO'
              ? 'Submit your drafted deliverables to the CTO Dashboard verification queue for official executive certification.'
              : currentStepData.description}
          </p>
        </div>

        {/* Dynamic Fields for current step (omitted on approval step to prevent non-CTO self-approval) */}
        {currentStepData.id !== 'approvals' && currentStepData.fields && currentStepData.fields.length > 0 ? (
          <div className="space-y-4">
            {currentStepData.fields.map((field) => {
              const value = formData[field.id] !== undefined ? formData[field.id] : (field.defaultValue || '');

              if (field.type === 'textarea') {
                const currentValStr = String(value || '');
                const currentListType = detectListType(currentValStr);
                const lineCount = currentValStr.split('\n').length;
                const dynamicRows = Math.max(4, Math.min(14, lineCount + 1));

                return (
                  <div key={field.id} className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                        {field.label}
                      </label>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            if (currentListType === 'bullet') {
                              const stripped = currentValStr
                                .split('\n')
                                .map((l) => l.replace(/^[•\-\*⁃▪–—]\s*/, ''))
                                .join('\n');
                              handleFieldChange(field.id, stripped);
                            } else {
                              handleFieldChange(field.id, formatAsList(currentValStr, 'bullet'));
                            }
                          }}
                          className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold rounded-md border transition-all cursor-pointer ${
                            currentListType === 'bullet'
                              ? 'bg-blue-50 text-blue-700 border-blue-300 shadow-2xs font-bold'
                              : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100 hover:text-slate-800'
                          }`}
                          title="Format as bullet points (•)"
                        >
                          <List className="w-3 h-3 text-blue-600" />
                          <span>Bullet List</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (currentListType === 'number') {
                              const stripped = currentValStr
                                .split('\n')
                                .map((l) => l.replace(/^\d+[\.\)]\s*/, ''))
                                .join('\n');
                              handleFieldChange(field.id, stripped);
                            } else {
                              handleFieldChange(field.id, formatAsList(currentValStr, 'number'));
                            }
                          }}
                          className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold rounded-md border transition-all cursor-pointer ${
                            currentListType === 'number'
                              ? 'bg-blue-50 text-blue-700 border-blue-300 shadow-2xs font-bold'
                              : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100 hover:text-slate-800'
                          }`}
                          title="Format as numbered list (1, 2, 3...)"
                        >
                          <ListOrdered className="w-3 h-3 text-blue-600" />
                          <span>Numbered List</span>
                        </button>
                      </div>
                    </div>
                    <textarea
                      rows={dynamicRows}
                      value={value}
                      onChange={(e) => handleFieldChange(field.id, e.target.value)}
                      onPaste={(e) => handleTextareaPaste(e, field.id)}
                      onKeyDown={(e) => handleTextareaKeyDown(e, field.id)}
                      onBlur={(e) => handleTextareaBlur(e, field.id)}
                      placeholder={field.placeholder || `Enter ${field.label.toLowerCase()}...`}
                      className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium text-slate-800 leading-relaxed shadow-2xs transition-all"
                    />
                  </div>
                );
              }

              if (field.type === 'select') {
                return (
                  <div key={field.id}>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      {field.label}
                    </label>
                    <select
                      value={value}
                      onChange={(e) => handleFieldChange(field.id, e.target.value)}
                      className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium text-slate-800"
                    >
                      <option value="">Select an option...</option>
                      {field.options?.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  </div>
                );
              }

              if (field.type === 'date') {
                return (
                  <div key={field.id}>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      {field.label}
                    </label>
                    <input
                      type="date"
                      value={value}
                      onChange={(e) => handleFieldChange(field.id, e.target.value)}
                      className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium text-slate-800"
                    />
                  </div>
                );
              }

              if (field.type === 'table') {
                const tableRows: Record<string, any>[] = Array.isArray(value) && value.length > 0 
                  ? value 
                  : (Array.isArray(autoFillFallback[field.id]) && autoFillFallback[field.id].length > 0
                    ? autoFillFallback[field.id]
                    : (field.columns ? [{}] : []));
                const columns = field.columns || [{ id: 'col1', label: 'Column 1' }];

                return (
                  <div key={field.id} className="space-y-2 pt-2 pb-2">
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider">
                        {field.label}
                      </label>
                      <div className="flex items-center gap-2">
                        {(formData.wbs_summary || formData.in_scope || formData.scope) && (
                          <button
                            type="button"
                            onClick={() => handleAutoPopulateFromScope(field.id, columns)}
                            className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
                            title="Extract rows from narrative scope"
                          >
                            <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                            <span>Auto-Populate from Scope</span>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleAddTableRow(field.id, columns)}
                          className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Add Row</span>
                        </button>
                      </div>
                    </div>

                    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-slate-50/50 shadow-2xs">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="bg-slate-100/80 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px] tracking-wider">
                            <th className="p-2.5 w-10 text-center text-slate-400">#</th>
                            {columns.map((col) => (
                              <th key={col.id} className="p-2.5">
                                {col.label}
                              </th>
                            ))}
                            <th className="p-2.5 w-12 text-center">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200/70 bg-white">
                          {tableRows.map((row, rIdx) => (
                            <tr key={rIdx} className="hover:bg-slate-50/60 transition-colors">
                              <td className="p-2 text-center text-[10px] font-bold text-slate-400">
                                {rIdx + 1}
                              </td>
                              {columns.map((col) => {
                                const isCodeCol = col.id === 'code' || col.id === 'wbs_code' || col.id === 'req_id' || col.id === 'story_id' || col.id === 'test_case_id' || col.id === 'use_case_id' || col.id === 'func_id' || col.id === 'scenario_id' || col.id === 'issue_id' || col.id === 'step_no';
                                const defaultVal = isCodeCol && (!row[col.id] || row[col.id] === '') ? getNextCode(col.id, rIdx) : '';
                                const cellVal = row[col.id] !== undefined && row[col.id] !== '' ? row[col.id] : defaultVal;

                                if (col.type === 'select' && col.options) {
                                  return (
                                    <td key={col.id} className="p-1.5 min-w-[130px]">
                                      <select
                                        value={cellVal}
                                        onChange={(e) => handleTableRowChange(field.id, rIdx, col.id, e.target.value)}
                                        className="w-full px-2 py-1.5 text-xs bg-slate-50/80 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium text-slate-800"
                                      >
                                        <option value="">Select...</option>
                                        {col.options.map((opt) => (
                                          <option key={opt} value={opt}>
                                            {opt}
                                          </option>
                                        ))}
                                      </select>
                                    </td>
                                  );
                                }

                                if (col.type === 'date') {
                                  return (
                                    <td key={col.id} className="p-1.5 min-w-[130px]">
                                      <input
                                        type="date"
                                        value={cellVal}
                                        onChange={(e) => handleTableRowChange(field.id, rIdx, col.id, e.target.value)}
                                        className="w-full px-2 py-1.5 text-xs bg-slate-50/80 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium text-slate-800"
                                      />
                                    </td>
                                  );
                                }

                                const isMultiEmployeeCol = col.id === 'audience' || col.id === 'attendees' || col.id === 'participants' || col.id === 'stakeholders' || col.id === 'reviewers' || col.id.includes('audience') || col.id.includes('attendees') || col.id.includes('stakeholders') || col.id.includes('participants');
                                const isSingleEmployeeCol = col.id === 'member_name' || col.id === 'name' || col.id === 'team_member' || col.id === 'owner' || col.id === 'lead' || col.id === 'assignee' || col.id === 'verified_by' || col.id.includes('member') || col.id.includes('assignee') || col.id.includes('owner') || col.id.includes('lead');
                                const isSourceOrDocCol = col.id === 'source' || col.id === 'source_doc' || col.id === 'reference_doc' || col.id === 'reference' || col.id === 'linked_doc' || col.id === 'traceability' || col.id === 'upstream_doc' || col.id.includes('source') || col.id.includes('reference') || col.id.includes('traceability');

                                if ((isMultiEmployeeCol || isSingleEmployeeCol) && teamMembers && teamMembers.length > 0) {
                                  return (
                                    <td key={col.id} className={`p-1.5 ${isMultiEmployeeCol ? 'min-w-[240px]' : 'min-w-[200px]'}`}>
                                      <EmployeeSelect
                                        value={cellVal}
                                        multiple={isMultiEmployeeCol}
                                        teamMembers={teamMembers}
                                        placeholder={col.placeholder || (isMultiEmployeeCol ? 'Select Audience / Attendees...' : `Select ${col.label}...`)}
                                        onChange={(selected) => {
                                          setFormData((prev) => {
                                            const currentRows = Array.isArray(prev[field.id]) ? [...prev[field.id]] : [];
                                            const targetRow = { ...(currentRows[rIdx] || {}) };
                                            targetRow[col.id] = selected.name;

                                            // Auto-populate role / designation if single mode & empty
                                            if (!isMultiEmployeeCol) {
                                              if (selected.designation) {
                                                if (targetRow.role !== undefined && (!targetRow.role || targetRow.role === '')) {
                                                  targetRow.role = selected.designation;
                                                }
                                                if (targetRow.designation !== undefined && (!targetRow.designation || targetRow.designation === '')) {
                                                  targetRow.designation = selected.designation;
                                                }
                                              }
                                              if (selected.department) {
                                                if (targetRow.department !== undefined && (!targetRow.department || targetRow.department === '')) {
                                                  targetRow.department = selected.department;
                                                }
                                              }
                                            }

                                            currentRows[rIdx] = targetRow;
                                            const nextData = { ...prev, [field.id]: currentRows };
                                            scheduleAutosave(nextData, currentStep);
                                            return nextData;
                                          });
                                        }}
                                      />
                                    </td>
                                  );
                                }

                                if (isSourceOrDocCol) {
                                  return (
                                    <td key={col.id} className="p-1.5 min-w-[220px]">
                                      <DocumentSelect
                                        value={cellVal}
                                        projectDocuments={projectDocs}
                                        placeholder={col.placeholder || 'Select Source Document...'}
                                        onChange={(selectedDoc) => {
                                          handleTableRowChange(field.id, rIdx, col.id, selectedDoc);
                                        }}
                                      />
                                    </td>
                                  );
                                }

                                return (
                                  <td key={col.id} className="p-1.5 min-w-[150px]">
                                    <input
                                      type="text"
                                      value={cellVal}
                                      placeholder={col.placeholder || (isCodeCol ? defaultVal : col.label)}
                                      onChange={(e) => handleTableRowChange(field.id, rIdx, col.id, e.target.value)}
                                      className="w-full px-2.5 py-1.5 text-xs bg-slate-50/80 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium text-slate-800"
                                    />
                                  </td>
                                );
                              })}
                              <td className="p-1.5 text-center">
                                <button
                                  type="button"
                                  onClick={() => handleDeleteTableRow(field.id, rIdx)}
                                  className="p-1 text-slate-400 hover:text-rose-600 rounded-md hover:bg-rose-50 transition-colors"
                                  title="Delete row"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              }

              return (
                <div key={field.id}>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    {field.label}
                  </label>
                  <input
                    type="text"
                    value={value}
                    onChange={(e) => handleFieldChange(field.id, e.target.value)}
                    placeholder={field.placeholder || `Enter ${field.label.toLowerCase()}...`}
                    className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium text-slate-800"
                  />
                </div>
              );
            })}
          </div>
        ) : null}

        {/* Approvals / Submission Section Step */}
        {(currentStepData.id === 'approvals' || currentStep === steps.length - 1) && (
          <div className="space-y-4 pt-2">
            {isFullAccessAdmin || userRole === 'CTO' ? (
              <div className="p-5 bg-gradient-to-br from-blue-50/80 to-indigo-50/60 rounded-2xl border border-blue-200 shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-blue-900 font-bold text-xs">
                    <ShieldCheck className="w-4 h-4 text-blue-600" />
                    <span>CTO Office Executive Certification & Sign-off</span>
                  </div>
                  <span className="text-[10px] font-bold bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full border border-blue-300">
                    CTO Authority
                  </span>
                </div>
                <p className="text-xs text-blue-800/80 leading-relaxed">
                  As CTO, approving this document certifies the baseline, unlocks downstream lifecycle artifacts, and authorizes engineering execution.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      CTO Decision *
                    </label>
                    <select
                      value={formData.cto_approval || (document.status === 'Approved' ? 'Approved' : 'Approved')}
                      onChange={(e) => handleFieldChange('cto_approval', e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-white border border-blue-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold text-slate-900 shadow-xs"
                    >
                      <option value="Approved">Approved (Certify & Freeze Version)</option>
                      <option value="Pending Review">Pending Review</option>
                      <option value="Revisions Requested">Revisions Requested</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Approval Date *
                    </label>
                    <input
                      type="date"
                      value={formData.approval_date || new Date().toISOString().split('T')[0]}
                      onChange={(e) => handleFieldChange('approval_date', e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-white border border-blue-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold shadow-xs"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    CTO Review Remarks / Guidance
                  </label>
                  <textarea
                    rows={3}
                    value={formData.approval_notes || ''}
                    onChange={(e) => handleFieldChange('approval_notes', e.target.value)}
                    onPaste={(e) => handleTextareaPaste(e, 'approval_notes')}
                    onKeyDown={(e) => handleTextareaKeyDown(e, 'approval_notes')}
                    onBlur={(e) => handleTextareaBlur(e, 'approval_notes')}
                    placeholder="Executive comments, sign-off notes, or instructions for the project team..."
                    className="w-full px-3.5 py-2 text-xs bg-white border border-blue-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium text-slate-800 shadow-2xs"
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="p-5 bg-gradient-to-br from-slate-50 to-blue-50/40 rounded-2xl border border-slate-200 shadow-xs space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-slate-900 font-bold text-xs">
                      <Sparkles className="w-4 h-4 text-blue-600" />
                      <span>Document Verification & Handover to CTO</span>
                    </div>
                    <span className="text-[10px] font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full border border-slate-200">
                      Submitter Mode ({userRole})
                    </span>
                  </div>

                  {document.status === 'Approved' ? (
                    <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2.5 text-xs text-emerald-800 font-semibold">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>✓ Formally Certified & Approved by CTO Office ({formData.approval_date || document.lastUpdated})</span>
                    </div>
                  ) : document.status === 'In Review' ? (
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-2.5 text-xs text-amber-800 font-semibold">
                      <Clock className="w-4 h-4 text-amber-600 shrink-0" />
                      <span>⏳ Submitted to CTO Dashboard Verification Queue — Awaiting CTO Sign-off</span>
                    </div>
                  ) : (
                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl flex items-center gap-2.5 text-xs text-blue-900 font-semibold">
                      <FileText className="w-4 h-4 text-blue-600 shrink-0" />
                      <span>📋 Draft Complete — Ready for Submission to CTO Verification Queue</span>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Handover Remarks / Notes for CTO (Optional)
                    </label>
                    <textarea
                      rows={3}
                      value={formData.submission_notes || ''}
                      onChange={(e) => handleFieldChange('submission_notes', e.target.value)}
                      onPaste={(e) => handleTextareaPaste(e, 'submission_notes')}
                      onKeyDown={(e) => handleTextareaKeyDown(e, 'submission_notes')}
                      onBlur={(e) => handleTextareaBlur(e, 'submission_notes')}
                      placeholder="Add summary notes or specific handover highlights for the CTO review..."
                      className="w-full px-3.5 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium text-slate-800 shadow-2xs"
                    />
                  </div>

                  <div className="p-3 bg-slate-100/80 rounded-xl border border-slate-200/80 text-[11px] text-slate-600 leading-relaxed">
                    <span className="font-bold text-slate-700">Governance Policy:</span> Only the CTO or Executive Admin can electronically sign off and certify project deliverables. Clicking <strong>&quot;Submit to CTO for Verification&quot;</strong> will advance this document to the CTO Dashboard for verification.
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-100">
          <button
            type="button"
            onClick={onBack}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            Cancel
          </button>

          <div className="flex items-center gap-2.5">
            {currentStep > 0 && (
              <button
                type="button"
                onClick={() => handleStepChange(currentStep - 1)}
                className="px-4 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
              >
                Previous
              </button>
            )}

            <button
              type="button"
              onClick={handleSaveAndNext}
              className="px-5 py-2.5 text-xs font-bold text-white bg-gradient-to-r from-[#0d82ff] to-[#00d1ff] hover:from-[#0065ff] hover:to-[#00bce8] rounded-xl shadow-[0_4px_18px_rgba(13,130,255,0.35)] transition-all flex items-center gap-1.5 cursor-pointer transform hover:-translate-y-0.5"
            >
              <span>
                {currentStep < steps.length - 1
                  ? 'Next Step'
                  : isFullAccessAdmin || userRole === 'CTO'
                  ? 'Certify & Save Sign-off'
                  : document.status === 'Approved'
                  ? 'Save Updates'
                  : 'Submit to CTO for Verification'}
              </span>
              <ArrowRight className="w-3.5 h-3.5 text-white" />
            </button>
          </div>
        </div>
      </div>
    </>
  )}
</div>
  );
};
