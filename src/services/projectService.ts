import { supabaseClient } from '../lib/supabaseClient';
import { Project } from '../types';

export function mapDbProjectToProject(dbRow: any): Project {
  return {
    id: dbRow.id,
    code: dbRow.project_code || 'PRJ',
    name: dbRow.name || 'Untitled',
    client: dbRow.client || 'Internal',
    sponsor: dbRow.sponsor || 'CTO Office',
    status: dbRow.status || 'Planning',
    priority: dbRow.priority || 'Medium',
    department: dbRow.department || 'Engineering',
    startDate: dbRow.start_date || '',
    targetEndDate: dbRow.target_end_date || '',
    progress: dbRow.progress || 0,
    pmName: dbRow.pm_name || 'Sarah K',
    pmId: dbRow.pm_id || 'usr-pm-002',
    description: dbRow.description || '',
    lifecyclePhase: dbRow.lifecycle_phase || 'Initiate',
    totalDocuments: dbRow.total_documents || 16,
    completedDocuments: dbRow.completed_documents || 0,
    totalTasks: dbRow.total_tasks || 0,
    completedTasks: dbRow.completed_tasks || 0,
    overdueTasks: dbRow.overdue_tasks || 0,
    budget: dbRow.budget,
    technology: dbRow.technology,
    businessObjective: dbRow.business_objective,
    projectType: dbRow.project_type || 'Software',
    poId: dbRow.po_id,
    poName: dbRow.po_name,
    actualStartDate: dbRow.actual_start_date,
    actualEndDate: dbRow.actual_end_date,
  };
}

const TEMPLATE_DEFINITIONS = [
  { docType: 0, docNumber: 'MR-00', name: 'Master Record', phase: 'Initiate' },
  { docType: 1, docNumber: 'PL-01', name: 'Project Charter', phase: 'Initiate' },
  { docType: 2, docNumber: 'PL-02', name: 'Project Plan', phase: 'Plan' },
  { docType: 3, docNumber: 'RQ-01', name: 'Software Requirements Spec (SRS)', phase: 'Requirements' },
  { docType: 4, docNumber: 'RQ-02', name: 'Business Requirement Doc (BRD)', phase: 'Requirements' },
  { docType: 5, docNumber: 'DS-01', name: 'Functional Specification', phase: 'Design' },
  { docType: 6, docNumber: 'DS-02', name: 'Technical Specification', phase: 'Design' },
  { docType: 7, docNumber: 'DS-03', name: 'Architecture Document', phase: 'Design' },
  { docType: 8, docNumber: 'DS-04', name: 'UI/UX Design Document', phase: 'Design' },
  { docType: 9, docNumber: 'BL-01', name: 'Sprint Plan', phase: 'Build' },
  { docType: 10, docNumber: 'TS-01', name: 'Test Plan', phase: 'Test' },
  { docType: 11, docNumber: 'TS-02', name: 'Test Cases', phase: 'Test' },
  { docType: 12, docNumber: 'TS-03', name: 'UAT Sign-off', phase: 'Test' },
  { docType: 13, docNumber: 'RL-01', name: 'Deployment Checklist', phase: 'Release' },
  { docType: 14, docNumber: 'RL-02', name: 'Go-Live Checklist', phase: 'Release' },
  { docType: 15, docNumber: 'MT-01', name: 'Maintenance Plan', phase: 'Maintain' },
];

