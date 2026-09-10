import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { ProjectDocument, ProjectFeature, TeamMember, Project } from '../../types';
import { featureService } from '../../services/featureService';
import { taskGenerationService } from '../../services/taskGenerationService';
import { useAuth } from '../../context/AuthContext';
import { Sparkles, Layers, ArrowRight, UserCheck, Calendar, Clock, Check } from 'lucide-react';

interface FeatureAssignmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: Project;
  documents: ProjectDocument[];
  teamMembers: TeamMember[];
  onSaveFeatures: (features: ProjectFeature[]) => Promise<any>;
  onAssignTask: (task: any) => Promise<any>;
}

export const FeatureAssignmentModal: React.FC<FeatureAssignmentModalProps> = ({
  isOpen,
  onClose,
  project,
  documents,
  teamMembers,
  onSaveFeatures,
  onAssignTask,
}) => {
  const { user, role } = useAuth();
  const [features, setFeatures] = useState<ProjectFeature[]>([]);
  const [loading, setLoading] = useState(false);

  // Eligible Team Leads
  const teamLeads = teamMembers.filter(
    (m) => m.role === 'TL' || m.designation?.toLowerCase().includes('lead') || m.designation?.toLowerCase().includes('architect')
  );
  const fallbackLeads = teamLeads.length > 0 ? teamLeads : teamMembers;

  useEffect(() => {
    if (isOpen) {
      const extracted = featureService.extractFeaturesFromDocs(
        documents,
        project.id,
        user?.organizationId || ''
      );

      // Pre-assign default TLs and sequence
      const initialized = extracted.map((feat, idx) => {
        const defaultTL = fallbackLeads[idx % (fallbackLeads.length || 1)];
        return {
          ...feat,
          assignedTlId: defaultTL?.id,
          assignedTlName: defaultTL?.name,
          dueDate: feat.dueDate || new Date(Date.now() + (idx + 1) * 7 * 86400000).toLocaleDateString('en-GB'),
        };
      });

      setFeatures(initialized);
    }
  }, [isOpen, project.id, documents]);

  const handleUpdateFeature = (idx: number, updates: Partial<ProjectFeature>) => {
    setFeatures((prev) => {
      const copy = [...prev];
      copy[idx] = { ...copy[idx], ...updates };
      return copy;
    });
  };

  const handleInitialize = async () => {
    setLoading(true);
    try {
      // 1. Save features in DB
      const saved = await onSaveFeatures(features);

      // 2. Create feature-level directive tasks for TLs
      const taskDefs = taskGenerationService.generateTasksFromFeatures(
        saved,
        project.name,
        fallbackLeads,
        { id: user?.id || 'usr-pm', name: user?.fullName || 'PM Office', role },
        user?.organizationId || ''
      );

      for (const t of taskDefs) {
        await onAssignTask(t);
      }

      onClose();
    } catch (err) {
      console.error('Error initializing features:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Auto-Extract & Initialize Feature Tasks"
      subtitle="Extract architectural modules, APIs, and screens from approved documentation and assign to Team Leads."
      maxWidth="4xl"
    >
      <div className="space-y-6">
        {/* Info Banner */}
        <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl flex items-center gap-3 text-xs text-blue-950">
          <div className="w-8 h-8 rounded-xl bg-blue-100 flex items-center justify-center text-blue-600 shrink-0">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <span className="font-bold">4-Document Spec Synthesis:</span> Features are extracted from Architecture Doc (topology), Functional Spec (functions), Technical Spec (APIs), and UI/UX Design (wireframes).
          </div>
        </div>

        {/* Features Config List */}
        <div className="space-y-4 max-h-[420px] overflow-y-auto pr-1">
          {features.map((feat, idx) => (
            <div
              key={feat.id || idx}
              className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-blue-900 bg-blue-100 px-2.5 py-0.5 rounded-md">
                  SEQUENCE #{idx + 1}
                </span>
                <span className="text-[11px] text-slate-500 font-semibold">
                  {idx === 0 ? '🔓 Unlocked upon launch' : `🔒 Unlocks after Feature ${idx}`}
                </span>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Feature Name
                </label>
                <input
                  type="text"
                  value={feat.name}
                  onChange={(e) => handleUpdateFeature(idx, { name: e.target.value })}
                  className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-xl font-bold text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Description
                </label>
                <textarea
                  rows={2}
                  value={feat.description}
                  onChange={(e) => handleUpdateFeature(idx, { description: e.target.value })}
                  className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-xl text-slate-700 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                    Assign Team Lead
                  </label>
                  <select
                    value={feat.assignedTlId || ''}
                    onChange={(e) => {
                      const selected = fallbackLeads.find((l) => l.id === e.target.value);
                      handleUpdateFeature(idx, {
                        assignedTlId: selected?.id,
                        assignedTlName: selected?.name,
                      });
                    }}
                    className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-xl font-semibold text-slate-800 focus:ring-2 focus:ring-blue-500"
                  >
                    {fallbackLeads.map((lead) => (
                      <option key={lead.id} value={lead.id}>
                        {lead.name} ({lead.role} • {lead.designation})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                    Estimated Hours
                  </label>
                  <input
                    type="number"
                    value={feat.estimatedHours || 40}
                    onChange={(e) => handleUpdateFeature(idx, { estimatedHours: Number(e.target.value) })}
                    className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-xl font-medium"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                    Target Due Date
                  </label>
                  <input
                    type="text"
                    value={feat.dueDate || ''}
                    onChange={(e) => handleUpdateFeature(idx, { dueDate: e.target.value })}
                    placeholder="DD/MM/YYYY"
                    className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-xl font-medium"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-200">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
          >
            Cancel
          </button>

          <button
            type="button"
            disabled={loading || features.length === 0}
            onClick={handleInitialize}
            className="px-6 py-2.5 text-xs font-bold text-white rounded-xl bg-gradient-to-r from-[#0d82ff] to-[#00d1ff] hover:from-[#0065ff] hover:to-[#00bce8] shadow-[0_4px_18px_rgba(13,130,255,0.35)] transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <span>{loading ? 'Initializing...' : 'Initialize Feature Sprint & Assign to TLs'}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </Modal>
  );
};
