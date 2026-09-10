import React, { useState } from 'react';
import { Project, LifecyclePhase } from '../types';
import { StatusBadge } from '../components/common/StatusBadge';
import { 
  ArrowLeft, 
  Edit, 
  Calendar, 
  FileText, 
  CheckSquare, 
  Users,
  Sparkles,
  Zap,
  FolderKanban,
  Download,
  Trash2,
  AlertTriangle,
  Loader2
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { ProjectDocumentGrid } from '../components/projects/ProjectDocumentGrid';
import { ProjectTaskSummary } from '../components/projects/ProjectTaskSummary';
import { ProjectOnboardingPanel } from '../components/projects/ProjectOnboardingPanel';
import { DocReadinessGate } from '../components/projects/DocReadinessGate';
import { FeatureArchitectureTree } from '../components/projects/FeatureArchitectureTree';
import { FeatureAssignmentModal } from '../components/modals/FeatureAssignmentModal';
import { Modal } from '../components/common/Modal';
import { CRGovernancePanel } from '../components/CRGovernancePanel';
import { GitPullRequest } from 'lucide-react';

interface ProjectDetailScreenProps {
  project: Project;
  onBack: () => void;
  onSelectDocument: (docId: string) => void;
  onEditDocument?: (docId: string) => void;
  onSelectTask: (taskId: string) => void;
  onOpenAssignModal?: (parentTask?: { id: string; title: string; featureId?: string; featureName?: string }) => void;
}

export const ProjectDetailScreen: React.FC<ProjectDetailScreenProps> = ({
  project,
  onBack,
  onSelectDocument,
  onEditDocument,
  onSelectTask,
  onOpenAssignModal,
}) => {
  const { canCreateProject, user, role, isFullAccessAdmin } = useAuth();
  const { documents, tasks, features, teamMembers, auditLogs, deleteProject, saveFeatures, assignTask, logTimeAction } = useData();
  const [activeTab, setActiveTab] = useState<'onboarding' | 'overview' | 'documents' | 'change_requests' | 'tasks' | 'team' | 'timeline'>('onboarding');
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isFeatureModalOpen, setIsFeatureModalOpen] = useState(false);

  const canDelete = Boolean(isFullAccessAdmin || (user && ['CEO', 'MD', 'COO', 'CTO', 'CIO'].includes(user.role)));

  const lifecycleStages: LifecyclePhase[] = [
    'Initiate',
    'Plan',
    'Requirements',
    'Design',
    'Build',
    'Test',
    'Release',
    'Maintain'
  ];

  const currentPhaseIndex = lifecycleStages.indexOf(project.lifecyclePhase);
  const projectDocs = documents.filter((d) => d.projectId === project.id);
  const projectTasks = tasks.filter((t) => t.projectId === project.id);
  const projectMembers = teamMembers.filter((m) => m.projectId === project.id);

  return (
    <div className="space-y-6 pb-12 animate-fade-in">
      {/* Back button */}
      <button
        onClick={onBack}
        className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-blue-600 transition-colors cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4 text-slate-400 hover:text-blue-600" />
        <span>Back to Projects Registry</span>
      </button>

      {/* Project Banner Header */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-sm border border-blue-100">
              <FolderKanban className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                  {project.name}
                </h2>
                <StatusBadge status={project.status} size="sm" />
              </div>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Client: <strong className="text-slate-800 font-bold">{project.client}</strong> • Sponsor: {project.sponsor} • Code: <span className="font-mono text-blue-600 font-bold">{project.code}</span>
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setActiveTab('onboarding')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'onboarding'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Onboarding Hub</span>
          </button>

          {canDelete && (
            <button
              onClick={() => setIsDeleteModalOpen(true)}
              className="px-3.5 py-2 rounded-xl text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-all flex items-center gap-1.5 cursor-pointer"
              title="Delete Project Permanently"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-600" />
              <span>Delete Project</span>
            </button>
          )}
        </div>
      </div>

      {/* Sub Tabs Bar */}
      <div className="border-b border-slate-200 flex items-center gap-2 overflow-x-auto text-xs font-semibold">
        {[
          { id: 'onboarding', label: '⚡ Onboarding & Governance' },
          { id: 'overview', label: 'Overview' },
          { id: 'documents', label: `16 Document Templates (${projectDocs.length})` },
          { id: 'change_requests', label: 'Change Requests (CR)' },
          { id: 'tasks', label: `Tasks by Role (${projectTasks.length})` },
          { id: 'team', label: `Team Members (${projectMembers.length})` },
          { id: 'timeline', label: 'Milestone Timeline' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`pb-3 px-4 transition-all border-b-2 whitespace-nowrap cursor-pointer ${
              activeTab === tab.id
                ? 'border-blue-600 text-blue-600 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab: Onboarding Hub */}
      {activeTab === 'onboarding' && (
        <ProjectOnboardingPanel
          project={project}
          onSelectDocument={onSelectDocument}
          onEditDocument={onEditDocument || onSelectDocument}
        />
      )}

      {/* Tab: Overview */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Key Dates & Progress Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
                Start Date
              </span>
              <div className="mt-2 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-blue-500" />
                <span className="text-base font-bold text-slate-800">{project.startDate}</span>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
                Target End Date
              </span>
              <div className="mt-2 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-amber-500" />
                <span className="text-base font-bold text-slate-800">{project.targetEndDate}</span>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
                Current Progress
              </span>
              <div className="mt-2 flex items-center gap-2">
                <span className="text-2xl font-extrabold text-blue-600">{project.progress}%</span>
                <span className="text-xs text-slate-400 font-medium">overall completion</span>
              </div>
            </div>
          </div>

          {/* Project Manager & Description */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Project Leadership
              </h3>
              <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-sm">
                  {project.pmName.charAt(0)}
                </div>
                <div>
                  <p className="font-bold text-sm text-slate-900">{project.pmName}</p>
                  <p className="text-xs text-slate-500">Assigned Project Manager</p>
                </div>
              </div>

              <div className="space-y-2 text-xs pt-2">
                <div className="flex justify-between text-slate-600">
                  <span>Department:</span>
                  <span className="font-semibold text-slate-800">{project.department}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Priority:</span>
                  <span className="font-semibold text-rose-600">{project.priority}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Digitized Templates:</span>
                  <span className="font-semibold text-slate-800">16 Master Standards</span>
                </div>
              </div>
            </div>

            <div className="lg:col-span-8 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Project Overview & Objectives
              </h3>
              <p className="text-sm text-slate-700 leading-relaxed">
                {project.description || 'No project description provided yet.'}
              </p>

              {/* Lifecycle Progress Stepper */}
              <div className="pt-4 border-t border-slate-100">
                <h4 className="text-xs font-bold text-slate-800 mb-3">
                  Lifecycle Progress Stage: <span className="text-blue-600 font-extrabold">{project.lifecyclePhase}</span>
                </h4>
                
                <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
                  {lifecycleStages.map((stage, idx) => {
                    const isCompleted = idx < currentPhaseIndex;
                    const isCurrent = idx === currentPhaseIndex;

                    return (
                      <div key={stage} className="flex flex-col items-center text-center">
                        <div
                          className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold transition-all mb-1 ${
                            isCurrent
                              ? 'bg-blue-600 text-white ring-4 ring-blue-100 shadow-xs'
                              : isCompleted
                              ? 'bg-emerald-500 text-white'
                              : 'bg-slate-100 text-slate-400'
                          }`}
                        >
                          {idx + 1}
                        </div>
                        <span
                          className={`text-[10px] leading-tight font-medium ${
                            isCurrent ? 'text-blue-700 font-bold' : isCompleted ? 'text-emerald-700' : 'text-slate-400'
                          }`}
                        >
                          {stage}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Project Leadership Handover & Governance Ledger */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-blue-600" />
                <span>Leadership Handover & Audit Ledger</span>
              </h3>
              <span className="text-[11px] text-slate-400">
                All previous remarks and contributions are preserved
              </span>
            </div>

            <div className="divide-y divide-slate-100">
              {auditLogs
                .filter((a) => a.entityId === project.id)
                .map((log) => (
                  <div key={log.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                          {log.action}
                        </span>
                        <p className="text-xs font-semibold text-slate-800">{log.details}</p>
                      </div>
                      <p className="text-[10px] text-slate-400">
                        Actor: <strong className="text-slate-600">{log.actorName}</strong> ({log.actorRole}) • Recorded: {log.timestamp}
                      </p>
                    </div>
                  </div>
                ))}
              {auditLogs.filter((a) => a.entityId === project.id).length === 0 && (
                <p className="text-xs text-slate-400 py-4 text-center">
                  Initial baseline configuration active. No governance handovers recorded yet.
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tab: Documents (16 Template Grid Matrix) */}
      {activeTab === 'documents' && (
        <ProjectDocumentGrid
          project={project}
          documents={documents}
          onSelectDocument={onSelectDocument}
          onEditDocument={onEditDocument || onSelectDocument}
        />
      )}

      {/* Tab: Tasks — Documentation-Driven Feature Pipeline */}
      {activeTab === 'tasks' && (
        <div className="space-y-6">
          {/* 4-Doc Readiness Gate */}
          <DocReadinessGate
            documents={projectDocs}
            canInitialize={role === 'PM' || isFullAccessAdmin}
            hasExistingFeatures={features.filter((f) => f.projectId === project.id).length > 0}
            onOpenInitializeModal={() => setIsFeatureModalOpen(true)}
          />

          {/* Architecture Feature Tree */}
          {features.filter((f) => f.projectId === project.id).length > 0 && (
            <FeatureArchitectureTree
              features={features.filter((f) => f.projectId === project.id)}
              tasks={projectTasks}
              teamMembers={teamMembers}
              onSelectTask={onSelectTask}
              onOpenAssignModal={onOpenAssignModal}
              onLogTimeAction={logTimeAction}
            />
          )}

          {/* Project Tasks Summary Table / Matrix */}
          <ProjectTaskSummary
            project={project}
            tasks={tasks}
            onSelectTask={onSelectTask}
            onOpenAssignModal={onOpenAssignModal}
          />
        </div>
      )}

      {/* Tab: Team */}
      {activeTab === 'team' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <h3 className="text-sm font-bold text-slate-900">Project Team Allocation</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {projectMembers.map((member) => (
              <div key={member.id} className="p-4 rounded-xl border border-slate-200 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-slate-100 border border-slate-300 flex items-center justify-center font-bold text-sm text-slate-700">
                  {member.name.charAt(0)}
                </div>
                <div>
                  <p className="font-bold text-xs text-slate-900">{member.name}</p>
                  <p className="text-[11px] text-slate-500">{member.designation}</p>
                  <span className="text-[10px] font-semibold text-blue-600 bg-blue-50 px-1.5 py-0.2 rounded mt-1 inline-block">
                    {member.accessLevel}
                  </span>
                </div>
              </div>
            ))}
            {projectMembers.length === 0 && (
              <p className="text-xs text-slate-400 col-span-3 py-6 text-center">
                All organization engineers have collaborative access to this project.
              </p>
            )}
          </div>
        </div>
      )}

      {/* Tab: Timeline */}
      {activeTab === 'timeline' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <h3 className="text-sm font-bold text-slate-900">Project Milestone Timeline</h3>
          <div className="space-y-4 relative pl-6 border-l-2 border-blue-200">
            <div className="relative">
              <div className="absolute -left-[31px] top-0 w-4 h-4 rounded-full bg-emerald-500 ring-4 ring-white" />
              <p className="text-xs font-bold text-slate-800">Project Kickoff & Charter Sign-off</p>
              <span className="text-[11px] text-slate-400">{project.startDate} — Completed</span>
            </div>
            <div className="relative">
              <div className="absolute -left-[31px] top-0 w-4 h-4 rounded-full bg-blue-500 ring-4 ring-white" />
              <p className="text-xs font-bold text-slate-800">SRS & Architecture Specification</p>
              <span className="text-[11px] text-slate-400">In Progress</span>
            </div>
            <div className="relative">
              <div className="absolute -left-[31px] top-0 w-4 h-4 rounded-full bg-slate-300 ring-4 ring-white" />
              <p className="text-xs font-bold text-slate-800">Engineering Build & Sprint Verification</p>
              <span className="text-[11px] text-slate-400">Target: {project.targetEndDate}</span>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Change Requests (CR Governance) */}
      {activeTab === 'change_requests' && (
        <CRGovernancePanel
          projectId={project.id}
          projectName={project.name}
          currentUser={{
            id: user?.id || 'emp-curr',
            name: user?.fullName || 'User',
            role,
          }}
          documents={projectDocs}
          organizationId={user?.organizationId || 'org-unai'}
        />
      )}

      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && (
        <Modal
          isOpen={isDeleteModalOpen}
          onClose={() => {
            if (!isDeleting) setIsDeleteModalOpen(false);
          }}
          title="Delete Project Workspace"
          subtitle="Permanently remove project and all associated lifecycle data"
          maxWidth="md"
        >
          <div className="space-y-4">
            <div className="p-4 bg-rose-50 rounded-2xl border border-rose-200 flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-rose-900">
                  Delete "{project.name}"?
                </h4>
                <p className="text-xs text-rose-700 leading-relaxed">
                  This action is permanent and cannot be undone. It will delete the project registry, 16 auto-generated lifecycle documents, task trees, and team allocations for <strong>{project.client}</strong>.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setIsDeleteModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={async () => {
                  try {
                    setIsDeleting(true);
                    await deleteProject(project.id);
                    setIsDeleteModalOpen(false);
                    onBack();
                  } catch (err) {
                    console.error('Failed to delete project:', err);
                  } finally {
                    setIsDeleting(false);
                  }
                }}
                className="px-5 py-2.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-xs transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Deleting Project...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete Project Permanently</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Feature Auto-Extraction Modal */}
      {isFeatureModalOpen && (
        <FeatureAssignmentModal
          isOpen={isFeatureModalOpen}
          onClose={() => setIsFeatureModalOpen(false)}
          project={project}
          documents={projectDocs}
          teamMembers={teamMembers}
          onSaveFeatures={saveFeatures}
          onAssignTask={assignTask}
        />
      )}
    </div>
  );
};

export default ProjectDetailScreen;
