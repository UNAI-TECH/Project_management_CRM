import React, { createContext, useContext, useState, useEffect } from 'react';
import { Project, ProjectDocument, DocumentStatus, Task, TeamMember, AuditLog, ProjectFeature, TaskTimeLog } from '../types';
import { projectService } from '../services/projectService';
import { documentService } from '../services/documentService';
import { taskService } from '../services/taskService';
import { teamService } from '../services/teamService';
import { auditService } from '../services/auditService';
import { featureService } from '../services/featureService';
import { timeTrackingService } from '../services/timeTrackingService';
import { documentSyncService } from '../services/documentSyncService';
import { supabaseClient } from '../lib/supabaseClient';
import { useAuth } from './AuthContext';

interface DataContextType {
  projects: Project[];
  documents: ProjectDocument[];
  tasks: Task[];
  features: ProjectFeature[];
  teamMembers: TeamMember[];
  auditLogs: AuditLog[];
  isLoading: boolean;
  
  createProject: (projectData: Partial<Project>) => Promise<Project>;
  updateProject: (id: string, updates: Partial<Project>) => Promise<Project>;
  deleteProject: (id: string) => Promise<void>;
  
  saveDocument: (id: string, content: Record<string, any>, remarks?: string, status?: ProjectDocument['status'], completion?: number) => Promise<ProjectDocument>;
  autosaveDocument: (id: string, content: Record<string, any>, completion?: number) => Promise<void>;
  updateDocumentStatus: (id: string, status: ProjectDocument['status']) => Promise<ProjectDocument>;
  
  saveFeatures: (features: ProjectFeature[]) => Promise<ProjectFeature[]>;
  assignFeature: (featureId: string, tlMember: TeamMember, estimatedHours: number, dueDate: string) => Promise<ProjectFeature>;
  
  assignTask: (taskData: Partial<Task>) => Promise<Task>;
  updateTask: (taskId: string, updates: Partial<Task>) => Promise<Task>;
  submitTask: (taskId: string, submission: { notes: string; files: string[]; urls: string[] }) => Promise<Task>;
  verifyTask: (taskId: string, approved: boolean, remarks: string) => Promise<Task>;
  deleteTask: (taskId: string) => Promise<void>;
  
  logTimeAction: (taskId: string, action: 'begin' | 'end' | 'break_start' | 'break_end' | 'pause', notes?: string) => Promise<TaskTimeLog>;
  
  addTeamMember: (memberData: Partial<TeamMember>) => Promise<TeamMember>;
  updateTeamMember: (memberId: string, updates: Partial<TeamMember>) => Promise<TeamMember>;
  removeTeamMember: (memberId: string) => Promise<void>;
  
