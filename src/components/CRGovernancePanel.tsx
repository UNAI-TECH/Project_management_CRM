import React, { useState, useEffect } from 'react';
import { 
  GitPullRequest, 
  AlertTriangle, 
  ShieldAlert, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  TrendingUp, 
  Plus, 
  ChevronRight,
  Layers,
  FileText,
  DollarSign,
  Calendar,
  UserCheck,
  RefreshCw
} from 'lucide-react';
import type { ChangeRequest, CRImpactAnalysis, CRApprovalDecision, CRType, CRSeverity, ProjectDocument, UserRole } from '../types';
import { crGovernanceService, SubmitCRPayload } from '../services/crGovernanceService';

interface CRGovernancePanelProps {
  projectId: string;
  projectName: string;
  currentUser: { id: string; name: string; role: UserRole };
  documents?: ProjectDocument[];
  organizationId?: string;
}

export const CRGovernancePanel: React.FC<CRGovernancePanelProps> = ({
  projectId,
  projectName,
  currentUser,
  documents = [],
  organizationId = 'org-unai',
}) => {
  const [changeRequests, setChangeRequests] = useState<ChangeRequest[]>([]);
  const [selectedCrId, setSelectedCrId] = useState<string | null>(null);
  const [selectedCrDetails, setSelectedCrDetails] = useState<{
    changeRequest: ChangeRequest | null;
    impactAnalysis: CRImpactAnalysis | null;
    approvalHistory: CRApprovalDecision[];
  }>({ changeRequest: null, impactAnalysis: null, approvalHistory: [] });

  const [loading, setLoading] = useState<boolean>(true);
  const [showSubmitModal, setShowSubmitModal] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [decisionModal, setDecisionModal] = useState<{ isOpen: boolean; decision: 'Approved' | 'Rejected' | 'Changes Requested'; comments: string }>({
    isOpen: false,
    decision: 'Approved',
    comments: '',
  });

  // New CR Form State
  const [formTitle, setFormTitle] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formReason, setFormReason] = useState('');
  const [formCrType, setFormCrType] = useState<CRType>('Scope');
  const [formSeverity, setFormSeverity] = useState<CRSeverity>('Medium');
  const [formSourceDocId, setFormSourceDocId] = useState('');
  const [formBudgetPct, setFormBudgetPct] = useState<number>(0);
  const [formBudgetAmount, setFormBudgetAmount] = useState<number>(0);
  const [formTimelineDays, setFormTimelineDays] = useState<number>(0);
  const [formEffortSplit, setFormEffortSplit] = useState<number>(0);

  const isCtoOrPm = ['CTO', 'PM', 'CEO'].includes(currentUser.role);
  const isCto = ['CTO', 'CEO'].includes(currentUser.role);

  const loadChangeRequests = async () => {
    setLoading(true);
    try {
      const list = await crGovernanceService.getChangeRequests(projectId, organizationId);
      setChangeRequests(list);
      if (list.length > 0 && !selectedCrId) {
        setSelectedCrId(list[0].id);
      }
    } catch (err) {
      console.error('Error loading CRs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadChangeRequests();
  }, [projectId]);

  useEffect(() => {
    if (selectedCrId) {
      crGovernanceService.getChangeRequestDetails(selectedCrId).then(setSelectedCrDetails);
    }
  }, [selectedCrId]);

  const handleSubmitCR = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim() || !formDescription.trim()) return;

    setSubmitting(true);
    try {
      const payload: SubmitCRPayload = {
        projectId,
        title: formTitle.trim(),
        description: formDescription.trim(),
        reason: formReason.trim(),
        crType: formCrType,
        severity: formSeverity,
        sourceDocumentId: formSourceDocId || undefined,
        budgetImpactAmount: Number(formBudgetAmount),
        budgetImpactPct: Number(formBudgetPct),
        timelineImpactDays: Number(formTimelineDays),
        effortSplitRatio: Number(formEffortSplit) / 100,
      };

      const newCr = await crGovernanceService.submitChangeRequest(
        payload,
        currentUser.id,
        currentUser.name,
        currentUser.role,
        organizationId
      );

      setShowSubmitModal(false);
      resetForm();
      await loadChangeRequests();
      setSelectedCrId(newCr.id);
    } catch (err) {
      console.error('Error creating CR:', err);
      alert('Failed to submit change request. Please verify connection.');
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormTitle('');
    setFormDescription('');
    setFormReason('');
    setFormCrType('Scope');
    setFormSeverity('Medium');
    setFormSourceDocId('');
    setFormBudgetPct(0);
    setFormBudgetAmount(0);
    setFormTimelineDays(0);
    setFormEffortSplit(0);
  };

  const handleRecordDecision = async () => {
    if (!selectedCrId) return;
    try {
      await crGovernanceService.recordDecision(
        selectedCrId,
        decisionModal.decision,
        decisionModal.comments,
        currentUser.id,
        currentUser.name,
        currentUser.role,
        organizationId
      );
      setDecisionModal({ isOpen: false, decision: 'Approved', comments: '' });
      await loadChangeRequests();
      const updated = await crGovernanceService.getChangeRequestDetails(selectedCrId);
      setSelectedCrDetails(updated);
    } catch (err) {
      console.error('Error recording CR decision:', err);
      alert('Error updating decision status.');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Approved':
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200"><CheckCircle2 className="w-3.5 h-3.5" /> Approved</span>;
      case 'Escalated to CTO':
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200"><ShieldAlert className="w-3.5 h-3.5" /> Escalated to CTO</span>;
      case 'Under Review':
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200"><Clock className="w-3.5 h-3.5" /> Under Review</span>;
      case 'Rejected':
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-50 text-red-700 border border-red-200"><XCircle className="w-3.5 h-3.5" /> Rejected</span>;
      default:
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">{status}</span>;
    }
  };

  const getSeverityBadge = (sev?: string) => {
    switch (sev) {
      case 'Critical':
        return <span className="px-2 py-0.5 rounded text-xs font-bold bg-red-100 text-red-800">CRITICAL</span>;
      case 'High':
        return <span className="px-2 py-0.5 rounded text-xs font-bold bg-orange-100 text-orange-800">HIGH</span>;
      case 'Medium':
        return <span className="px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800">MEDIUM</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-600">LOW</span>;
    }
  };

  const selectedCr = selectedCrDetails.changeRequest;
  const impact = selectedCrDetails.impactAnalysis;

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b border-slate-200 flex flex-wrap items-center justify-between gap-4 bg-gradient-to-r from-slate-50 to-white">
        <div>
          <div className="flex items-center gap-2">
            <GitPullRequest className="w-6 h-6 text-indigo-600" />
            <h2 className="text-xl font-bold text-slate-900">Change Request Governance</h2>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
              Live Traceability
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Automated Impact Analysis, Tiered Approval Routing (PM / CTO), and Scope Governance.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={loadChangeRequests}
            className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={() => setShowSubmitModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium shadow-sm transition-all"
          >
            <Plus className="w-4 h-4" />
            Submit Change Request
          </button>
        </div>
      </div>

      {/* Main Content Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 min-h-[550px]">
        {/* CR List Sidebar (4 cols) */}
        <div className="lg:col-span-4 border-r border-slate-200 bg-slate-50/50 p-4 space-y-3 overflow-y-auto max-h-[700px]">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500 uppercase tracking-wider px-1">
            <span>Change Requests ({changeRequests.length})</span>
            <span>Status</span>
          </div>

          {loading ? (
            <div className="text-center py-12 text-slate-400 text-sm">Loading change requests...</div>
          ) : changeRequests.length === 0 ? (
            <div className="text-center py-12 px-4 border-2 border-dashed border-slate-200 rounded-lg">
              <GitPullRequest className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-medium text-slate-700">No Change Requests</p>
              <p className="text-xs text-slate-500 mt-1">This project has no submitted change requests yet.</p>
            </div>
          ) : (
            changeRequests.map((cr) => {
              const isSelected = cr.id === selectedCrId;
              return (
                <div
                  key={cr.id}
                  onClick={() => setSelectedCrId(cr.id)}
                  className={`p-4 rounded-xl cursor-pointer border transition-all ${
                    isSelected
                      ? 'bg-white border-indigo-500 shadow-md ring-1 ring-indigo-500'
                      : 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-sm'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-slate-600">{cr.changeCode}</span>
                        {getSeverityBadge(cr.severity)}
                      </div>
                      <h4 className="font-semibold text-slate-900 text-sm mt-1 line-clamp-1">{cr.title}</h4>
                    </div>
                    {getStatusBadge(cr.status)}
                  </div>
                  <div className="mt-3 flex items-center justify-between text-xs text-slate-500 border-t border-slate-100 pt-2">
                    <span>By: {cr.requestedByName || 'Team Member'}</span>
                    <span className="font-mono">{cr.crType || 'Scope'}</span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* CR Detail & Impact Analysis (8 cols) */}
        <div className="lg:col-span-8 p-6 overflow-y-auto max-h-[700px]">
          {!selectedCr ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-400 py-16">
              <GitPullRequest className="w-12 h-12 text-slate-300 mb-3" />
              <p className="font-medium text-slate-600">Select a Change Request</p>
              <p className="text-xs text-slate-400 mt-1">View automated impact analysis, document traceability & approval chain.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Top Banner */}
              <div className="flex flex-wrap items-start justify-between gap-4 pb-4 border-b border-slate-200">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-bold text-slate-500">{selectedCr.changeCode}</span>
                    <span className="px-2 py-0.5 rounded text-xs font-semibold bg-slate-100 text-slate-700">{selectedCr.crType}</span>
                    {getSeverityBadge(selectedCr.severity)}
                    {getStatusBadge(selectedCr.status)}
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 mt-2">{selectedCr.title}</h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Submitted by <strong className="text-slate-700">{selectedCr.requestedByName}</strong> on {selectedCr.createdAt}
                  </p>
                </div>

                {/* Approval Action Bar for PM / CTO */}
                {isCtoOrPm && (selectedCr.status === 'Under Review' || (selectedCr.status === 'Escalated to CTO' && isCto)) && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setDecisionModal({ isOpen: true, decision: 'Approved', comments: '' })}
                      className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-all"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      Approve CR
                    </button>
                    <button
                      onClick={() => setDecisionModal({ isOpen: true, decision: 'Changes Requested', comments: '' })}
                      className="px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-all"
                    >
                      <RefreshCw className="w-4 h-4" />
                      Request Changes
                    </button>
                    <button
                      onClick={() => setDecisionModal({ isOpen: true, decision: 'Rejected', comments: '' })}
                      className="px-3.5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-all"
                    >
                      <XCircle className="w-4 h-4" />
                      Reject
                    </button>
                  </div>
                )}
              </div>

              {/* Description & Justification */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                  <h5 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Description</h5>
                  <p className="text-sm text-slate-800 whitespace-pre-wrap">{selectedCr.description}</p>
                </div>
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                  <h5 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Business Reason / Justification</h5>
                  <p className="text-sm text-slate-800 whitespace-pre-wrap">{selectedCr.reason || 'No business reason provided.'}</p>
                </div>
              </div>

              {/* Automated Impact Analysis Card */}
              <div className="bg-indigo-50/50 border border-indigo-100 rounded-xl p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-indigo-600" />
                    <h4 className="font-bold text-slate-900 text-sm">Automated Impact Analysis</h4>
                  </div>
                  {impact?.requiresCtoApproval ? (
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-purple-100 text-purple-800 border border-purple-300">
                      <ShieldAlert className="w-3.5 h-3.5" /> CTO Escalation Mandatory
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                      <UserCheck className="w-3.5 h-3.5" /> PM Approval Authority
                    </span>
                  )}
                </div>

                {/* Impact Metrics Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="bg-white p-3 rounded-lg border border-indigo-100">
                    <span className="text-xs text-slate-500 font-medium flex items-center gap-1"><DollarSign className="w-3.5 h-3.5" /> Budget Delta</span>
                    <p className="text-lg font-bold text-slate-900 mt-0.5">
                      ${selectedCr.budgetImpactAmount?.toLocaleString() || '0'}
                      <span className="text-xs font-normal text-slate-500 ml-1">({selectedCr.budgetImpactPct || 0}%)</span>
                    </p>
                  </div>
                  <div className="bg-white p-3 rounded-lg border border-indigo-100">
                    <span className="text-xs text-slate-500 font-medium flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> Timeline Delta</span>
                    <p className="text-lg font-bold text-slate-900 mt-0.5">
                      +{selectedCr.timelineImpactDays || 0} <span className="text-xs font-normal text-slate-500">days</span>
                    </p>
                  </div>
                  <div className="bg-white p-3 rounded-lg border border-indigo-100">
                    <span className="text-xs text-slate-500 font-medium flex items-center gap-1"><Layers className="w-3.5 h-3.5" /> Reallocation</span>
                    <p className="text-lg font-bold text-slate-900 mt-0.5">
                      {Math.round((selectedCr.effortSplitRatio || 0) * 100)}%
                    </p>
                  </div>
                  <div className="bg-white p-3 rounded-lg border border-indigo-100">
                    <span className="text-xs text-slate-500 font-medium flex items-center gap-1"><AlertTriangle className="w-3.5 h-3.5" /> Risk Score</span>
                    <p className="text-lg font-bold text-slate-900 mt-0.5">
                      {impact?.riskScore || 20}<span className="text-xs font-normal text-slate-500">/100</span>
                    </p>
                  </div>
                </div>

                {/* Escalation triggers list if any */}
                {impact && impact.escalationReasons.length > 0 && (
                  <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg">
                    <span className="text-xs font-bold text-purple-900 uppercase tracking-wider block mb-1">CTO Escalation Triggers:</span>
                    <ul className="text-xs text-purple-800 space-y-1 list-disc list-inside">
                      {impact.escalationReasons.map((reason, idx) => (
                        <li key={idx}>{reason}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* Traceability Chain: Documents -> Features -> Tasks */}
              <div className="space-y-3">
                <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  <Layers className="w-4 h-4 text-slate-600" />
                  Live Traceability Chain
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                    <span className="text-xs font-semibold text-slate-600 flex items-center gap-1 mb-2">
                      <FileText className="w-3.5 h-3.5" /> Affected Docs ({impact?.affectedDocumentIds?.length || 0})
                    </span>
                    <div className="space-y-1 text-xs text-slate-700">
                      {impact?.affectedDocumentIds && impact.affectedDocumentIds.length > 0 ? (
                        impact.affectedDocumentIds.map((dId, i) => (
                          <div key={i} className="p-1.5 bg-white border border-slate-200 rounded font-mono truncate">
                            {dId}
                          </div>
                        ))
                      ) : (
                        <p className="text-slate-400 italic">No direct doc impact</p>
                      )}
                    </div>
                  </div>

                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                    <span className="text-xs font-semibold text-slate-600 flex items-center gap-1 mb-2">
                      <Layers className="w-3.5 h-3.5" /> Affected Features ({impact?.affectedFeatureIds?.length || 0})
                    </span>
                    <div className="space-y-1 text-xs text-slate-700">
                      {impact?.affectedFeatureIds && impact.affectedFeatureIds.length > 0 ? (
                        impact.affectedFeatureIds.map((fId, i) => (
                          <div key={i} className="p-1.5 bg-white border border-slate-200 rounded font-mono truncate">
                            {fId}
                          </div>
                        ))
                      ) : (
                        <p className="text-slate-400 italic">No feature impact</p>
                      )}
                    </div>
                  </div>

                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                    <span className="text-xs font-semibold text-slate-600 flex items-center gap-1 mb-2">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Affected Tasks ({impact?.affectedTaskIds?.length || 0})
                    </span>
                    <div className="space-y-1 text-xs text-slate-700">
                      {impact?.affectedTaskIds && impact.affectedTaskIds.length > 0 ? (
                        impact.affectedTaskIds.map((tId, i) => (
                          <div key={i} className="p-1.5 bg-white border border-slate-200 rounded font-mono truncate">
                            {tId}
                          </div>
                        ))
                      ) : (
                        <p className="text-slate-400 italic">No direct task impact</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Approval History & Decision Ledger */}
              <div className="space-y-3">
                <h4 className="font-bold text-slate-900 text-sm">Approval Decision Ledger</h4>
                {selectedCrDetails.approvalHistory.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">No approval decisions recorded yet.</p>
                ) : (
                  <div className="border border-slate-200 rounded-lg divide-y divide-slate-200 overflow-hidden">
                    {selectedCrDetails.approvalHistory.map((dec) => (
                      <div key={dec.id} className="p-3 bg-white flex items-center justify-between gap-4 text-xs">
                        <div>
                          <span className="font-semibold text-slate-800">{dec.approverName}</span>
                          <span className="text-slate-500 ml-1">({dec.approverRole})</span>
                          {dec.comments && <p className="text-slate-600 mt-0.5">"{dec.comments}"</p>}
                        </div>
                        <div className="text-right">
                          <span className={`font-bold ${dec.decision === 'Approved' ? 'text-emerald-600' : 'text-red-600'}`}>
                            {dec.decision}
                          </span>
                          <span className="block text-slate-400 mt-0.5">{new Date(dec.decidedAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* SUBMIT CR MODAL */}
      {showSubmitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <GitPullRequest className="w-5 h-5 text-indigo-600" />
                <h3 className="font-bold text-lg text-slate-900">Submit New Change Request</h3>
              </div>
              <button onClick={() => setShowSubmitModal(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>

            <form onSubmit={handleSubmitCR} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">CR Title *</label>
                <input
                  type="text"
                  required
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="e.g. Add Multi-Factor Authentication & Biometrics"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">CR Type</label>
                  <select
                    value={formCrType}
                    onChange={(e) => setFormCrType(e.target.value as CRType)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none"
                  >
                    <option value="Scope">Scope</option>
                    <option value="Budget">Budget</option>
                    <option value="Timeline">Timeline</option>
                    <option value="Resource">Resource</option>
                    <option value="Technical">Technical</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">Severity</label>
                  <select
                    value={formSeverity}
                    onChange={(e) => setFormSeverity(e.target.value as CRSeverity)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none"
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                    <option value="Critical">Critical</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">Source Document (Optional)</label>
                <select
                  value={formSourceDocId}
                  onChange={(e) => setFormSourceDocId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none"
                >
                  <option value="">-- No Source Document Selected --</option>
                  {documents.map((doc) => (
                    <option key={doc.id} value={doc.id}>
                      #{doc.templateId} {doc.name} (v{doc.version})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">Description & Scope of Change *</label>
                <textarea
                  required
                  rows={3}
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Detail the technical or business changes required..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">Business Reason / Justification</label>
                <textarea
                  rows={2}
                  value={formReason}
                  onChange={(e) => setFormReason(e.target.value)}
                  placeholder="Why is this change necessary? Client request, architectural bug, etc."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none"
                />
              </div>

              {/* Impact Inputs */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block">Estimated Impacts (For Automatic Routing)</span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Budget Delta ($)</label>
                    <input
                      type="number"
                      value={formBudgetAmount}
                      onChange={(e) => setFormBudgetAmount(Number(e.target.value))}
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Budget Delta (%)</label>
                    <input
                      type="number"
                      value={formBudgetPct}
                      onChange={(e) => setFormBudgetPct(Number(e.target.value))}
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Timeline (Days)</label>
                    <input
                      type="number"
                      value={formTimelineDays}
                      onChange={(e) => setFormTimelineDays(Number(e.target.value))}
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Effort Shift (%)</label>
                    <input
                      type="number"
                      value={formEffortSplit}
                      onChange={(e) => setFormEffortSplit(Number(e.target.value))}
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-sm"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowSubmitModal(false)}
                  className="px-4 py-2 text-slate-600 hover:text-slate-800 text-sm font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium shadow-sm transition-all"
                >
                  {submitting ? 'Running Analysis...' : 'Submit & Analyze Impact'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DECISION MODAL */}
      {decisionModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <h3 className="font-bold text-lg text-slate-900">
              Confirm Decision: <span className={decisionModal.decision === 'Approved' ? 'text-emerald-600' : 'text-red-600'}>{decisionModal.decision}</span>
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              This decision will be recorded in the immutable audit ledger.
            </p>

            <div className="mt-4">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">Remarks / Feedback</label>
              <textarea
                rows={3}
                value={decisionModal.comments}
                onChange={(e) => setDecisionModal({ ...decisionModal, comments: e.target.value })}
                placeholder="Enter justification or specific instructions..."
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="flex items-center justify-end gap-3 mt-5">
              <button
                type="button"
                onClick={() => setDecisionModal({ ...decisionModal, isOpen: false })}
                className="px-4 py-2 text-slate-600 hover:text-slate-800 text-sm"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRecordDecision}
                className={`px-5 py-2 text-white rounded-lg text-sm font-semibold shadow-sm ${
                  decisionModal.decision === 'Approved' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-600 hover:bg-red-700'
                }`}
              >
                Confirm {decisionModal.decision}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