export const projectService = {
  async getProjects(): Promise<Project[]> {
    const { data, error } = await supabaseClient
      .from('projects')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching projects from Supabase:', error);
      return [];
    }

    return (data || []).map(mapDbProjectToProject);
  },

  async createProject(project: Partial<Project> & { organizationId?: string }, actorId: string): Promise<Project> {
    const projectId = project.id || `prj-${Date.now()}`;
    let orgId = project.organizationId || (project as any).organization_id || null;
    const safePmId = project.pmId || null;
    const safeCreatedBy = actorId || null;

    // Fallback: resolve organization_id from organization_members if missing
    if (!orgId && safeCreatedBy) {
      try {
        const { data: mem } = await supabaseClient
          .from('organization_members')
          .select('organization_id')
          .or(`auth_user_id.eq.${safeCreatedBy},id.eq.${safeCreatedBy}`)
          .maybeSingle();
        if (mem?.organization_id) {
          orgId = mem.organization_id;
        }
      } catch (memErr) {
        console.warn('Could not resolve organization_id fallback:', memErr);
      }
    }

    const newProject = {
      id: projectId,
      project_code: project.code || `PRJ-${Date.now().toString().slice(-4)}`,
      name: project.name || 'New Project',
      client: project.client || 'Client',
      sponsor: project.sponsor || 'CTO Office',
      status: project.status || 'Planning',
      priority: project.priority || 'Medium',
      department: project.department || 'Engineering',
      start_date: project.startDate || new Date().toLocaleDateString('en-GB'),
      target_end_date: project.targetEndDate || new Date().toLocaleDateString('en-GB'),
      progress: 0,
      pm_name: project.pmName || 'Sarah K',
      pm_id: safePmId,
      description: project.description || '',
      lifecycle_phase: project.lifecyclePhase || 'Initiate',
      created_by: safeCreatedBy,
      organization_id: orgId,
      budget: project.budget || null,
      technology: project.technology || null,
      business_objective: project.businessObjective || null,
      project_type: project.projectType || 'Software',
      po_id: project.poId || null,
      po_name: project.poName || null,
      actual_start_date: project.actualStartDate || null,
      actual_end_date: project.actualEndDate || null,
    };

    let { data, error } = await supabaseClient
      .from('projects')
      .upsert(newProject, { onConflict: 'id' })
      .select()
      .maybeSingle();

    if (error) {
      console.warn('Notice creating project in Supabase (attempting fallback fetch):', error);
      const { data: existing } = await supabaseClient
        .from('projects')
        .select()
        .eq('id', projectId)
        .maybeSingle();
      if (existing) {
        data = existing;
        error = null;
      } else {
        throw error;
      }
    }

    // Emit domain event (§75)
    try {
      const { processEvent } = await import('./workflowEngine');
      await processEvent({
        eventType: 'PROJECT_CREATED',
        projectId,
        entityType: 'Project',
        entityId: projectId,
        actorId: safeCreatedBy || 'system',
        actorName: project.pmName || 'System',
        actorRole: 'CTO',
        organizationId: orgId || '',
        payload: { project: data || newProject },
      });
    } catch (evtErr) {
      console.warn('Non-fatal: could not process PROJECT_CREATED event:', evtErr);
    }

    // Auto-provision all 16 template document shells for the new project in Supabase
    const docShells = TEMPLATE_DEFINITIONS.map((tpl) => ({
      id: `doc-${projectId}-${tpl.docType}`,
      project_id: projectId,
      doc_type: tpl.docType,
      doc_number: tpl.docNumber,
      name: tpl.name,
      phase: tpl.phase,
      version: '1.0',
      status: 'Draft',
      completion: 0,
      owner_id: safeCreatedBy,
      owner_name: project.pmName || 'Sarah K',
      content: {},
      files: [],
      organization_id: orgId,
    }));

    const { error: docsError } = await supabaseClient
      .from('project_documents')
      .upsert(docShells, { onConflict: 'id', ignoreDuplicates: true });

    if (docsError) {
      console.warn('Notice: Could not auto-insert document shells:', docsError);
    }

    return mapDbProjectToProject(data || newProject);
  },

  async updateProject(id: string, updates: Partial<Project>): Promise<Project> {
    const dbUpdates: Record<string, any> = {};
    if (updates.code !== undefined) dbUpdates.project_code = updates.code;
    if (updates.name !== undefined) dbUpdates.name = updates.name;
    if (updates.client !== undefined) dbUpdates.client = updates.client;
    if (updates.sponsor !== undefined) dbUpdates.sponsor = updates.sponsor;
    if (updates.status !== undefined) dbUpdates.status = updates.status;
    if (updates.priority !== undefined) dbUpdates.priority = updates.priority;
    if (updates.department !== undefined) dbUpdates.department = updates.department;
    if (updates.startDate !== undefined) dbUpdates.start_date = updates.startDate;
    if (updates.targetEndDate !== undefined) dbUpdates.target_end_date = updates.targetEndDate;
    if (updates.progress !== undefined) dbUpdates.progress = updates.progress;
    if (updates.pmName !== undefined) dbUpdates.pm_name = updates.pmName;
    if (updates.pmId !== undefined) dbUpdates.pm_id = updates.pmId;
    if (updates.description !== undefined) dbUpdates.description = updates.description;
    if (updates.lifecyclePhase !== undefined) dbUpdates.lifecycle_phase = updates.lifecyclePhase;
    if (updates.budget !== undefined) dbUpdates.budget = updates.budget;
    if (updates.technology !== undefined) dbUpdates.technology = updates.technology;
    if (updates.businessObjective !== undefined) dbUpdates.business_objective = updates.businessObjective;
    if (updates.projectType !== undefined) dbUpdates.project_type = updates.projectType;
    if (updates.poId !== undefined) dbUpdates.po_id = updates.poId;
    if (updates.poName !== undefined) dbUpdates.po_name = updates.poName;
    if (updates.actualStartDate !== undefined) dbUpdates.actual_start_date = updates.actualStartDate;
    if (updates.actualEndDate !== undefined) dbUpdates.actual_end_date = updates.actualEndDate;

    const { data, error } = await supabaseClient
      .from('projects')
      .update(dbUpdates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating project in Supabase:', error);
      throw error;
    }

    return mapDbProjectToProject(data);
  },

  async deleteProject(id: string): Promise<void> {
    try {
      await supabaseClient.from('tasks').delete().eq('project_id', id);
      await supabaseClient.from('project_documents').delete().eq('project_id', id);
      await supabaseClient.from('project_members').delete().eq('project_id', id);
    } catch (e) {
      console.warn('Cascading records delete warning:', e);
    }

    const { error } = await supabaseClient.from('projects').delete().eq('id', id);
    if (error) {
      console.error('Error deleting project from Supabase:', error);
      throw error;
    }
  },
};
