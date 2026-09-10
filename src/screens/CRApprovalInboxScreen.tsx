import React, { useState, useEffect } from 'react';
import { 
  Inbox, 
  ShieldAlert, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Filter, 
  Search, 
  ChevronRight, 
  AlertTriangle, 
  DollarSign, 
  Calendar, 
  Layers, 
  RefreshCw,
  GitPullRequest
} from 'lucide-react';
import type { ChangeRequest, CRImpactAnalysis, CRApprovalDecision, UserRole } from '../types';
import { crGovernanceService } from '../services/crGovernanceService';

interface CRApprovalInboxScreenProps {
  currentUser: { id: string; name: string; role: UserRole };
  organizationId?: string;
  onNavigateToProject?: (projectId: string) => void;
}

export const CRApprovalInboxScreen: React.FC<CRApprovalInboxScreenProps> = ({
  currentUser,
  organizationId = 'org-unai',
  onNavigateToProject,
}) => {
  const [escalatedCrs, setEscalatedCrs] = useState<ChangeRequest[]>([]);
  const [selectedCrId, setSelectedCrId] = useState<string | null>(null);
  const [selectedCrDetails, setSelectedCrDetails] = useState<{
    changeRequest: ChangeRequest | null;
    impactAnalysis: CRImpactAnalysis | null;
    approvalHistory: CRApprovalDecision[];
  }>({ changeRequest: null, impactAnalysis: null, approvalHistory: [] });

  const [loading, setLoading] = useState<boolean>(true);
  const [filterType, setFilterType] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const [decisionModal, setDecisionModal] = useState<{
    isOpen: boolean;
    decision: 'Approved' | 'Rejected' | 'Changes Requested';
    comments: string;
  }>({
    isOpen: false,
    decision: 'Approved',
    comments: '',
  });

  const isCto = ['CTO', 'CEO'].includes(currentUser.role);
  const isPm = currentUser.role === 'PM';

  const loadInboxData = async () => {
    setLoading(true);
    try {
      let list: ChangeRequest[] = [];
      if (isCto) {
        list = await crGovernanceService.getPendingEscalations(organizationId);
      } else {
        list = await crGovernanceService.getChangeRequests('all', organizationId, 'Under Review');
      }
      setEscalatedCrs(list);
      if (list.length > 0 && !selectedCrId) {
        setSelectedCrId(list[0].id);
      }
    } catch (err) {
      console.warn('Error loading inbox:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInboxData();
  }, [currentUser.role, organizationId]);

  useEffect(() => {
    if (selectedCrId) {
      crGovernanceService.getChangeRequestDetails(selectedCrId).then(setSelectedCrDetails);
    }
  }, [selectedCrId]);

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
      await loadInboxData();
      const updated = await crGovernanceService.getChangeRequestDetails(selectedCrId);
      setSelectedCrDetails(updated);
    } catch (err) {
      console.error('Error submitting decision:', err);
      alert('Failed to record decision.');
    }
  };

  const filteredCrs = escalatedCrs.filter((cr) => {
    const matchesSearch =
      cr.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      cr.changeCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (cr.requestedByName || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = filterType === 'all' || cr.crType === filterType;
    return matchesSearch && matchesType;
  });

  const selectedCr = selectedCrDetails.changeRequest;
  const impact = selectedCrDetails.impactAnalysis;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-purple-600 text-white rounded-2xl shadow-md shadow-purple-200">
            <Inbox className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              CR Approval Inbox
              {isCto && (
                <span className="px-3 py-0.5 rounded-full text-xs font-bold bg-purple-100 text-purple-800 border border-purple-300">
                  CTO Escalation Desk
                </span>
              )}
            </h1>
            <p className="text-sm text-slate-500 mt-0.5">
              Review, approve, or reject high-impact change requests requiring architectural and executive sign-off.
            </p>
          </div>
        </div>

        <button
          onClick={loadInboxData}
          className="flex items-center gap-2 px-3.5 py-2 text-slate-600 hover:text-slate-900 bg-white border border-slate-200 rounded-xl text-sm font-medium shadow-xs hover:bg-slate-50 transition-all"
        >
          <RefreshCw className="w-4 h-4" /> Refresh Inbox
        </button>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-2 flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by code, title, requester..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full text-sm outline-none placeholder:text-slate-400 bg-transparent"
          />
        </div>

        <div className="flex items-center gap-2 text-xs font-semibold text-slate-600">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          <span>Filter Type:</span>
          {['all', 'Scope', 'Budget', 'Timeline', 'Technical'].map((type) => (
            <button
              key={type}
              onClick={() => setFilterType(type)}
              className={`px-2.5 py-1 rounded-lg transition-all ${
                filterType === type
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {type === 'all' ? 'All Types' : type}
            </button>
          ))}
        </div>
      </div>

      {/* Inbox Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: CR Inbox List */}
        <div className="lg:col-span-5 space-y-3">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500 uppercase tracking-wider px-1">
            <span>Pending Reviews ({filteredCrs.length})</span>
            <span>Priority / Impact</span>
          </div>

          {loading ? (
            <div className="p-8 bg-white rounded-xl border border-slate-200 text-center text-sm text-slate-400">
              Loading inbox items...
            </div>
          ) : filteredCrs.length === 0 ? (
            <div className="p-12 bg-white rounded-xl border-2 border-dashed border-slate-200 text-center space-y-2">
              <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
              <p className="font-bold text-slate-800 text-sm">Inbox Clear</p>
              <p className="text-xs text-slate-500">There are no pending change requests awaiting your approval.</p>
            </div>
          ) : (
            filteredCrs.map((cr) => {
              const isSelected = cr.id === selectedCrId;
              return (
                <div
                  key={cr.id}
                  onClick={() => setSelectedCrId(cr.id)}
                  className={`p-4 bg-white rounded-xl border cursor-pointer transition-all ${
                    isSelected
                      ? 'border-purple-600 shadow-md ring-1 ring-purple-600'
                      : 'border-slate-200 hover:border-slate-300 hover:shadow-xs'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-purple-700">{cr.changeCode}</span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                          {cr.crType}
                        </span>
                        {cr.severity === 'Critical' && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-red-100 text-red-800">
                            CRITICAL
                          </span>
                        )}
                      </div>
                      <h3 className="font-bold text-slate-900 text-sm mt-1 line-clamp-1">{cr.title}</h3>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400 shrink-0 mt-1" />
                  </div>

                  <p className="text-xs text-slate-500 mt-2 line-clamp-2">{cr.description}</p>

                  <div className="mt-3 flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100">
                    <span>By: <strong>{cr.requestedByName}</strong></span>
                    <span className="text-purple-700 font-semibold font-mono">
                      +${cr.budgetImpactAmount?.toLocaleString() || 0} • +{cr.timelineImpactDays || 0}d
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Right Column: Detailed Review & Impact Workspace */}
        <div className="lg:col-span-7">
          {!selectedCr ? (
            <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-400">
              <GitPullRequest className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="font-bold text-slate-700 text-sm">No CR Selected</p>
              <p className="text-xs text-slate-400 mt-1">Select a change request from the left list to review details.</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-6">
              {/* Detail Header & Action Buttons */}
              <div className="flex flex-wrap items-start justify-between gap-4 pb-4 border-b border-slate-200">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-bold text-purple-700">{selectedCr.changeCode}</span>
                    <span className="px-2 py-0.5 rounded text-xs font-semibold bg-slate-100 text-slate-700">{selectedCr.crType}</span>
                    <span className="px-2 py-0.5 rounded text-xs font-bold bg-purple-100 text-purple-800">
                      Requires CTO Approval
                    </span>
                  </div>
                  <h2 className="text-xl font-bold text-slate-900 mt-2">{selectedCr.title}</h2>
                  <p className="text-xs text-slate-500 mt-1">
                    Submitted by <strong className="text-slate-800">{selectedCr.requestedByName}</strong> on {selectedCr.createdAt}
                  </p>
                </div>

                {/* Approve / Reject Actions */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setDecisionModal({ isOpen: true, decision: 'Approved', comments: '' })}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    Approve
                  </button>
                  <button
                    onClick={() => setDecisionModal({ isOpen: true, decision: 'Changes Requested', comments: '' })}
                    className="px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all"
                  >
                    Request Rework
                  </button>
                  <button
                    onClick={() => setDecisionModal({ isOpen: true, decision: 'Rejected', comments: '' })}
                    className="px-3.5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all"
                  >
                    <XCircle className="w-4 h-4" />
                    Reject
                  </button>
                </div>
              </div>

              {/* Description & Business Case */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Scope Details</h4>
                  <p className="text-sm text-slate-800 whitespace-pre-wrap">{selectedCr.description}</p>
                </div>
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Business Justification</h4>
                  <p className="text-sm text-slate-800 whitespace-pre-wrap">{selectedCr.reason || 'No specific rationale entered.'}</p>
                </div>
              </div>

              {/* Executive Impact Metrics */}
              <div className="p-5 bg-purple-50/50 border border-purple-100 rounded-xl space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-purple-900 uppercase tracking-wider flex items-center gap-1.5">
                    <ShieldAlert className="w-4 h-4 text-purple-700" />
                    Automated Executive Impact Assessment
                  </span>
                  <span className="text-xs font-mono font-bold text-purple-700">
                    Risk Score: {impact?.riskScore || 0}/100
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="bg-white p-3 rounded-lg border border-purple-100">
                    <span className="text-xs text-slate-500 flex items-center gap-1"><DollarSign className="w-3.5 h-3.5" /> Budget Delta</span>
                    <p className="text-lg font-bold text-slate-900 mt-1">
                      ${selectedCr.budgetImpactAmount?.toLocaleString() || '0'}
                      <span className="text-xs font-normal text-slate-500 ml-1">({selectedCr.budgetImpactPct || 0}%)</span>
                    </p>
                  </div>
                  <div className="bg-white p-3 rounded-lg border border-purple-100">
                    <span className="text-xs text-slate-500 flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> Timeline Delta</span>
                    <p className="text-lg font-bold text-slate-900 mt-1">
                      +{selectedCr.timelineImpactDays || 0} <span className="text-xs font-normal text-slate-500">days</span>
                    </p>
                  </div>
                  <div className="bg-white p-3 rounded-lg border border-purple-100">
                    <span className="text-xs text-slate-500 flex items-center gap-1"><Layers className="w-3.5 h-3.5" /> Reallocation</span>
                    <p className="text-lg font-bold text-slate-900 mt-1">
                      {Math.round((selectedCr.effortSplitRatio || 0) * 100)}%
                    </p>
                  </div>
                  <div className="bg-white p-3 rounded-lg border border-purple-100">
                    <span className="text-xs text-slate-500 flex items-center gap-1"><AlertTriangle className="w-3.5 h-3.5" /> Affected Nodes</span>
                    <p className="text-lg font-bold text-slate-900 mt-1">
                      {(impact?.affectedFeatureIds?.length || 0) + (impact?.affectedTaskIds?.length || 0)}
                    </p>
                  </div>
                </div>

                {/* Escalation triggers list */}
                {impact && impact.escalationReasons.length > 0 && (
                  <div className="p-3 bg-white border border-purple-200 rounded-lg">
                    <span className="text-xs font-bold text-purple-900 block mb-1">CTO Escalation Triggers:</span>
                    <ul className="text-xs text-purple-800 space-y-1 list-disc list-inside">
                      {impact.escalationReasons.map((r, i) => (
                        <li key={i}>{r}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* Navigation Link to Full Project View */}
              {onNavigateToProject && (
                <div className="pt-2 flex justify-end">
                  <button
                    onClick={() => onNavigateToProject(selectedCr.projectId)}
                    className="text-xs text-purple-700 hover:text-purple-900 font-semibold flex items-center gap-1"
                  >
                    View in Full Project Governance Console <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* CONFIRMATION DECISION MODAL */}
      {decisionModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <h3 className="font-bold text-lg text-slate-900">
              Confirm Executive Decision: <span className={decisionModal.decision === 'Approved' ? 'text-emerald-600' : 'text-red-600'}>{decisionModal.decision}</span>
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Your decision will be permanently committed to the immutable audit ledger.
            </p>

            <div className="mt-4">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">Executive Notes / Directives</label>
              <textarea
                rows={3}
                value={decisionModal.comments}
                onChange={(e) => setDecisionModal({ ...decisionModal, comments: e.target.value })}
                placeholder="Enter executive rationale or scope restrictions..."
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-purple-500"
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
