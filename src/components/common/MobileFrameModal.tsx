import React, { useState } from 'react';
import { Modal } from './Modal';
import { 
  FolderKanban, 
  CheckSquare, 
  LayoutDashboard,
  FileText,
  Clock,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  ChevronRight,
  User,
  Bell,
  Search
} from 'lucide-react';
import { Task, Project } from '../../types';

interface MobileFrameModalProps {
  isOpen: boolean;
  onClose: () => void;
  tasks?: Task[];
  projects?: Project[];
}

export const MobileFrameModal: React.FC<MobileFrameModalProps> = ({ 
  isOpen, 
  onClose, 
  tasks = [], 
  projects = [] 
}) => {
  const [mobileTab, setMobileTab] = useState<'dashboard' | 'projects' | 'tasks' | 'documents'>('dashboard');
  const [taskFilter, setTaskFilter] = useState<'All' | 'Open' | 'Submitted' | 'Verified'>('All');
  const [localCompletedTasks, setLocalCompletedTasks] = useState<Record<string, boolean>>({});

  // Fallback demo data so simulator is never blank or showing zeroes
  const demoProjects: Project[] = [
    {
      id: 'demo-p1',
      code: 'UNAI-FIN-01',
      name: 'FinTech Banking Engine',
      client: 'Apex Global Financials',
      sponsor: 'UNAI Tech Executive Board',
      pmName: 'Rajesh Kumar',
      pmId: 'pm-1',
      status: 'On Track',
      priority: 'High',
      department: 'Engineering',
      progress: 75,
      startDate: '2026-01-10',
      targetEndDate: '2026-06-30',
      totalDocuments: 14,
      completedDocuments: 11,
      totalTasks: 16,
      completedTasks: 12,
      overdueTasks: 1,
      lifecyclePhase: 'Build',
      description: 'Core banking microservices integration',
    },
    {
      id: 'demo-p2',
      code: 'UNAI-HLT-02',
      name: 'MedHealth Diagnostics Portal',
      client: 'CarePlus Hospitals',
      sponsor: 'CarePlus Healthcare Group',
      pmName: 'Priya Sharma',
      pmId: 'pm-2',
      status: 'At Risk',
      priority: 'Medium',
      department: 'Healthcare Systems',
      progress: 42,
      startDate: '2026-02-01',
      targetEndDate: '2026-08-15',
      totalDocuments: 16,
      completedDocuments: 6,
      totalTasks: 14,
      completedTasks: 6,
      overdueTasks: 2,
      lifecyclePhase: 'Requirements',
      description: 'HIPAA compliant patient telemetry system',
    },
  ];

  const demoTasks: Task[] = [
    {
      id: 'demo-t1',
      title: 'Review System Architecture Diagram',
      docName: 'Architecture Design Spec',
      docId: 'doc-1',
      projectName: 'FinTech Banking Engine',
      projectId: 'demo-p1',
      description: 'Review microservices topology and data flow',
      assignedTo: 'kamalesh@unaitech.com',
      assignedToName: 'Kamalesh S',
      assignedToRole: 'Employee',
      assignedBy: 'pm-1',
      assignedByName: 'Rajesh Kumar (PM)',
      assignedByRole: 'PM',
      dueDate: 'Today, 5:00 PM',
      createdAt: '2026-08-20',
      progress: 60,
      priority: 'High',
      status: 'Open',
    },
    {
      id: 'demo-t2',
      title: 'Sign Off API Security Checklist',
      docName: 'Security Audit & Compliance',
      docId: 'doc-2',
      projectName: 'MedHealth Diagnostics',
      projectId: 'demo-p2',
      description: 'Verify OAuth2 JWT scopes and rate limiting policies',
      assignedTo: 'kamalesh@unaitech.com',
      assignedToName: 'Kamalesh S',
      assignedToRole: 'Employee',
      assignedBy: 'pm-2',
      assignedByName: 'Priya Sharma (PM)',
      assignedByRole: 'PM',
      dueDate: 'Tomorrow',
      createdAt: '2026-08-21',
      progress: 90,
      priority: 'Medium',
      status: 'Submitted',
    },
    {
      id: 'demo-t3',
      title: 'Verify Database Migration Scripts',
      docName: 'DB Deployment Plan',
      docId: 'doc-3',
      projectName: 'FinTech Banking Engine',
      projectId: 'demo-p1',
      description: 'Execute SQL DDL migrations and foreign key constraints',
      assignedTo: 'kamalesh@unaitech.com',
      assignedToName: 'Kamalesh S',
      assignedToRole: 'Employee',
      assignedBy: 'pm-1',
      assignedByName: 'Rajesh Kumar (PM)',
      assignedByRole: 'PM',
      dueDate: 'Aug 28',
      createdAt: '2026-08-18',
      progress: 100,
      priority: 'High',
      status: 'Verified',
    },
  ];

  const activeProjects = projects.length > 0 ? projects : demoProjects;
  const activeTasks = tasks.length > 0 ? tasks : demoTasks;

  const totalProjectsCount = activeProjects.length;
  const totalTasksCount = activeTasks.length;
  const overdueCount = activeTasks.filter(t => t.priority === 'High' && t.status !== 'Verified').length;
  const verifiedCount = activeTasks.filter(t => t.status === 'Verified' || localCompletedTasks[t.id]).length;

  const filteredTasks = activeTasks.filter(t => {
    if (taskFilter === 'All') return true;
    if (taskFilter === 'Verified') return t.status === 'Verified' || localCompletedTasks[t.id];
    return t.status === taskFilter;
  });

  const toggleTaskComplete = (taskId: string) => {
    setLocalCompletedTasks(prev => ({
      ...prev,
      [taskId]: !prev[taskId],
    }));
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Mobile App Simulator (Expo + React Native)"
      subtitle="Interactive preview of the native mobile client with live application elements"
      maxWidth="md"
    >
      <div className="flex justify-center py-1">
        {/* Mobile Device Frame */}
        <div className="w-[330px] sm:w-[350px] h-[660px] bg-slate-900 rounded-[48px] p-3 shadow-2xl ring-4 ring-slate-800/60 relative flex flex-col justify-between overflow-hidden">
          {/* Dynamic Island / Speaker Notch */}
          <div className="absolute top-4 left-1/2 -translate-x-1/2 w-28 h-5 bg-slate-950 rounded-full z-40 flex items-center justify-between px-3">
            <div className="w-2.5 h-2.5 rounded-full bg-slate-800" />
            <div className="w-10 h-1 bg-slate-800 rounded-full" />
            <div className="w-2 h-2 rounded-full bg-cyan-500/40 animate-pulse" />
          </div>

          {/* Screen Content Container (Light Theme) */}
          <div className="w-full h-full bg-slate-50 rounded-[38px] flex flex-col justify-between overflow-hidden relative border border-slate-200">
            {/* Status Bar */}
            <div className="h-10 bg-white/95 backdrop-blur-md px-6 flex items-center justify-between text-[11px] font-bold text-slate-800 shrink-0 pt-2.5 border-b border-slate-100 z-30 font-display">
              <span>9:41</span>
              <div className="flex items-center gap-1.5 text-slate-600 font-mono text-[10px]">
                <span className="text-emerald-500 font-bold">5G</span>
                <span>100%</span>
              </div>
            </div>

            {/* Mobile App Header */}
            <div className="bg-white/95 backdrop-blur-md px-4 py-2.5 border-b border-slate-200/80 flex items-center justify-between shrink-0 z-20">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-electric-500 flex items-center justify-center shadow-xs">
                  <img
                    src="./assets/unai-logo.png"
                    alt="UNAI Logo"
                    className="h-4 w-auto object-contain brightness-200"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = '/unai-logo.png';
                    }}
                  />
                </div>
                <div>
                  <span className="text-xs font-black font-display text-slate-900 leading-none block">
                    UNAI <span className="text-electric-500">PM</span>
                  </span>
                  <span className="text-[9px] text-slate-400 font-sans">Mobile Workspace</span>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <span className="text-[9px] font-bold bg-emerald-50 text-emerald-600 border border-emerald-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span>Expo Live</span>
                </span>
                <div className="w-7 h-7 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600">
                  <Bell className="w-3.5 h-3.5" />
                </div>
              </div>
            </div>

            {/* Scrollable View Content */}
            <div className="flex-1 overflow-y-auto p-3.5 space-y-3.5 bg-slate-50">
              {/* Tab 1: Dashboard */}
              {mobileTab === 'dashboard' && (
                <div className="space-y-3.5 animate-fade-in">
                  {/* Hero Greeting Card */}
                  <div className="p-3.5 rounded-2xl bg-gradient-to-r from-electric-500 to-cyan-500 text-white shadow-md">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-semibold text-white/80 uppercase tracking-wider font-mono">
                        Engineer Portal
                      </span>
                      <Sparkles className="w-3.5 h-3.5 text-yellow-300" />
                    </div>
                    <h4 className="text-sm font-bold font-display text-white mt-0.5">Kamalesh S</h4>
                    <p className="text-[10px] text-white/90 mt-0.5">3 tasks assigned • 1 requires verification</p>
                  </div>

                  {/* 2x2 Stats Grid */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-white p-3 rounded-2xl border border-slate-200/80 shadow-xs">
                      <div className="flex items-center justify-between text-slate-400">
                        <span className="text-[10px] font-semibold uppercase tracking-wider">Projects</span>
                        <FolderKanban className="w-3.5 h-3.5 text-electric-500" />
                      </div>
                      <span className="text-2xl font-black font-display text-slate-900 mt-1 block">
                        {totalProjectsCount}
                      </span>
                      <span className="text-[9px] text-emerald-600 font-bold mt-0.5 inline-block bg-emerald-50 px-1.5 py-0.2 rounded">
                        Active Engagements
                      </span>
                    </div>

                    <div className="bg-white p-3 rounded-2xl border border-slate-200/80 shadow-xs">
                      <div className="flex items-center justify-between text-slate-400">
                        <span className="text-[10px] font-semibold uppercase tracking-wider">Tasks</span>
                        <CheckSquare className="w-3.5 h-3.5 text-cyan-600" />
                      </div>
                      <span className="text-2xl font-black font-display text-electric-600 mt-1 block">
                        {totalTasksCount}
                      </span>
                      <span className="text-[9px] text-electric-600 font-bold mt-0.5 inline-block bg-electric-50 px-1.5 py-0.2 rounded">
                        Deliverables
                      </span>
                    </div>

                    <div className="bg-white p-3 rounded-2xl border border-slate-200/80 shadow-xs">
                      <div className="flex items-center justify-between text-slate-400">
                        <span className="text-[10px] font-semibold uppercase tracking-wider">Priority</span>
                        <AlertCircle className="w-3.5 h-3.5 text-rose-500" />
                      </div>
                      <span className="text-2xl font-black font-display text-rose-600 mt-1 block">
                        {overdueCount}
                      </span>
                      <span className="text-[9px] text-rose-600 font-bold mt-0.5 inline-block bg-rose-50 px-1.5 py-0.2 rounded">
                        High Attention
                      </span>
                    </div>

                    <div className="bg-white p-3 rounded-2xl border border-slate-200/80 shadow-xs">
                      <div className="flex items-center justify-between text-slate-400">
                        <span className="text-[10px] font-semibold uppercase tracking-wider">Verified</span>
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                      </div>
                      <span className="text-2xl font-black font-display text-emerald-600 mt-1 block">
                        {verifiedCount}
                      </span>
                      <span className="text-[9px] text-emerald-600 font-bold mt-0.5 inline-block bg-emerald-50 px-1.5 py-0.2 rounded">
                        Completed
                      </span>
                    </div>
                  </div>

                  {/* Recent Deliverables Section */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold font-display text-slate-900">Assigned Tasks</span>
                      <button 
                        onClick={() => setMobileTab('tasks')}
                        className="text-[10px] font-bold text-electric-600 flex items-center"
                      >
                        <span>View All</span>
                        <ChevronRight className="w-3 h-3" />
                      </button>
                    </div>

                    <div className="space-y-2">
                      {activeTasks.slice(0, 3).map((task) => {
                        const isDone = localCompletedTasks[task.id] || task.status === 'Verified';
                        return (
                          <div
                            key={task.id}
                            className="bg-white p-3 rounded-2xl border border-slate-200/80 shadow-xs flex items-start gap-2.5 transition-all"
                          >
                            <button
                              onClick={() => toggleTaskComplete(task.id)}
                              className={`w-5 h-5 rounded-md border mt-0.5 flex items-center justify-center transition-colors cursor-pointer shrink-0 ${
                                isDone 
                                  ? 'bg-emerald-500 border-emerald-500 text-white' 
                                  : 'border-slate-300 bg-slate-50 hover:border-electric-400'
                              }`}
                            >
                              {isDone && <CheckCircle2 className="w-3.5 h-3.5" />}
                            </button>
                            <div className="min-w-0 flex-1">
                              <p className={`text-xs font-bold font-display leading-tight truncate ${isDone ? 'line-through text-slate-400' : 'text-slate-900'}`}>
                                {task.title}
                              </p>
                              <div className="flex items-center gap-1.5 mt-1 text-[9px] text-slate-500">
                                <span className="font-medium text-slate-700">{task.projectName}</span>
                                <span>•</span>
                                <span className="text-rose-600 font-semibold">{task.dueDate}</span>
                              </div>
                            </div>
                            <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                              isDone
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : task.status === 'Submitted'
                                ? 'bg-electric-50 text-electric-700 border border-electric-200'
                                : 'bg-amber-50 text-amber-700 border border-amber-200'
                            }`}>
                              {isDone ? 'Verified' : task.status}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 2: Projects List */}
              {mobileTab === 'projects' && (
                <div className="space-y-3 animate-fade-in">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-black font-display text-slate-900">Active Projects ({activeProjects.length})</h4>
                  </div>
                  {activeProjects.map((prj) => (
                    <div key={prj.id} className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-xs space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="text-[9px] font-bold text-electric-600 bg-electric-50 px-1.5 py-0.2 rounded font-mono">
                            {prj.code}
                          </span>
                          <h5 className="text-xs font-bold font-display text-slate-900 mt-1">{prj.name}</h5>
                          <p className="text-[10px] text-slate-500">{prj.client}</p>
                        </div>
                        <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                          {prj.status}
                        </span>
                      </div>
                      
                      {/* Progress Bar */}
                      <div>
                        <div className="flex justify-between text-[9px] text-slate-500 font-medium mb-1">
                          <span>Progress</span>
                          <span className="font-bold text-slate-800">{prj.progress}%</span>
                        </div>
                        <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                          <div
                            className="bg-gradient-to-r from-electric-500 to-cyan-500 h-full rounded-full"
                            style={{ width: `${prj.progress}%` }}
                          />
                        </div>
                      </div>

                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[9px] text-slate-500">
                        <span>PM: {prj.pmName}</span>
                        <span>{prj.totalDocuments} Digitized Docs</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Tab 3: Tasks List with Filters */}
              {mobileTab === 'tasks' && (
                <div className="space-y-3 animate-fade-in">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-black font-display text-slate-900">Task Board ({filteredTasks.length})</h4>
                  </div>

                  {/* Filter Pills */}
                  <div className="flex items-center gap-1 overflow-x-auto pb-1">
                    {(['All', 'Open', 'Submitted', 'Verified'] as const).map((filter) => (
                      <button
                        key={filter}
                        onClick={() => setTaskFilter(filter)}
                        className={`text-[9px] font-bold px-2.5 py-1 rounded-full whitespace-nowrap transition-colors cursor-pointer ${
                          taskFilter === filter
                            ? 'bg-electric-500 text-white shadow-xs'
                            : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        {filter}
                      </button>
                    ))}
                  </div>

                  <div className="space-y-2">
                    {filteredTasks.map((task) => {
                      const isDone = localCompletedTasks[task.id] || task.status === 'Verified';
                      return (
                        <div key={task.id} className="bg-white p-3 rounded-2xl border border-slate-200/80 shadow-xs space-y-1.5">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-start gap-2">
                              <button
                                onClick={() => toggleTaskComplete(task.id)}
                                className={`w-4 h-4 rounded mt-0.5 flex items-center justify-center border transition-colors cursor-pointer shrink-0 ${
                                  isDone
                                    ? 'bg-emerald-500 border-emerald-500 text-white'
                                    : 'border-slate-300 bg-slate-50'
                                }`}
                              >
                                {isDone && <CheckCircle2 className="w-3 h-3" />}
                              </button>
                              <div>
                                <p className={`text-xs font-bold font-display ${isDone ? 'line-through text-slate-400' : 'text-slate-900'}`}>
                                  {task.title}
                                </p>
                                <p className="text-[10px] text-slate-500 mt-0.5">{task.docName}</p>
                              </div>
                            </div>
                            <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                              task.priority === 'High' ? 'bg-rose-50 text-rose-600 border border-rose-200' : 'bg-slate-100 text-slate-600'
                            }`}>
                              {task.priority}
                            </span>
                          </div>

                          <div className="pt-1.5 border-t border-slate-100 flex items-center justify-between text-[9px] text-slate-400">
                            <span>{task.projectName}</span>
                            <span className="font-semibold text-slate-700">Due: {task.dueDate}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Tab 4: Documents Template Catalog */}
              {mobileTab === 'documents' && (
                <div className="space-y-2.5 animate-fade-in">
                  <h4 className="text-xs font-black font-display text-slate-900">16 Digitized Documents</h4>
                  {[
                    { id: '1', title: 'Project Charter & Scope', phase: 'Planning', status: 'Approved' },
                    { id: '2', title: 'Software Requirements Spec (SRS)', phase: 'Analysis', status: 'Approved' },
                    { id: '3', title: 'System Architecture Document', phase: 'Design', status: 'In Review' },
                    { id: '4', title: 'API Specification Document', phase: 'Development', status: 'In Progress' },
                    { id: '5', title: 'Security & Compliance Matrix', phase: 'Verification', status: 'Draft' },
                  ].map((doc) => (
                    <div key={doc.id} className="bg-white p-3 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-electric-50 text-electric-600 flex items-center justify-center font-bold text-xs border border-electric-200">
                          <FileText className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-xs font-bold font-display text-slate-900 leading-tight">{doc.title}</p>
                          <span className="text-[9px] text-slate-400 font-sans">{doc.phase}</span>
                        </div>
                      </div>
                      <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                        {doc.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Bottom Tab Bar (Expo Native Style) */}
            <div className="h-15 bg-white/95 backdrop-blur-md border-t border-slate-200/80 px-4 flex items-center justify-around shrink-0 z-30 pb-2">
              <button
                onClick={() => setMobileTab('dashboard')}
                className={`flex flex-col items-center gap-1 text-[9px] font-medium transition-colors cursor-pointer ${
                  mobileTab === 'dashboard' ? 'text-electric-500 font-bold' : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                <LayoutDashboard className={`w-4 h-4 ${mobileTab === 'dashboard' ? 'text-electric-500' : 'text-slate-400'}`} />
                <span className="font-sans">Dashboard</span>
              </button>

              <button
                onClick={() => setMobileTab('projects')}
                className={`flex flex-col items-center gap-1 text-[9px] font-medium transition-colors cursor-pointer ${
                  mobileTab === 'projects' ? 'text-electric-500 font-bold' : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                <FolderKanban className={`w-4 h-4 ${mobileTab === 'projects' ? 'text-electric-500' : 'text-slate-400'}`} />
                <span className="font-sans">Projects</span>
              </button>

              <button
                onClick={() => setMobileTab('tasks')}
                className={`flex flex-col items-center gap-1 text-[9px] font-medium transition-colors cursor-pointer ${
                  mobileTab === 'tasks' ? 'text-electric-500 font-bold' : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                <CheckSquare className={`w-4 h-4 ${mobileTab === 'tasks' ? 'text-electric-500' : 'text-slate-400'}`} />
                <span className="font-sans">Tasks</span>
              </button>

              <button
                onClick={() => setMobileTab('documents')}
                className={`flex flex-col items-center gap-1 text-[9px] font-medium transition-colors cursor-pointer ${
                  mobileTab === 'documents' ? 'text-electric-500 font-bold' : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                <FileText className={`w-4 h-4 ${mobileTab === 'documents' ? 'text-electric-500' : 'text-slate-400'}`} />
                <span className="font-sans">Docs</span>
              </button>
            </div>

            {/* iOS Home Indicator Bar */}
            <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-28 h-1 bg-slate-300 rounded-full z-40 pointer-events-none" />
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default MobileFrameModal;
