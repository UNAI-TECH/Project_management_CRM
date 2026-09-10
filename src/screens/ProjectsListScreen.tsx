import React, { useState } from 'react';
import { Project } from '../types';
import { StatusBadge } from '../components/common/StatusBadge';
import { 
  Plus, 
  Search, 
  ChevronRight, 
  FolderKanban, 
  LayoutGrid, 
  List, 
  User, 
  Calendar, 
  FileText, 
  CheckSquare,
  Sparkles,
  ArrowUpRight,
  ShieldAlert,
  Clock,
  Trash2,
  AlertTriangle,
  Loader2,
  Check,
  Settings,
  X,
  MessageSquare,
  Flame,
  ChevronLeft
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { Modal } from '../components/common/Modal';
import { DocumentIngestionModal } from '../components/modals/DocumentIngestionModal';

interface ProjectsListScreenProps {
  projects: Project[];
  onSelectProject: (projectId: string) => void;
  onOpenNewProjectModal: () => void;
}

export const ProjectsListScreen: React.FC<ProjectsListScreenProps> = ({
  projects,
  onSelectProject,
  onOpenNewProjectModal,
}) => {
  const { canCreateProject, user, isFullAccessAdmin } = useAuth();
  const { teamMembers, tasks, deleteProject } = useData();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('table'); // Default to enterprise table as requested
  const [isMyProjectsOnly, setIsMyProjectsOnly] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isIngestionModalOpen, setIsIngestionModalOpen] = useState(false);

  const canDelete = Boolean(isFullAccessAdmin || (user && ['CEO', 'MD', 'COO', 'CTO', 'CIO'].includes(user.role)));

  // Enforce isolation & filters
  const assignedProjects = projects.filter((prj) => {
    if (isFullAccessAdmin && !isMyProjectsOnly) return true;
    if (!user) return false;

    const isAssignedPm =
      prj.pmId === user.id ||
      (prj.pmName && user.fullName && prj.pmName.toLowerCase() === user.fullName.toLowerCase());

    const isMemberOfProject = teamMembers.some(
      (m) =>
        m.projectId === prj.id &&
        (m.email?.toLowerCase() === user.email?.toLowerCase() ||
          m.name?.toLowerCase() === user.fullName?.toLowerCase())
    );

    const hasAssignedTasks = tasks.some(
      (t) =>
        t.projectId === prj.id &&
        (t.assignedTo === user.id ||
          t.assignedToName?.toLowerCase() === user.fullName?.toLowerCase() ||
          t.assignedBy === user.id)
    );

    return isAssignedPm || isMemberOfProject || hasAssignedTasks;
  });

  const filteredProjects = assignedProjects.filter((prj) => {
    const matchesSearch = 
      prj.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      prj.client.toLowerCase().includes(searchTerm.toLowerCase()) ||
      prj.pmName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      prj.code.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'All' || prj.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  // Table selection handlers
  const handleSelectAll = () => {
    if (selectedIds.length === filteredProjects.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredProjects.map((p) => p.id));
    }
  };

  const handleToggleSelect = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedIds((prev) => 
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Color generator for project icons
  const getProjectIconColor = (index: number) => {
    const colors = [
      'bg-blue-500 text-white',
      'bg-indigo-500 text-white',
      'bg-rose-500 text-white',
      'bg-sky-500 text-white',
      'bg-blue-600 text-white',
      'bg-blue-500 text-white'
    ];
    return colors[index % colors.length];
  };

  return (
    <div className="space-y-5 pb-12 animate-fade-in font-sans">
      
      {/* Top Header & Actions Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <h2 className="text-2xl font-black font-display text-slate-900 tracking-tight">
            Projects
          </h2>
          {canCreateProject && (
            <button
              onClick={onOpenNewProjectModal}
              className="px-3.5 py-1.5 rounded-xl font-bold text-white text-xs bg-emerald-500 hover:bg-emerald-600 shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 text-white" />
              <span>+ Create</span>
            </button>
          )}
          <button
            onClick={() => setIsIngestionModalOpen(true)}
            className="px-3 py-1.5 rounded-xl font-semibold text-blue-700 hover:text-blue-800 text-xs bg-blue-50 hover:bg-blue-100 border border-blue-200 shadow-2xs transition-all flex items-center gap-1.5 cursor-pointer"
            title="Upload PRD, SOW or specification document to auto-fill all 16 documents"
          >
            <Sparkles className="w-3.5 h-3.5 text-blue-600" />
            <span>Auto-fill from Spec</span>
          </button>
        </div>

        {/* Search Input with 'My x' pill */}
        <div className="flex items-center gap-2">
          <div className="relative flex items-center bg-white border border-slate-200 rounded-xl px-2 py-1 shadow-2xs focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500/20">
            {isMyProjectsOnly && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 text-slate-700 text-xs font-semibold rounded-lg mr-1">
                <span>My</span>
                <button
                  type="button"
                  onClick={() => setIsMyProjectsOnly(false)}
                  className="hover:text-rose-600 cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="search"
              className="pl-1 pr-6 py-0.5 text-xs bg-transparent focus:outline-none placeholder-slate-400 w-44 font-sans"
            />
            <Search className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2" />
          </div>

          {/* Toggle Grid vs Table */}
          <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200">
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-lg text-xs transition-all cursor-pointer ${
                viewMode === 'table' ? 'bg-white text-blue-600 shadow-xs font-bold' : 'text-slate-500 hover:text-slate-800'
              }`}
              title="Table View"
            >
              <List className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg text-xs transition-all cursor-pointer ${
                viewMode === 'grid' ? 'bg-white text-blue-600 shadow-xs font-bold' : 'text-slate-500 hover:text-slate-800'
              }`}
              title="Card Grid View"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Filter Chips Bar (Screenshot 1: 0 Overdue, 10 Comments, Mark all as read) */}
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <button
          type="button"
          onClick={() => setIsMyProjectsOnly(!isMyProjectsOnly)}
          className={`px-3 py-1 rounded-full font-medium transition-colors cursor-pointer border ${
            isMyProjectsOnly ? 'bg-blue-100 text-blue-800 border-blue-300 font-bold' : 'bg-slate-100/80 text-slate-600 border-slate-200 hover:bg-slate-200'
          }`}
        >
          My Workspaces
        </button>
        <span className="px-3 py-1 rounded-full bg-slate-100/80 text-slate-600 border border-slate-200 flex items-center gap-1.5">
          <span className="w-4 h-4 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center text-[10px] font-bold">0</span>
          <span>Overdue</span>
        </span>
        <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center gap-1.5 font-medium">
          <span className="w-4 h-4 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[10px] font-bold">
            {tasks.length || 10}
          </span>
          <span>Tasks & Directives</span>
        </span>
        <button
          type="button"
          className="px-3 py-1 rounded-full bg-slate-100/80 hover:bg-slate-200 text-slate-500 border border-slate-200 transition-colors cursor-pointer"
        >
          Mark all as read
        </button>
      </div>

      {/* Main Content: Table View (Screenshot 1) vs Grid View */}
      {viewMode === 'table' ? (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50/90 border-b border-slate-200 text-slate-500 font-medium font-sans">
                <tr>
                  <th className="py-3 px-4 w-12 text-center">
                    <div className="flex items-center gap-1">
                      <input
                        type="checkbox"
                        checked={selectedIds.length > 0 && selectedIds.length === filteredProjects.length}
                        onChange={handleSelectAll}
                        className="w-3.5 h-3.5 rounded text-blue-600 focus:ring-blue-500 border-slate-300 cursor-pointer"
                      />
                      <Settings className="w-3.5 h-3.5 text-slate-400" />
                    </div>
                  </th>
                  <th className="py-3 px-3 w-16 text-slate-400 font-semibold uppercase tracking-wider text-[11px]">ID</th>
                  <th className="py-3 px-4 text-slate-500 font-semibold uppercase tracking-wider text-[11px]">Name</th>
                  <th className="py-3 px-4 text-slate-500 font-semibold uppercase tracking-wider text-[11px]">Active</th>
                  <th className="py-3 px-4 text-slate-500 font-semibold uppercase tracking-wider text-[11px]">Performance</th>
                  <th className="py-3 px-4 text-slate-500 font-semibold uppercase tracking-wider text-[11px]">View members</th>
                  <th className="py-3 px-4 text-slate-500 font-semibold uppercase tracking-wider text-[11px]">Role</th>
                  <th className="py-3 px-4 text-slate-500 font-semibold uppercase tracking-wider text-[11px]">Privacy type</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredProjects.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-400 font-sans">
                      No projects found matching your criteria.
                    </td>
                  </tr>
                ) : (
                  filteredProjects.map((prj, index) => {
                    const isSelected = selectedIds.includes(prj.id);
                    const prjMembers = teamMembers.filter((m) => m.projectId === prj.id);
                    const membersToShow = prjMembers.slice(0, 3);
                    const remainingCount = Math.max(0, prjMembers.length - 3);

                    return (
                      <tr
                        key={prj.id}
                        onClick={() => onSelectProject(prj.id)}
                        className={`hover:bg-blue-50/40 transition-colors cursor-pointer group ${
                          isSelected ? 'bg-blue-50/60' : ''
                        }`}
                      >
                        {/* Checkbox / Row Selector */}
                        <td className="py-3.5 px-4 text-center">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onClick={(e) => handleToggleSelect(prj.id, e)}
                            onChange={() => {}}
                            className="w-3.5 h-3.5 rounded text-blue-600 focus:ring-blue-500 border-slate-300 cursor-pointer"
                          />
                        </td>

                        {/* ID */}
                        <td className="py-3.5 px-3 text-slate-600 font-medium">
                          {prj.code ? prj.code.replace(/[^\d]/g, '') || (index + 1) : index + 1}
                        </td>

                        {/* Project Name with Color Icon */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs shadow-2xs ${getProjectIconColor(index)}`}>
                              <FolderKanban className="w-3.5 h-3.5" />
                            </div>
                            <span className="font-semibold text-slate-900 group-hover:text-blue-600 transition-colors">
                              {prj.name}
                            </span>
                          </div>
                        </td>

                        {/* Active Date with Green Live Indicator */}
                        <td className="py-3.5 px-4 text-slate-600">
                          <div className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block shrink-0" />
                            <span className="font-medium text-[11px] text-slate-700">
                              {prj.startDate || 'July 22, 5:14 pm'}
                            </span>
                          </div>
                        </td>

                        {/* Performance / Completion */}
                        <td className="py-3.5 px-4">
                          <span className="font-bold text-slate-800">
                            {prj.progress || 100}%
                          </span>
                        </td>

                        {/* View Members (Stacked Avatars) */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center -space-x-1.5 overflow-hidden">
                            {membersToShow.length > 0 ? (
                              membersToShow.map((m, i) => (
                                <div
                                  key={m.id || i}
                                  className="w-6 h-6 rounded-full bg-blue-100 border-2 border-white text-blue-700 flex items-center justify-center text-[10px] font-bold shadow-2xs"
                                  title={m.name}
                                >
                                  {m.name.charAt(0)}
                                </div>
                              ))
                            ) : (
                              <>
                                <div className="w-6 h-6 rounded-full bg-emerald-100 border-2 border-white text-emerald-700 flex items-center justify-center text-[10px] font-bold">
                                  {prj.pmName.charAt(0)}
                                </div>
                                <div className="w-6 h-6 rounded-full bg-blue-100 border-2 border-white text-blue-700 flex items-center justify-center text-[10px] font-bold">
                                  T
                                </div>
                              </>
                            )}
                            {remainingCount > 0 ? (
                              <span className="px-1.5 py-0.5 rounded-full bg-slate-100 text-[10px] font-bold text-slate-600 border border-white">
                                +{remainingCount}
                              </span>
                            ) : (
                              <span className="px-1.5 py-0.5 rounded-full bg-slate-100 text-[10px] font-bold text-slate-600 border border-white">
                                +2
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Role Pill */}
                        <td className="py-3.5 px-4">
                          <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold text-blue-700 bg-blue-50 border border-blue-100 inline-block">
                            Project member
                          </span>
                        </td>

                        {/* Privacy Type */}
                        <td className="py-3.5 px-4">
                          <span className="text-slate-600 text-xs font-medium">
                            Public
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Table Footer Bar (Screenshot 1: SELECTED: 0/6, TOTAL: 6, PAGES: 1 < PREVIOUS NEXT >) */}
          <div className="p-3 bg-slate-50/80 border-t border-slate-200 flex flex-wrap items-center justify-between text-xs text-slate-500 font-medium">
            <div className="flex items-center gap-6">
              <span>SELECTED: <strong className="text-slate-800">{selectedIds.length} / {filteredProjects.length}</strong></span>
              <span>TOTAL: <strong className="text-slate-800">{filteredProjects.length}</strong></span>
            </div>

            <div className="flex items-center gap-4 text-slate-600 font-semibold">
              <span>PAGES: 1</span>
              <div className="flex items-center gap-2">
                <button type="button" disabled className="text-slate-400 flex items-center gap-1 cursor-not-allowed uppercase text-[10px] font-bold">
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span>PREVIOUS</span>
                </button>
                <button type="button" disabled className="text-slate-400 flex items-center gap-1 cursor-not-allowed uppercase text-[10px] font-bold">
                  <span>NEXT</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Card Grid View */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredProjects.map((prj, index) => {
            const ribbonGradients = [
              'from-blue-600 via-indigo-600 to-cyan-500',
              'from-purple-600 via-violet-600 to-indigo-500',
              'from-teal-600 via-emerald-600 to-cyan-500',
              'from-amber-500 via-orange-500 to-rose-500',
              'from-rose-600 via-pink-600 to-indigo-500',
            ];
            const ribbon = ribbonGradients[index % ribbonGradients.length];
            const prjTasks = tasks.filter((t) => t.projectId === prj.id);
            const verifiedTasks = prjTasks.filter((t) => t.status === 'Verified').length;

            return (
              <div
                key={prj.id}
                onClick={() => onSelectProject(prj.id)}
                className="bg-white rounded-3xl border border-slate-200/90 p-6 shadow-sm hover:shadow-xl hover:border-blue-400 transition-all duration-300 cursor-pointer flex flex-col justify-between group relative overflow-hidden transform hover:-translate-y-1"
              >
                <div className={`absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r ${ribbon}`} />
                <div>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-11 h-11 rounded-2xl flex items-center justify-center font-bold text-sm shadow-2xs ${getProjectIconColor(index)}`}>
                        <FolderKanban className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-extrabold text-base text-slate-900 group-hover:text-blue-600 transition-colors line-clamp-1">
                          {prj.name}
                        </h3>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-[10px] font-bold text-slate-700 bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded font-mono">{prj.code}</span>
                          <span className="text-[11px] text-slate-400 font-medium">• {prj.client}</span>
                        </div>
                      </div>
                    </div>
                    <StatusBadge status={prj.status} size="sm" />
                  </div>

                  {/* PM Info Badge */}
                  <div className="p-3 bg-gradient-to-r from-slate-50 to-blue-50/30 rounded-2xl border border-slate-100 space-y-1.5 text-xs mb-4">
                    <div className="flex justify-between items-center text-slate-600">
                      <span className="text-slate-400 font-medium flex items-center gap-1">
                        <User className="w-3 h-3 text-blue-600" /> Project Manager:
                      </span>
                      <strong className="text-slate-800">{prj.pmName || 'PM'}</strong>
                    </div>
                    <div className="flex justify-between items-center text-slate-600">
                      <span className="text-slate-400 font-medium flex items-center gap-1">
                        <CheckSquare className="w-3 h-3 text-emerald-600" /> Deliverables:
                      </span>
                      <strong className="text-slate-800">{verifiedTasks}/{prjTasks.length} Tasks Done</strong>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="space-y-1.5 mb-2">
                    <div className="flex justify-between text-[11px]">
                      <span className="text-slate-500 font-bold">Overall Progress</span>
                      <span className="font-extrabold text-blue-700">{prj.progress}%</span>
                    </div>
                    <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full bg-gradient-to-r ${ribbon} transition-all duration-500`}
                        style={{ width: `${Math.max(5, prj.progress)}%` }}
                      />
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="font-bold text-blue-600 group-hover:text-blue-700 flex items-center gap-1 text-[11px]">
                    <span>Enter Project Workspace</span>
                    <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                  </span>
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-lg">
                    Active Hub
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Ingestion Modal */}
      {isIngestionModalOpen && (
        <DocumentIngestionModal
          isOpen={isIngestionModalOpen}
          onClose={() => setIsIngestionModalOpen(false)}
          onProjectCreated={(project) => {
            setIsIngestionModalOpen(false);
            onSelectProject(project.id);
          }}
        />
      )}

      {/* Delete Confirmation Modal */}
      {projectToDelete && (
        <Modal
          isOpen={Boolean(projectToDelete)}
          onClose={() => {
            if (!isDeleting) setProjectToDelete(null);
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
                  Delete "{projectToDelete.name}"?
                </h4>
                <p className="text-xs text-rose-700 leading-relaxed">
                  This action is permanent and cannot be undone. It will delete the project registry, 16 auto-generated lifecycle documents, task trees, and team allocations.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setProjectToDelete(null)}
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
                    await deleteProject(projectToDelete.id);
                    setProjectToDelete(null);
                  } catch (err: any) {
                    console.error('Delete project failed:', err);
                    alert(`Failed to delete: ${err.message}`);
                  } finally {
                    setIsDeleting(false);
                  }
                }}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-xs transition-colors cursor-pointer disabled:opacity-50"
              >
                {isDeleting ? 'Deleting...' : 'Permanently Delete'}
              </button>
            </div>
          </div>
        </Modal>
      )}

    </div>
  );
};
