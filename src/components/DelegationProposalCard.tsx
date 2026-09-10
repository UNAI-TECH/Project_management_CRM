import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  UserCheck, 
  Check, 
  AlertCircle, 
  ChevronDown, 
  ChevronUp, 
  ShieldAlert, 
  Cpu, 
  BatteryCharging, 
  Briefcase, 
  Award, 
  Flame,
  ArrowRight
} from 'lucide-react';
import type { Task, DelegationProposal, TeamMember, UserRole } from '../types';
import { delegationEngine } from '../services/delegationEngine';

interface DelegationProposalCardProps {
  task: Task;
  projectMembers: TeamMember[];
  currentUser: { id: string; name: string; role: UserRole };
  onAssignSuccess?: (assignedMemberId: string, assignedMemberName: string) => void;
}

export const DelegationProposalCard: React.FC<DelegationProposalCardProps> = ({
  task,
  projectMembers,
  currentUser,
  onAssignSuccess,
}) => {
  const [proposals, setProposals] = useState<DelegationProposal[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [expanded, setExpanded] = useState<boolean>(false);
  const [overrideModal, setOverrideModal] = useState<{
    isOpen: boolean;
    candidateId: string;
    candidateName: string;
    proposalId: string;
    reason: string;
  }>({
    isOpen: false,
    candidateId: '',
    candidateName: '',
    proposalId: '',
    reason: '',
  });

  const isTLOrAbove = ['TL', 'PM', 'CTO', 'CEO'].includes(currentUser.role);

  const loadProposals = async () => {
    setLoading(true);
    try {
      // 1. Check if proposals already exist for this task
      let existing = await delegationEngine.getProposalsForTask(task.id);
      if (existing.length === 0) {
        // 2. Generate on the fly
        existing = await delegationEngine.generateDelegationProposals(
          task,
          task.projectId,
          projectMembers,
          task.organizationId
        );
      }
      setProposals(existing);
    } catch (err) {
      console.warn('[DelegationProposalCard] Error loading proposals:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProposals();
  }, [task.id]);

  const handleAcceptProposal = async (proposal: DelegationProposal) => {
    try {
      await delegationEngine.recordDelegationDecision(
        proposal.id,
        'Accepted',
        undefined,
        currentUser.id
      );
      if (onAssignSuccess) {
        onAssignSuccess(proposal.candidateEmployeeId, proposal.candidateName);
      }
    } catch (err) {
      console.error('Error accepting delegation:', err);
    }
  };

  const handleConfirmOverride = async () => {
    if (!overrideModal.reason.trim()) {
      alert('Mandatory override reason is required.');
      return;
    }

    try {
      await delegationEngine.recordDelegationDecision(
        overrideModal.proposalId,
        'Overridden',
        overrideModal.reason.trim(),
        currentUser.id
      );

      if (onAssignSuccess) {
        onAssignSuccess(overrideModal.candidateId, overrideModal.candidateName);
      }
      setOverrideModal({ isOpen: false, candidateId: '', candidateName: '', proposalId: '', reason: '' });
    } catch (err) {
      console.error('Error recording override:', err);
    }
  };

  if (loading) {
    return (
      <div className="p-4 bg-indigo-50/50 rounded-xl border border-indigo-100 flex items-center gap-3 text-xs text-indigo-700">
        <Sparkles className="w-4 h-4 animate-spin text-indigo-600" />
        <span>Evaluating team skills, capacity & workload for smart delegation...</span>
      </div>
    );
  }

  if (proposals.length === 0) {
    return null;
  }

  const topProposal = proposals[0];

  return (
    <div className="bg-gradient-to-br from-indigo-50/70 via-white to-slate-50 border border-indigo-200 rounded-xl p-4 shadow-sm space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-indigo-600 text-white rounded-lg shadow-sm">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h4 className="font-bold text-slate-900 text-xs sm:text-sm flex items-center gap-1.5">
              Smart Delegation Recommendation
              {topProposal.isAutoAssigned && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                  Confidence High
                </span>
              )}
            </h4>
            <p className="text-[11px] text-slate-500">Multi-factor composite scoring based on skills, capacity & workload.</p>
          </div>
        </div>

        <button
          onClick={() => setExpanded(!expanded)}
          className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-0.5"
        >
          {expanded ? 'Less' : 'All Candidates'}
          {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* Top Candidate Showcase */}
      <div className="p-3 bg-white border border-indigo-100 rounded-xl shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-sm border border-indigo-200">
            #{topProposal.rank}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-900 text-sm">{topProposal.candidateName}</span>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                Score: {topProposal.compositeScore}/100
              </span>
            </div>
            {/* 5-Factor Score Pills */}
            <div className="flex flex-wrap items-center gap-2 mt-1.5 text-[10px] text-slate-600">
              <span className="flex items-center gap-1 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-200" title="Skill Match">
                <Cpu className="w-3 h-3 text-indigo-600" /> Skill {topProposal.skillScore}%
              </span>
              <span className="flex items-center gap-1 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-200" title="Sprint Capacity">
                <BatteryCharging className="w-3 h-3 text-emerald-600" /> Capacity {topProposal.capacityScore}%
              </span>
              <span className="flex items-center gap-1 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-200" title="Workload Balance">
                <Briefcase className="w-3 h-3 text-blue-600" /> Load {topProposal.workloadScore}%
              </span>
              <span className="flex items-center gap-1 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-200" title="Domain Experience">
                <Award className="w-3 h-3 text-amber-600" /> Exp {topProposal.experienceScore}%
              </span>
            </div>
          </div>
        </div>

        {/* Action Button for TL */}
        {isTLOrAbove && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleAcceptProposal(topProposal)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-all"
            >
              <UserCheck className="w-3.5 h-3.5" />
              Assign #{topProposal.rank}
            </button>
          </div>
        )}
      </div>

      {/* Expanded Candidates List */}
      {expanded && (
        <div className="space-y-2 pt-2 border-t border-indigo-100">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
            Ranked Team Candidates
          </span>
          <div className="space-y-1.5">
            {proposals.slice(1).map((prop) => (
              <div
                key={prop.id}
                className="p-2.5 bg-white border border-slate-200 rounded-lg flex items-center justify-between gap-3 text-xs"
              >
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-600 font-bold text-[10px] flex items-center justify-center">
                    {prop.rank}
                  </span>
                  <span className="font-semibold text-slate-800">{prop.candidateName}</span>
                  <span className="text-[11px] font-mono text-slate-500">({prop.compositeScore}/100)</span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-slate-500 hidden sm:inline">
                    Skill: {prop.skillScore}% | Cap: {prop.capacityScore}%
                  </span>
                  {isTLOrAbove && (
                    <button
                      onClick={() =>
                        setOverrideModal({
                          isOpen: true,
                          candidateId: prop.candidateEmployeeId,
                          candidateName: prop.candidateName,
                          proposalId: prop.id,
                          reason: '',
                        })
                      }
                      className="px-2.5 py-1 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 border border-slate-200 rounded text-[11px] font-medium transition-colors"
                    >
                      Override & Assign
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* OVERRIDE MODAL */}
      {overrideModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-200 text-slate-900">
              <ShieldAlert className="w-5 h-5 text-amber-600" />
              <h3 className="font-bold text-sm sm:text-base">Override Delegation Recommendation</h3>
            </div>
            <p className="text-xs text-slate-600 mt-3">
              You are overriding the system recommendation to assign <strong className="text-slate-900">{overrideModal.candidateName}</strong> instead of the top-ranked candidate.
            </p>

            <div className="mt-4">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                Mandatory Override Reason *
              </label>
              <textarea
                required
                rows={3}
                value={overrideModal.reason}
                onChange={(e) => setOverrideModal({ ...overrideModal, reason: e.target.value })}
                placeholder="e.g. Developer possesses specialized domain context from prior project phase..."
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 mt-5">
              <button
                type="button"
                onClick={() => setOverrideModal({ isOpen: false, candidateId: '', candidateName: '', proposalId: '', reason: '' })}
                className="px-3 py-1.5 text-slate-600 hover:text-slate-800 text-xs font-medium"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmOverride}
                className="px-4 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-all"
              >
                Confirm & Reassign
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
