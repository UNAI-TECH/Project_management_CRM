import React, { useState, useEffect } from 'react';
import { useAuth } from './context/AuthContext';
import { useData } from './context/DataContext';
import { Sidebar, NavTab } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { LoginScreen } from './screens/LoginScreen';
import { DashboardScreen } from './screens/DashboardScreen';
import { ProjectsListScreen } from './screens/ProjectsListScreen';
import { ProjectDetailScreen } from './screens/ProjectDetailScreen';
import { DocumentsScreen } from './screens/DocumentsScreen';
import { DocumentDetailScreen } from './screens/DocumentDetailScreen';
import { DocumentEditScreen } from './screens/DocumentEditScreen';
import { TaskManagementScreen } from './screens/TaskManagementScreen';
import { MyTasksScreen } from './screens/MyTasksScreen';
import { TeamMembersScreen } from './screens/TeamMembersScreen';
import { AuditTrailScreen } from './screens/AuditTrailScreen';
import { ReportsScreen } from './screens/ReportsScreen';
import { SettingsScreen } from './screens/SettingsScreen';
import { CRApprovalInboxScreen } from './screens/CRApprovalInboxScreen';

// Modals
import { TaskAssignmentModal } from './components/modals/TaskAssignmentModal';
import { TaskSubmissionModal } from './components/modals/TaskSubmissionModal';
import { TaskVerificationModal } from './components/modals/TaskVerificationModal';
import { TaskDetailModal } from './components/modals/TaskDetailModal';
import { ExportDocumentModal } from './components/modals/ExportDocumentModal';
import { NewProjectModal } from './components/modals/NewProjectModal';
import { MobileFrameModal } from './components/common/MobileFrameModal';
import { FirstTimeSetupModal } from './components/modals/FirstTimeSetupModal';
import { LoadingScreen } from './components/common/LoadingScreen';
import { RouteGuard } from './components/common/RouteGuard';

import { Task } from './types';

