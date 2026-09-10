import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { Project, TeamMember } from '../../types';
import { Calendar, FolderKanban, Sparkles } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { teamService } from '../../services/teamService';

interface NewProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateProject: (projectData: Partial<Project>) => void;
}

export const NewProjectModal: React.FC<NewProjectModalProps> = ({
  isOpen,
  onClose,
  onCreateProject,
}) => {
  const { user } = useAuth();
  const { teamMembers } = useData();

  const [name, setName] = useState('');
  const [client, setClient] = useState('');
  const [sponsor, setSponsor] = useState(user?.fullName || 'CTO Office');
  const [department, setDepartment] = useState('Web Development');
  const [priority, setPriority] = useState<'High' | 'Medium' | 'Low'>('High');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [targetEndDate, setTargetEndDate] = useState(
    new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [pmName, setPmName] = useState(user?.fullName || 'Sarah K');
  const [description, setDescription] = useState('');
  const [orgMembers, setOrgMembers] = useState<Array<{ id: string; authUserId: string; fullName: string; role: string; designation: string }>>([]);

  useEffect(() => {
    const load = async () => {
      const members = await teamService.getOrgMembers(user?.organizationId);
      if (members && members.length > 0) {
        setOrgMembers(members);
        if (!pmName || pmName === 'Sarah K') {
          setPmName(members[0].fullName);
        }
      }
    };
    load();
  }, [user?.organizationId]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !client.trim()) return;

    onCreateProject({
      name,
      code: `PRJ-${name.slice(0, 5).toUpperCase().replace(/\s+/g, '')}`,
      client,
      sponsor: sponsor || client,
      department,
      priority,
      status: 'Planning',
      startDate: new Date(startDate).toLocaleDateString('en-GB'),
      targetEndDate: new Date(targetEndDate).toLocaleDateString('en-GB'),
      progress: 0,
      pmName,
      pmId: undefined,
      description: description || `Enterprise engineering project for ${client} with 16 automated lifecycle Word documents.`,
      lifecyclePhase: 'Initiate',
      totalDocuments: 16,
      completedDocuments: 0,
      totalTasks: 0,
      completedTasks: 0,
      overdueTasks: 0,
    });

    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Create New Project Onboarding Hub"
      subtitle="Only CTO & System Admins can provision and authorize new client engineering projects"
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Project Name & Client */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Project Name *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. HealthTech CRM Platform"
              className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Client / Organization *
            </label>
            <input
              type="text"
              required
              value={client}
              onChange={(e) => setClient(e.target.value)}
              placeholder="e.g. Apex Health Systems"
              className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>
        </div>

        {/* Sponsor & Department */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Executive Sponsor
            </label>
            <input
              type="text"
              value={sponsor}
              onChange={(e) => setSponsor(e.target.value)}
              placeholder="e.g. CTO Office / VP Engineering"
              className="w-full px-3.5 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Department
            </label>
            <select
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            >
              <option value="Web Development">Web Development</option>
              <option value="Mobile Development">Mobile Development</option>
              <option value="AI & Data Engineering">AI & Data Engineering</option>
              <option value="Cloud Operations">Cloud Operations & DevOps</option>
              <option value="Enterprise Architecture">Enterprise Architecture</option>
            </select>
          </div>
        </div>

        {/* Priority & PM */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Priority Level
            </label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as any)}
              className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            >
              <option value="High">High Priority</option>
              <option value="Medium">Medium Priority</option>
              <option value="Low">Low Priority</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Assigned Project Manager (PM)
            </label>
            <select
              value={pmName}
              onChange={(e) => setPmName(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            >
              {orgMembers.map((m) => (
                <option key={m.id} value={m.fullName}>
                  {m.fullName} ({m.role} • {m.designation})
                </option>
              ))}
              {orgMembers.length === 0 && (
                <option value={user?.fullName || 'Sarah K'}>
                  {user?.fullName || 'Sarah K'} ({user?.role || 'CTO'} • {user?.designation || 'Chief Technology Officer'})
                </option>
              )}
            </select>
          </div>
        </div>

        {/* Start Date & Target End Date */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-slate-400" /> Start Date
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-slate-400" /> Target End Date
            </label>
            <input
              type="date"
              value={targetEndDate}
              onChange={(e) => setTargetEndDate(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
            Project Overview & Objectives
          </label>
          <textarea
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="High-level project scope, core technical deliverables, and key objectives..."
            className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none"
          />
        </div>

        {/* Automation Note */}
        <div className="p-3 bg-blue-50/70 rounded-xl border border-blue-100 flex items-center gap-2 text-[11px] text-blue-900">
          <Sparkles className="w-4 h-4 text-blue-600 shrink-0" />
          <span>
            Upon creation, all <strong>16 standard lifecycle Word templates</strong> will be auto-provisioned in this project's workspace.
          </span>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-150">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-white rounded-xl bg-gradient-to-r from-[#0d82ff] to-[#00d1ff] hover:from-[#0065ff] hover:to-[#00bce8] shadow-[0_4px_18px_rgba(13,130,255,0.35)] transition-all cursor-pointer transform hover:-translate-y-0.5"
          >
            <FolderKanban className="w-3.5 h-3.5 text-white" />
            <span>Create & Launch Onboarding Hub</span>
          </button>
        </div>
      </form>
    </Modal>
  );
};