  refreshData: () => Promise<void>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, role } = useAuth();
  
  const [projects, setProjects] = useState<Project[]>([]);
  const [documents, setDocuments] = useState<ProjectDocument[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [features, setFeatures] = useState<ProjectFeature[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const loadAllData = async () => {
    setIsLoading(true);
    try {
      const [prjs, docs, tsks, feats, members, logs] = await Promise.all([
        projectService.getProjects(),
        documentService.getDocuments(),
        taskService.getTasks(undefined, user?.organizationId, user?.id, role),
        featureService.getFeatures(undefined, user?.organizationId),
        teamService.getProjectMembers(undefined, user?.organizationId),
        auditService.getAuditLogs(),
      ]);
      setProjects(prjs);
      setDocuments(docs);
      setTasks(tsks);
      setFeatures(feats);
      setTeamMembers(members);
      setAuditLogs(logs);
    } catch (err) {
      console.error('Failed to load CRM data from service layer:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, [user]); // Reload if logged in user changes

  const createProject = async (projectData: Partial<Project>): Promise<Project> => {
    if (!user) throw new Error('Unauthenticated');
    const created = await projectService.createProject(
      { ...projectData, organizationId: user.organizationId },
      user.id
    );
    setProjects((prev) => [created, ...prev]);
    
    // Log to Audit Trail
    const log = await auditService.logAction(
      user.id,
      user.fullName,
      role,
      'Project Created',
      'Project',
      created.id,
      `Created new project "${created.name}" for client "${created.client}".`,
      user.organizationId
    );
    setAuditLogs((prev) => [log, ...prev]);
    return created;
  };

  const updateProject = async (id: string, updates: Partial<Project>): Promise<Project> => {
    if (!user) throw new Error('Unauthenticated');
    const updated = await projectService.updateProject(id, updates);
    setProjects((prev) => prev.map((p) => (p.id === id ? updated : p)));
    
    const log = await auditService.logAction(
      user.id,
      user.fullName,
      role,
      'Project Updated',
      'Project',
      id,
      `Updated properties on project "${updated.name}".`,
      user.organizationId
    );
    setAuditLogs((prev) => [log, ...prev]);
    return updated;
  };

  const deleteProject = async (id: string): Promise<void> => {
    if (!user) throw new Error('Unauthenticated');
    const target = projects.find((p) => p.id === id);
    await projectService.deleteProject(id);
    setProjects((prev) => prev.filter((p) => p.id !== id));
    
    const log = await auditService.logAction(
      user.id,
      user.fullName,
      role,
      'Project Deleted',
      'Project',
      id,
      `Deleted project "${target?.name || id}".`,
      user.organizationId
    );
    setAuditLogs((prev) => [log, ...prev]);
  };

  const saveDocument = async (
    id: string, 
    content: Record<string, any>, 
    remarks?: string,
    status?: DocumentStatus,
    completion?: number
  ): Promise<ProjectDocument> => {
    if (!user) throw new Error('Unauthenticated');
    const doc = documents.find((d) => d.id === id);
    if (!doc) throw new Error('Document not found');

    const updated = await documentService.saveDocumentContent(
      id,
      content,
      user.id,
      user.fullName,
      remarks,
      status,
      completion
    );
    
    setDocuments((prev) => prev.map((d) => (d.id === id ? updated : d)));
    
    const log = await auditService.logAction(
      user.id,
      user.fullName,
      role,
      'Document Updated',
      'Document',
      id,
      `Updated content structure for "${doc.name}" to v${updated.version}.`,
      user.organizationId
    );
    setAuditLogs((prev) => [log, ...prev]);

    return updated;
  };

  const autosaveDocument = async (
    id: string,
    content: Record<string, any>,
    completion?: number
  ): Promise<void> => {
    if (!user) return;
    const doc = documents.find((d) => d.id === id);
    if (!doc) return;

    try {
      const updated = await documentService.autosaveDocumentDraft(
        id,
        content,
        user.id,
        user.fullName,
        completion
      );
      setDocuments((prev) => prev.map((d) => (d.id === id ? updated : d)));
    } catch (e) {
      console.warn('[DataContext] Autosave draft notice:', e);
    }
  };

  const updateDocumentStatus = async (id: string, status: ProjectDocument['status']): Promise<ProjectDocument> => {
    if (!user) throw new Error('Unauthenticated');
    const doc = documents.find((d) => d.id === id);
    if (!doc) throw new Error('Document not found');
    
    const updated = await documentService.updateDocumentStatus(
      id,
      status
    );
    setDocuments((prev) => prev.map((d) => (d.id === id ? updated : d)));
    
    const log = await auditService.logAction(
      user.id,
      user.fullName,
      role,
      'Document Status Changed',
      'Document',
      id,
      `Changed status of "${doc.name}" to "${status}".`,
      user.organizationId
    );
    setAuditLogs((prev) => [log, ...prev]);

    return updated;
  };

  const saveFeatures = async (newFeatures: ProjectFeature[]): Promise<ProjectFeature[]> => {
    const saved = await featureService.saveFeatures(newFeatures);
    setFeatures((prev) => {
      const remaining = prev.filter((f) => !saved.some((s) => s.id === f.id));
      return [...saved, ...remaining].sort((a, b) => a.sequenceOrder - b.sequenceOrder);
    });
    return saved;
  };

  const assignFeature = async (
    featureId: string,
    tlMember: TeamMember,
    estimatedHours: number,
    dueDate: string
  ): Promise<ProjectFeature> => {
    const updated = await featureService.assignFeatureToTL(featureId, tlMember, estimatedHours, dueDate);
    setFeatures((prev) => prev.map((f) => (f.id === featureId ? updated : f)));
    return updated;
  };

  const assignTask = async (taskData: Partial<Task>): Promise<Task> => {
    if (!user) throw new Error('Unauthenticated');
    const created = await taskService.createTask(
      { ...taskData, organizationId: user.organizationId },
      user.id,
      `${user.fullName} (${role})`,
      role
    );
    setTasks((prev) => [created, ...prev]);

    // Auto-enroll assignee into project_members if not already part of the project team
    if (taskData.projectId && (taskData.assignedTo || taskData.assignedToName)) {
      const existingMember = teamMembers.find(
        (m) =>
          (m.id === taskData.assignedTo || (taskData.assignedToName && m.name.toLowerCase() === taskData.assignedToName.toLowerCase())) &&
          (m.projectId === taskData.projectId || m.projectId === 'all')
      );

      if (!existingMember && taskData.assignedToName && taskData.assignedToName !== 'Unassigned') {
        try {
          const newMember = await teamService.addProjectMember(
            {
              id: taskData.assignedTo,
              projectId: taskData.projectId,
              name: taskData.assignedToName,
              role: taskData.assignedToRole || 'Employee',
              designation: taskData.assignedToDesignation || (taskData.assignedToRole === 'PM' ? 'Project Manager' : taskData.assignedToRole === 'TL' ? 'Technical Lead' : 'Software Engineer'),
              department: 'Engineering',
              reportsTo: taskData.assignedBy || user.id,
            },
            user.id,
            user.organizationId
          );
          setTeamMembers((prev) => {
            const filtered = prev.filter((m) => m.id !== newMember.id && m.name.toLowerCase() !== newMember.name.toLowerCase());
            return [...filtered, newMember];
          });
        } catch (e) {
          console.warn('Notice auto-enrolling assigned member into project team:', e);
        }
      }
    }
    
    const log = await auditService.logAction(
      user.id,
      user.fullName,
      role,
      'Task Assigned',
      'Task',
      created.id,
      `Assigned task "${created.title}" to ${created.assignedToName}.`,
      user.organizationId
    );
    setAuditLogs((prev) => [log, ...prev]);
    return created;
  };

  const updateTask = async (taskId: string, updates: Partial<Task>): Promise<Task> => {
    try {
      await taskService.updateTask(taskId, updates);
    } catch (e) {
      console.warn('Task update warning:', e);
    }
    let updatedTask: Task | undefined;
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id === taskId) {
          updatedTask = { ...t, ...updates };
          return updatedTask;
        }
        return t;
      })
    );
    return updatedTask || ({ id: taskId, ...updates } as Task);
  };

  const submitTask = async (taskId: string, submission: { notes: string; files: string[]; urls: string[] }): Promise<Task> => {
    if (!user) throw new Error('Unauthenticated');
    const target = tasks.find((t) => t.id === taskId);
    const updated = await taskService.submitTask(taskId, submission, user.id, user.fullName);
    setTasks((prev) => prev.map((t) => (t.id === taskId ? updated : t)));
    
    const log = await auditService.logAction(
      user.id,
      user.fullName,
      role,
      'Task Submitted',
      'Task',
      taskId,
      `Submitted deliverables for task "${target?.title || taskId}".`,
      user.organizationId
    );
    setAuditLogs((prev) => [log, ...prev]);
    return updated;
  };

  const verifyTask = async (taskId: string, approved: boolean, remarks: string): Promise<Task> => {
    if (!user) throw new Error('Unauthenticated');
    const target = tasks.find((t) => t.id === taskId);
    const updated = await taskService.verifyTask(taskId, approved, remarks, user.id, user.fullName);
    setTasks((prev) => prev.map((t) => (t.id === taskId ? updated : t)));
    
    const actionLabel = approved ? 'Task Approved' : 'Task Reopened';
    const log = await auditService.logAction(
      user.id,
      user.fullName,
      role,
      actionLabel,
      'Task',
      taskId,
      `${approved ? 'Approved' : 'Reopened'} task "${target?.title || taskId}" with remarks: "${remarks}".`,
      user.organizationId
    );
    setAuditLogs((prev) => [log, ...prev]);

    // If PM verifies a feature-level task or all subtasks of a feature are verified:
    if (approved && updated.featureId) {
      try {
        const featureTasks = tasks.filter((t) => t.featureId === updated.featureId || t.id === updated.id);
        const allVerified = featureTasks.every((t) => t.id === updated.id || t.status === 'Verified');

        if (allVerified) {
          // Update feature status to Verified
          await supabaseClient
            .from('project_features')
            .update({ status: 'Verified', progress: 100, updated_at: new Date().toISOString() })
            .eq('id', updated.featureId);

          setFeatures((prev) =>
            prev.map((f) => (f.id === updated.featureId ? { ...f, status: 'Verified', progress: 100 } : f))
          );

          // Unlock next sequential feature!
          const { unlockedFeature, updatedFeatures } = await featureService.unlockNextFeature(
            updated.featureId,
            features
          );
          if (unlockedFeature) {
            setFeatures(updatedFeatures);
            // Refresh tasks as well to unblock the next tasks
            const refreshedTasks = await taskService.getTasks(undefined, user?.organizationId, user?.id, role);
            setTasks(refreshedTasks);
          }
        }
      } catch (err) {
        console.error('Error unlocking next feature upon task verification:', err);
      }
    }

    // Reverse sync on task verification to update linked document
    if (approved && updated.docId) {
      try {
        await documentSyncService.syncTaskCompletionToDocument(updated, user.id, user.fullName);
        const refreshedDoc = await documentService.getDocumentById(updated.docId);
        if (refreshedDoc) {
          setDocuments((prev) => prev.map((d) => (d.id === refreshedDoc.id ? refreshedDoc : d)));
        }
      } catch (err) {
        console.error('Error during reverse sync on verified task:', err);
      }
    }

    return updated;
  };

  const logTimeAction = async (
    taskId: string,
    action: 'begin' | 'end' | 'break_start' | 'break_end' | 'pause',
    notes?: string
  ): Promise<TaskTimeLog> => {
    if (!user) throw new Error('Unauthenticated');
    const log = await timeTrackingService.logAction(
      taskId,
      user.id,
      user.fullName,
      action,
      notes
    );

    // Refresh the updated task to get its new time tracker
    const refreshed = await taskService.getTasks(undefined, user.organizationId, user.id, role);
    setTasks(refreshed);

    return log;
  };

  const deleteTask = async (taskId: string): Promise<void> => {
    if (!user) throw new Error('Unauthenticated');
    const target = tasks.find((t) => t.id === taskId);
    await taskService.deleteTask(taskId);
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
    
    const log = await auditService.logAction(
      user.id,
      user.fullName,
      role,
      'Task Deleted',
      'Task',
      taskId,
      `Deleted task "${target?.title || taskId}".`,
      user.organizationId
    );
    setAuditLogs((prev) => [log, ...prev]);
  };

  const addTeamMember = async (memberData: Partial<TeamMember>): Promise<TeamMember> => {
    if (!user) throw new Error('Unauthenticated');
    const created = await teamService.addProjectMember(memberData, user.id, user.organizationId);
    setTeamMembers((prev) => {
      const idx = prev.findIndex((m) => m.projectId === created.projectId && (m.id === created.id || m.name === created.name));
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = created;
        return next;
      }
      return [...prev, created];
    });
    
    const log = await auditService.logAction(
      user.id,
      user.fullName,
      role,
      'Member Added',
      'Team',
      created.id,
      `Added ${created.name} (${created.role}) to project team.`,
      user.organizationId
    );
    setAuditLogs((prev) => [log, ...prev]);
    return created;
  };

  const updateTeamMember = async (memberId: string, updates: Partial<TeamMember>): Promise<TeamMember> => {
    if (!user) throw new Error('Unauthenticated');
    const existing = teamMembers.find((m) => m.id === memberId);
    const updatedMemberData: Partial<TeamMember> = {
      ...(existing || {}),
      ...updates,
      id: memberId,
    };
    const saved = await teamService.addProjectMember(updatedMemberData, user.id, user.organizationId);

    // Also update organization_members table if designation/role changed
    try {
      await supabaseClient
        .from('organization_members')
        .update({
          role: updates.role || existing?.role,
          designation: updates.designation || existing?.designation,
          department: updates.department || existing?.department,
        })
        .or(`id.eq.${memberId},auth_user_id.eq.${memberId},email.eq.${existing?.email}`);
    } catch (e) {
      console.warn('Update organization_members notice:', e);
    }

    setTeamMembers((prev) =>
      prev.map((m) =>
        m.id === memberId || (existing && m.projectId === existing.projectId && m.name === existing.name)
          ? { ...m, ...saved, ...updates }
          : m
      )
    );

    return saved;
  };

  const removeTeamMember = async (memberId: string): Promise<void> => {
    if (!user) throw new Error('Unauthenticated');
    const target = teamMembers.find((m) => m.id === memberId);
    await teamService.removeProjectMember(memberId);
    setTeamMembers((prev) => prev.filter((m) => m.id !== memberId));
    
    const log = await auditService.logAction(
      user.id,
      user.fullName,
      role,
      'Member Removed',
      'Team',
      memberId,
      `Removed ${target?.name || memberId} from project team.`,
      user.organizationId
    );
    setAuditLogs((prev) => [log, ...prev]);
  };

  const refreshData = async () => {
    await loadAllData();
  };

  return (
    <DataContext.Provider
      value={{
        projects,
        documents,
        tasks,
        features,
        teamMembers,
        auditLogs,
        isLoading,
        createProject,
        updateProject,
        deleteProject,
        saveDocument,
        autosaveDocument,
        updateDocumentStatus,
        saveFeatures,
        assignFeature,
        assignTask,
        updateTask,
        submitTask,
        verifyTask,
        deleteTask,
        logTimeAction,
        addTeamMember,
        updateTeamMember,
        removeTeamMember,
        refreshData,
      }}
    >
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};