export const App: React.FC = () => {
  const { user, role, isFullAccessAdmin, isLoading: isAuthLoading, mustCompleteSetup } = useAuth();
  const { 
    projects, 
    documents, 
    tasks, 
    teamMembers, 
    auditLogs, 
    isLoading: isDataLoading,
    createProject,
    saveDocument,
    assignTask,
    submitTask,
    verifyTask,
    addTeamMember
  } = useData();

  // Navigation state — default tab based on role
  const getDefaultTab = (r: string): NavTab => {
    switch (r) {
      case 'CEO':
      case 'MD':
      case 'COO':
      case 'CTO':
      case 'CIO':
      case 'PM':
        return 'dashboard';
      case 'TL':
        return 'tasks';
      case 'Employee':
        return 'my-tasks';
      default:
        return 'dashboard';
    }
  };
  const [currentTab, setCurrentTab] = useState<NavTab>(getDefaultTab(role));
  const [tabHistory, setTabHistory] = useState<Array<{ tab: NavTab; docId?: string; projectId?: string }>>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [selectedDocId, setSelectedDocId] = useState<string>('');
  const [activeTaskForModal, setActiveTaskForModal] = useState<Task | null>(null);

  const navigateTo = (tab: NavTab, params?: { docId?: string; projectId?: string }) => {
    setTabHistory((prev) => [...prev, { tab: currentTab, docId: selectedDocId, projectId: selectedProjectId }]);
    if (params?.docId !== undefined) setSelectedDocId(params.docId);
    if (params?.projectId !== undefined) setSelectedProjectId(params.projectId);
    setCurrentTab(tab);
  };

  const goBack = (fallbackTab: NavTab = 'documents') => {
    if (tabHistory.length > 0) {
      const prev = tabHistory[tabHistory.length - 1];
      setTabHistory((prevStack) => prevStack.slice(0, -1));
      if (prev.projectId !== undefined) setSelectedProjectId(prev.projectId);
      if (prev.docId !== undefined) setSelectedDocId(prev.docId);
      setCurrentTab(prev.tab);
    } else {
      setCurrentTab(fallbackTab);
    }
  };

  const previousTabInfo = tabHistory.length > 0 ? tabHistory[tabHistory.length - 1] : null;
  const backLabel = previousTabInfo?.tab === 'project-detail' 
    ? 'Back to Project Hub'
    : previousTabInfo?.tab === 'dashboard'
    ? 'Back to Dashboard'
    : previousTabInfo?.tab === 'tasks' || previousTabInfo?.tab === 'my-tasks'
    ? 'Back to Tasks'
    : 'Back to Documents';

  // Modal visibility states
  const [isTaskDetailModalOpen, setIsTaskDetailModalOpen] = useState(false);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [assignModalParentTask, setAssignModalParentTask] = useState<{ id: string; title: string; featureId?: string; featureName?: string } | null>(null);
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [isVerifyModalOpen, setIsVerifyModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isNewProjectModalOpen, setIsNewProjectModalOpen] = useState(false);
  const [isMobilePreviewOpen, setIsMobilePreviewOpen] = useState(false);

  const handleOpenAssignModal = (parentTask?: { id: string; title: string; featureId?: string; featureName?: string }) => {
    setAssignModalParentTask(parentTask || null);
    setIsAssignModalOpen(true);
  };

  // Role-based default tab on login (must be called before any early return)
  useEffect(() => {
    if (user && role) {
      setCurrentTab(getDefaultTab(role));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, role]);

  // Post-login GIF Splash state
  const [isLoginTransitioning, setIsLoginTransitioning] = useState(false);
  const [hasShownLoginSplash, setHasShownLoginSplash] = useState(false);

  useEffect(() => {
    if (user && !hasShownLoginSplash) {
      setIsLoginTransitioning(true);
      const timer = setTimeout(() => {
        setIsLoginTransitioning(false);
        setHasShownLoginSplash(true);
      }, 1600);
      return () => clearTimeout(timer);
    }
  }, [user?.id, hasShownLoginSplash]);

  // Active entities
  const activeProject = projects.find((p) => p.id === selectedProjectId) || projects[0] || null;
  const projectDocs = activeProject ? documents.filter((d) => d.projectId === activeProject.id) : documents;
  const activeDocument = projectDocs.find((d) => d.id === selectedDocId) || documents.find((d) => d.id === selectedDocId) || projectDocs[0] || null;

  // If still checking authentication session
  if (isAuthLoading) {
    return (
      <LoadingScreen
        message="Connecting to UNAI Platform..."
        subMessage="Verifying session and enterprise role security"
      />
    );
  }

  // Not logged in -> Show Login
  if (!user) {
    return <LoginScreen />;
  }

  // Post-login GIF loader or data sync loading state
  if (isLoginTransitioning || isDataLoading) {
    return <LoadingScreen />;
  }

  // Header Title mapping
  const getHeaderInfo = () => {
    const dashLabel = 
      role === 'CEO' ? 'Executive (CEO)' :
      role === 'MD' ? 'Managing Director' :
      role === 'COO' ? 'Chief Operating Officer' :
      role === 'CTO' ? 'Chief Technology Officer' : 
      role === 'CIO' ? 'Chief Information Officer' : 
      role === 'PM' ? 'Project Manager' : 
      role === 'TL' ? 'Team Lead' : 'Developer';
    switch (currentTab) {
      case 'dashboard':
        return { title: 'Dashboard', subtitle: `${user?.designation || dashLabel} Overview & Analytics` };
      case 'projects':
        return { title: 'Projects Registry', subtitle: 'All Client & Internal Projects' };
      case 'project-detail':
        return { title: activeProject?.name || 'Project Details', subtitle: `${activeProject?.client || ''} • Details` };
      case 'documents':
        return { title: 'Document Templates', subtitle: '16 Standard Digitized Lifecycle Templates' };
      case 'document-detail':
        return { title: activeDocument?.name || 'Document Detail', subtitle: `Document #${activeDocument?.docNumber || ''} • ${activeDocument?.phase || ''}` };
      case 'document-edit':
        return { title: `Edit ${activeDocument?.name || 'Document'}`, subtitle: 'Form Engine • Live Database Save' };
      case 'tasks':
        return { title: 'Task Management', subtitle: 'Project & Document Delegation Board' };
      case 'my-tasks':
        return { title: 'My Tasks', subtitle: 'Assigned Work Deliverables' };
      case 'team':
        return { title: 'Team Members', subtitle: `Project Team — ${activeProject?.name || 'All Projects'}` };
      case 'reports':
        return { title: 'Reports & Exports', subtitle: 'Cross-Project Analytics & Logs' };
      case 'audit-trail':
        return { title: 'Audit Trail', subtitle: 'Immutable System Mutation Ledger' };
      case 'settings':
        return { title: 'Settings', subtitle: 'System Governance & Role Grants' };
      default:
        return { title: 'UNAI PM CRM', subtitle: 'Project Management Platform' };
    }
  };

  const headerInfo = getHeaderInfo();

  const handleSelectTask = (taskId: string) => {
    const target = tasks.find((t) => t.id === taskId);
    if (!target) return;
    setActiveTaskForModal(target);
    setIsTaskDetailModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-row">
      {/* Sidebar Navigation */}
      <Sidebar
        currentTab={currentTab}
        onSelectTab={(tab) => {
          setTabHistory([]);
          setCurrentTab(tab);
        }}
        onOpenMobilePreview={() => setIsMobilePreviewOpen(true)}
        overdueTasksCount={tasks.filter(t => t.status !== 'Verified' && t.priority === 'High').length}
      />

      {/* Main Content Viewport */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-y-auto">
        <Header
          title={headerInfo.title}
          subtitle={headerInfo.subtitle}
        />

        <main className="flex-1 p-6 max-w-7xl w-full mx-auto">
          {currentTab === 'dashboard' && (
            <DashboardScreen
              onNavigate={(tab) => navigateTo(tab)}
              onSelectProject={(id) => {
                navigateTo('project-detail', { projectId: id });
              }}
              onSelectTask={handleSelectTask}
            />
          )}

          {currentTab === 'projects' && (
            <ProjectsListScreen
              projects={projects}
              onSelectProject={(id) => {
                navigateTo('project-detail', { projectId: id });
              }}
              onOpenNewProjectModal={() => setIsNewProjectModalOpen(true)}
            />
          )}

          {currentTab === 'project-detail' && activeProject && (
            <ProjectDetailScreen
              project={activeProject}
              onBack={() => goBack('projects')}
              onSelectDocument={(docId) => {
                navigateTo('document-detail', { docId, projectId: activeProject.id });
              }}
              onEditDocument={(docId) => {
                navigateTo('document-edit', { docId, projectId: activeProject.id });
              }}
              onOpenAssignModal={handleOpenAssignModal}
              onSelectTask={handleSelectTask}
            />
          )}

          {currentTab === 'documents' && (
            <DocumentsScreen
              initialProjectId={selectedProjectId || null}
              onProjectChange={(id) => setSelectedProjectId(id || '')}
              onSelectDocument={(docId, projectId) => {
                navigateTo('document-detail', { docId, projectId: projectId || selectedProjectId });
              }}
              onEditDocument={(docId, projectId) => {
                navigateTo('document-edit', { docId, projectId: projectId || selectedProjectId });
              }}
              onSelectProject={(projectId) => {
                navigateTo('project-detail', { projectId });
              }}
              onSelectTemplate={(templateId) => {
                const matched = documents.find((d) => d.templateId === templateId && (!selectedProjectId || d.projectId === selectedProjectId)) || documents.find((d) => d.templateId === templateId);
                if (matched) {
                  navigateTo('document-detail', { docId: matched.id, projectId: matched.projectId });
                }
              }}
              onEditTemplate={(templateId) => {
                const matched = documents.find((d) => d.templateId === templateId && (!selectedProjectId || d.projectId === selectedProjectId)) || documents.find((d) => d.templateId === templateId);
                if (matched) {
                  navigateTo('document-edit', { docId: matched.id, projectId: matched.projectId });
                }
              }}
            />
          )}

          {currentTab === 'document-detail' && activeDocument && (
            <DocumentDetailScreen
              key={activeDocument.id}
              document={activeDocument}
              backButtonLabel={backLabel}
              onBack={() => goBack('documents')}
              onEdit={() => navigateTo('document-edit', { docId: activeDocument.id, projectId: activeDocument.projectId })}
              onExport={() => setIsExportModalOpen(true)}
              onAssignTask={handleOpenAssignModal}
              onSelectTask={handleSelectTask}
            />
          )}

          {currentTab === 'document-edit' && activeDocument && (
            <DocumentEditScreen
              key={activeDocument.id}
              document={activeDocument}
              backButtonLabel="Back to Document"
              onBack={() => goBack('document-detail')}
              onSave={async (updatedFields) => {
                if (updatedFields.content) {
                  await saveDocument(
                    activeDocument.id, 
                    updatedFields.content, 
                    'Updated form values in editor',
                    updatedFields.status,
                    updatedFields.completion
                  );
                }
              }}
            />
          )}

          {currentTab === 'tasks' && (
            <RouteGuard permission="screen:tasks" onFallbackNavigate={() => setCurrentTab('my-tasks')}>
              <TaskManagementScreen
                tasks={tasks}
                initialProjectId={selectedProjectId || null}
                onOpenAssignModal={handleOpenAssignModal}
                onOpenSubmitModal={(task) => {
                  setActiveTaskForModal(task);
                  setIsSubmitModalOpen(true);
                }}
                onOpenVerifyModal={(task) => {
                  setActiveTaskForModal(task);
                  setIsVerifyModalOpen(true);
                }}
                onSelectTask={handleSelectTask}
              />
            </RouteGuard>
          )}

          {currentTab === 'my-tasks' && (
            <RouteGuard permission="screen:my-tasks" onFallbackNavigate={() => setCurrentTab('dashboard')}>
              <MyTasksScreen
                tasks={tasks}
                onOpenSubmitModal={(task) => {
                  setActiveTaskForModal(task);
                  setIsSubmitModalOpen(true);
                }}
                onSelectTask={handleSelectTask}
              />
            </RouteGuard>
          )}

          {currentTab === 'team' && (
            <RouteGuard permission="screen:team" onFallbackNavigate={() => setCurrentTab('dashboard')}>
              <TeamMembersScreen
                members={activeProject ? teamMembers.filter(m => m.projectId === activeProject.id) : teamMembers}
                projectName={activeProject?.name || 'All Members'}
                onSelectTask={handleSelectTask}
                onAddMember={async (newMemberData) => {
                  const targetProjectId = activeProject ? activeProject.id : (projects[0]?.id || 'proj-default');
                  await addTeamMember({
                    ...newMemberData,
                    projectId: targetProjectId,
                  });
                }}
              />
            </RouteGuard>
          )}

          {currentTab === 'cr-inbox' && (
            <RouteGuard permission="screen:cr-inbox" onFallbackNavigate={() => setCurrentTab('dashboard')}>
              <CRApprovalInboxScreen
                currentUser={{
                  id: user?.id || 'emp-curr',
                  name: user?.fullName || 'User',
                  role: role,
                }}
                organizationId={user?.organizationId || 'org-unai'}
                onNavigateToProject={(pId) => {
                  setSelectedProjectId(pId);
                  setCurrentTab('project-detail');
                }}
              />
            </RouteGuard>
          )}

          {currentTab === 'reports' && (
            <RouteGuard permission="screen:reports" onFallbackNavigate={() => setCurrentTab('dashboard')}>
              <ReportsScreen />
            </RouteGuard>
          )}

          {currentTab === 'audit-trail' && (
            <RouteGuard permission="screen:audit-trail" onFallbackNavigate={() => setCurrentTab('dashboard')}>
              <AuditTrailScreen logs={auditLogs} />
            </RouteGuard>
          )}

          {currentTab === 'settings' && (
            <RouteGuard permission="screen:settings" onFallbackNavigate={() => setCurrentTab('dashboard')}>
              <SettingsScreen />
            </RouteGuard>
          )}
        </main>
      </div>

      {/* Modals Container */}
      <TaskDetailModal
        isOpen={isTaskDetailModalOpen}
        onClose={() => setIsTaskDetailModalOpen(false)}
        task={activeTaskForModal}
        onOpenSubmitModal={(task) => {
          setActiveTaskForModal(task);
          setIsSubmitModalOpen(true);
        }}
        onOpenVerifyModal={(task) => {
          setActiveTaskForModal(task);
          setIsVerifyModalOpen(true);
        }}
        onOpenAssignModal={handleOpenAssignModal}
        onSelectSubtask={(subtaskId) => {
          const sub = tasks.find((t) => t.id === subtaskId);
          if (sub) {
            setActiveTaskForModal(sub);
          }
        }}
        onSelectDocument={(docId) => {
          setSelectedDocId(docId);
          setIsTaskDetailModalOpen(false);
          setCurrentTab('document-detail');
        }}
      />

      <TaskAssignmentModal
        isOpen={isAssignModalOpen}
        onClose={() => {
          setIsAssignModalOpen(false);
          setAssignModalParentTask(null);
        }}
        onAssign={assignTask}
        defaultDocId={activeDocument?.id}
        defaultProjectId={activeProject?.id || selectedProjectId || projects[0]?.id}
        documents={
          activeProject
            ? documents.filter((d) => d.projectId === activeProject.id)
            : selectedProjectId
            ? documents.filter((d) => d.projectId === selectedProjectId)
            : projects[0]?.id
            ? documents.filter((d) => d.projectId === projects[0].id)
            : documents
        }
        teamMembers={teamMembers}
        parentTaskId={assignModalParentTask?.id}
        parentTaskTitle={assignModalParentTask?.title}
        featureId={assignModalParentTask?.featureId}
        featureName={assignModalParentTask?.featureName}
      />

      <TaskSubmissionModal
        isOpen={isSubmitModalOpen}
        onClose={() => setIsSubmitModalOpen(false)}
        task={activeTaskForModal}
        onSubmit={submitTask}
      />

      <TaskVerificationModal
        isOpen={isVerifyModalOpen}
        onClose={() => setIsVerifyModalOpen(false)}
        task={activeTaskForModal}
        onVerify={verifyTask}
      />

      {activeDocument && (
        <ExportDocumentModal
          isOpen={isExportModalOpen}
          onClose={() => setIsExportModalOpen(false)}
          document={activeDocument}
          onExport={(fmt, opts) => {
            console.log(`Document exported to ${fmt}`);
          }}
        />
      )}

      <NewProjectModal
        isOpen={isNewProjectModalOpen}
        onClose={() => setIsNewProjectModalOpen(false)}
        onCreateProject={createProject}
      />

      <MobileFrameModal
        isOpen={isMobilePreviewOpen}
        onClose={() => setIsMobilePreviewOpen(false)}
        tasks={tasks}
        projects={projects}
      />

      <FirstTimeSetupModal
        isOpen={mustCompleteSetup}
      />
    </div>
  );
};
