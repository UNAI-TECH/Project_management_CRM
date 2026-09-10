import { supabaseClient } from '../lib/supabaseClient';
import { Task, TaskStatus, Priority, UserRole, TaskTimeLog } from '../types';
import { timeTrackingService } from './timeTrackingService';

export function mapDbTaskToTask(dbRow: any): Task {
  const rawLogs: TaskTimeLog[] = (dbRow.task_time_logs || []).map((l: any) => ({
    id: l.id,
    taskId: l.task_id,
    employeeId: l.employee_id,
    employeeName: l.employee_name || 'Employee',
    action: l.action,
    timestamp: l.timestamp,
    notes: l.notes || undefined,
  }));

  const timeTracker = timeTrackingService.computeTrackerFromLogs(dbRow.id, rawLogs, dbRow.due_date);

  return {
    id: dbRow.id,
    projectId: dbRow.project_id,
    projectName: dbRow.projects?.name || 'Project',
    docId: dbRow.doc_id,
    docName: dbRow.project_documents?.name || undefined,
    templateId: dbRow.project_documents?.doc_type ?? undefined,
    title: dbRow.title || 'Untitled Task',
    description: dbRow.description || '',
    assignedBy: dbRow.assigned_by || '',
    assignedByName: dbRow.assigned_by_name || 'Assigner',
    assignedByRole: (dbRow.assigned_by_role as UserRole) || 'CTO',
    assignedTo: dbRow.assigned_to || '',
    assignedToName: dbRow.assigned_to_name || 'Assignee',
    assignedToRole: (dbRow.assigned_to_role as UserRole) || 'Employee',
    assignedToDesignation: dbRow.assigned_to_designation || 'Developer',
    status: (dbRow.status as TaskStatus) || 'Open',
    priority: (dbRow.priority as Priority) || 'Medium',
    dueDate: dbRow.due_date || 'TBD',
    createdAt: dbRow.created_at ? new Date(dbRow.created_at).toLocaleDateString('en-GB') : 'Today',
    progress: dbRow.progress || 0,
    parentTaskId: dbRow.parent_task_id || null,
    featureId: dbRow.feature_id || null,
    featureName: dbRow.project_features?.name || null,
    taskType: dbRow.task_type || 'feature_task',
    sequenceOrder: dbRow.sequence_order || 0,
    isBlocked: dbRow.is_blocked ?? false,
    estimatedHours: dbRow.estimated_hours ? Number(dbRow.estimated_hours) : undefined,
    actualHours: dbRow.actual_hours ? Number(dbRow.actual_hours) : Number((timeTracker.totalWorkMinutes / 60).toFixed(2)),
    startedAt: dbRow.started_at || timeTracker.startedAt,
    completedAt: dbRow.completed_at || undefined,
    timeTracker,
    referenceFiles: (dbRow.task_reference_files || []).map((f: any) => ({
      id: f.id,
      name: f.name,
      type: f.type,
      url: f.url,
      size: f.size,
    })),
    submission: (() => {
      const submissions = dbRow.task_submissions || [];
      if (submissions.length === 0) return undefined;
      const latest = [...submissions].sort(
        (a: any, b: any) => new Date(b.created_at || b.submitted_at || 0).getTime() - new Date(a.created_at || a.submitted_at || 0).getTime()
      )[0];
      return {
        id: latest.id,
        submittedBy: latest.submitted_by,
        submittedByName: latest.submitted_by_name,
        submittedAt: latest.submitted_at
          ? new Date(latest.submitted_at).toLocaleDateString('en-GB')
          : 'Today',
        notes: latest.notes || '',
        fileUrls: latest.file_urls || [],
        referenceUrls: latest.reference_urls || [],
      };
    })(),
    statusLogs: (dbRow.task_status_log || []).map((l: any) => ({
      id: l.id,
      fromStatus: l.from_status,
      toStatus: l.to_status,
      changedBy: l.changed_by,
      changedByName: l.changed_by_name,
      remarks: l.remarks,
      changedAt: l.changed_at ? new Date(l.changed_at).toLocaleDateString('en-GB') : 'Recently',
    })),
  };
}

export const taskService = {
  async getTasks(projectId?: string, orgId?: string, currentUserId?: string, userRole?: UserRole): Promise<Task[]> {
    let query = supabaseClient
      .from('tasks')
      .select(`
        *,
        projects(name),
        project_documents(name, doc_type),
        project_features(name),
        task_reference_files(*),
        task_submissions(*),
        task_status_log(*),
        task_time_logs(*)
      `)
      .order('created_at', { ascending: false });

    if (projectId && projectId !== 'all') {
      query = query.eq('project_id', projectId);
    }
    if (orgId) {
      query = query.eq('organization_id', orgId);
    }

    const { data, error } = await query;
    if (error) {
      console.error('Error fetching tasks from Supabase:', error);
      return [];
    }

    // Resolve true assignee names from organization_members
    const { data: orgData } = await supabaseClient.from('organization_members').select('*');
    const orgMap = new Map<string, any>();
    (orgData || []).forEach((m: any) => {
      if (m.id) orgMap.set(m.id, m);
      if (m.auth_user_id) orgMap.set(m.auth_user_id, m);
      if (m.email) orgMap.set(m.email.toLowerCase(), m);
      if (m.full_name) orgMap.set(m.full_name.toLowerCase(), m);
    });

    return (data || []).map((row) => {
      const task = mapDbTaskToTask(row);
      const matched = task.assignedTo ? orgMap.get(task.assignedTo) : null;
      if (matched) {
        task.assignedToName = matched.full_name || task.assignedToName;
        task.assignedToRole = matched.role || task.assignedToRole;
        task.assignedToDesignation = matched.designation || task.assignedToDesignation;
      }
      return task;
    });
  },

  async createTask(taskData: Partial<Task>, actorId: string, actorName: string, actorRole: UserRole): Promise<Task> {
    const taskId = taskData.id || `tsk-${Date.now()}`;
    const orgId = taskData.organizationId || (taskData as any).organization_id || null;

    // 1. Resolve & validate project_id
    let validProjectId = taskData.projectId;
    if (!validProjectId) {
      const { data: prjRow } = await supabaseClient.from('projects').select('id').limit(1).maybeSingle();
      validProjectId = prjRow?.id || 'proj-1';
    }

    // 2. Validate feature_id in project_features table to prevent FK constraint 23503 errors
    let validFeatureId: string | null = null;
    if (taskData.featureId) {
      try {
        const { data: featRow } = await supabaseClient
          .from('project_features')
          .select('id')
          .eq('id', taskData.featureId)
          .maybeSingle();

        if (featRow) {
          validFeatureId = featRow.id;
        }
      } catch (err) {
        console.warn('Feature ID verification notice:', err);
      }
    }

    // 3. Validate parent_task_id in tasks table to prevent FK constraint 23503 errors
    let validParentTaskId: string | null = null;
    if (taskData.parentTaskId) {
      try {
        const { data: parentRow } = await supabaseClient
          .from('tasks')
          .select('id, feature_id, project_id')
          .eq('id', taskData.parentTaskId)
          .maybeSingle();

        if (parentRow) {
          validParentTaskId = parentRow.id;
          if (!validFeatureId && parentRow.feature_id) {
            validFeatureId = parentRow.feature_id;
          }
          if (!validProjectId && parentRow.project_id) {
            validProjectId = parentRow.project_id;
          }
        } else {
          validParentTaskId = taskData.parentTaskId;
        }
      } catch (err) {
        console.warn('Parent Task ID verification notice:', err);
        validParentTaskId = taskData.parentTaskId;
      }
    }

    const newTask = {
      id: taskId,
      project_id: validProjectId,
      doc_id: taskData.docId || null,
      parent_task_id: validParentTaskId,
      feature_id: validFeatureId,
      task_type: taskData.taskType || (validParentTaskId ? 'subtask' : 'feature_task'),
      sequence_order: taskData.sequenceOrder || 0,
      is_blocked: taskData.isBlocked ?? false,
      title: taskData.title || 'Untitled Task',
      description: taskData.description || '',
      assigned_by: actorId,
      assigned_by_name: actorName,
      assigned_by_role: actorRole,
      assigned_to: taskData.assignedTo || actorId,
      assigned_to_name: taskData.assignedToName || 'Assignee',
      assigned_to_role: taskData.assignedToRole || 'Employee',
      assigned_to_designation: taskData.assignedToDesignation || 'Developer',
      status: taskData.status || 'Open',
      priority: taskData.priority || 'Medium',
      due_date: taskData.dueDate || new Date().toLocaleDateString('en-GB'),
      estimated_hours: taskData.estimatedHours || 8,
      actual_hours: 0,
      progress: 0,
      organization_id: orgId,
    };

    const { data, error } = await supabaseClient
      .from('tasks')
      .insert(newTask)
      .select(`
        *,
        projects(name),
        project_documents(name, doc_type),
        project_features(name),
        task_reference_files(*),
        task_submissions(*),
        task_status_log(*),
        task_time_logs(*)
      `)
      .single();

    if (error) {
      console.error('Error creating task in Supabase:', error);
      throw error;
    }

    // Insert reference file attachments if any
    if (taskData.referenceFiles && taskData.referenceFiles.length > 0) {
      const filesToInsert = taskData.referenceFiles.map((rf) => ({
        task_id: taskId,
        name: rf.name,
        type: rf.type || 'file',
        url: rf.url || '#',
        size: rf.size || '1 MB',
        uploaded_by: actorId,
      }));
      await supabaseClient.from('task_reference_files').insert(filesToInsert);
    }

    return mapDbTaskToTask(data);
  },

  async submitTask(
    taskId: string,
    submission: { notes: string; files: string[]; urls: string[] },
    actorId: string,
    actorName: string
  ): Promise<Task> {
    const submissionId = `sub-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const logId = `log-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

    // 1. Insert submission
    try {
      let safeSubmittedBy: string | null = null;
      if (actorId) {
        const { data: emp } = await supabaseClient.from('employees_cache').select('employee_id').eq('employee_id', actorId).maybeSingle();
        if (emp) safeSubmittedBy = emp.employee_id;
      }

      await supabaseClient.from('task_submissions').insert({
        task_id: taskId,
        submitted_by: safeSubmittedBy,
        submitted_by_name: actorName,
        notes: submission.notes || '',
        file_urls: submission.files || [],
        reference_urls: submission.urls || [],
      });
    } catch (subErr) {
      console.warn('Notice inserting task_submissions:', subErr);
    }

    // 2. Log status transition
    try {
      let safeActorId: string | null = null;
      if (actorId) {
        const { data: emp } = await supabaseClient.from('employees_cache').select('employee_id').eq('employee_id', actorId).maybeSingle();
        if (emp) safeActorId = emp.employee_id;
      }

      await supabaseClient.from('task_status_log').insert({
        task_id: taskId,
        from_status: 'In Progress',
        to_status: 'Submitted',
        changed_by: safeActorId,
        changed_by_name: actorName,
        remarks: submission.notes || 'Deliverables submitted for review',
      });

      // Immutable task event (§36)
      const { recordTaskEvent } = await import('./taskEventService');
      const { data: tRow } = await supabaseClient.from('tasks').select('project_id').eq('id', taskId).single();
      if (tRow) {
        await recordTaskEvent(
          taskId,
          tRow.project_id,
          'SUBMITTED',
          'In Progress',
          'Submitted',
          actorId,
          actorName,
          { notes: submission.notes }
        );
      }
    } catch (logErr) {
      console.warn('Notice inserting task_status_log:', logErr);
    }

    // 3. Update task status & progress
    const { data, error } = await supabaseClient
      .from('tasks')
      .update({
        status: 'Submitted',
        progress: 85,
        updated_at: new Date().toISOString(),
      })
      .eq('id', taskId)
      .select(`
        *,
        projects(name),
        project_documents(name, doc_type),
        project_features(name),
        task_reference_files(*),
        task_submissions(*),
        task_status_log(*),
        task_time_logs(*)
      `)
      .single();

    if (error) {
      console.error('Error submitting task in Supabase:', error);
      throw error;
    }

    const mapped = mapDbTaskToTask(data);
    mapped.submission = {
      id: submissionId,
      submittedBy: actorId,
      submittedByName: actorName,
      submittedAt: new Date().toLocaleDateString('en-GB'),
      notes: submission.notes || '',
      fileUrls: submission.files || [],
      referenceUrls: submission.urls || [],
    };
    return mapped;
  },

  async verifyTask(
    taskId: string,
    approved: boolean,
    remarks: string,
    actorId: string,
    actorName: string
  ): Promise<Task> {
    const nextStatus = approved ? 'Verified' : 'Reopened';
    const nextProgress = approved ? 100 : 30;

    // 1. Log verification decision safely
    try {
      let safeActorId: string | null = null;
      if (actorId) {
        const { data: emp } = await supabaseClient.from('employees_cache').select('employee_id').eq('employee_id', actorId).maybeSingle();
        if (emp) safeActorId = emp.employee_id;
      }

      await supabaseClient.from('task_status_log').insert({
        task_id: taskId,
        from_status: 'Submitted',
        to_status: nextStatus,
        changed_by: safeActorId,
        changed_by_name: actorName,
        remarks: remarks || (approved ? 'Task verified by supervisor' : 'Task requested rework'),
      });

      // Immutable task event (§36)
      const { recordTaskEvent } = await import('./taskEventService');
      const { data: tRow } = await supabaseClient.from('tasks').select('project_id, organization_id').eq('id', taskId).single();
      if (tRow) {
        await recordTaskEvent(
          taskId,
          tRow.project_id,
          approved ? 'VERIFIED' : 'REVISION_REQUESTED',
          'Submitted',
          nextStatus,
          actorId,
          actorName,
          { remarks }
        );

        // Emit domain event if verified (§75)
        if (approved) {
          try {
            const { processEvent } = await import('./workflowEngine');
            await processEvent({
              eventType: 'TASK_VERIFIED',
              projectId: tRow.project_id,
              entityType: 'Task',
              entityId: taskId,
              actorId,
              actorName,
              actorRole: 'TL',
              organizationId: tRow.organization_id || '',
              payload: { taskId, remarks },
            });
          } catch (wfErr) {
            console.warn('Non-fatal: could not process TASK_VERIFIED event:', wfErr);
          }
        }
      }
    } catch (logErr) {
      console.warn('Notice inserting task_status_log on verify:', logErr);
    }

    // 2. Update task status, verification attribution & progress (§25, §39)
    const updatePayload: Record<string, any> = {
      status: nextStatus,
      progress: nextProgress,
      completed_at: approved ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    };

    if (approved) {
      updatePayload.verified_by = actorId;
      updatePayload.verified_by_name = actorName;
      updatePayload.verified_at = new Date().toISOString();
    }

    const { data, error } = await supabaseClient
      .from('tasks')
      .update(updatePayload)
      .eq('id', taskId)
      .select(`
        *,
        projects(name),
        project_documents(name, doc_type),
        project_features(name),
        task_reference_files(*),
        task_submissions(*),
        task_status_log(*),
        task_time_logs(*)
      `)
      .single();

    if (error) {
      console.error('Error verifying task in Supabase:', error);
      throw error;
    }

    return mapDbTaskToTask(data);
  },

  async updateTask(taskId: string, updates: Partial<Task>): Promise<Task> {
    const dbPayload: any = {};
    if (updates.title !== undefined) dbPayload.title = updates.title;
    if (updates.description !== undefined) dbPayload.description = updates.description;
    if (updates.status !== undefined) dbPayload.status = updates.status;
    if (updates.priority !== undefined) dbPayload.priority = updates.priority;
    if (updates.progress !== undefined) dbPayload.progress = updates.progress;
    if (updates.dueDate !== undefined) dbPayload.due_date = updates.dueDate;
    if (updates.assignedTo !== undefined) dbPayload.assigned_to = updates.assignedTo;
    if (updates.assignedToName !== undefined) dbPayload.assigned_to_name = updates.assignedToName;
    if (updates.assignedToRole !== undefined) dbPayload.assigned_to_role = updates.assignedToRole;
    if (updates.assignedToDesignation !== undefined) dbPayload.assigned_to_designation = updates.assignedToDesignation;
    if (updates.estimatedHours !== undefined) dbPayload.estimated_hours = updates.estimatedHours;
    if (updates.actualHours !== undefined) dbPayload.actual_hours = updates.actualHours;

    if (Object.keys(dbPayload).length > 0) {
      await supabaseClient
        .from('tasks')
        .update(dbPayload)
        .eq('id', taskId);
    }

    return { ...updates, id: taskId } as Task;
  },

  async deleteTask(taskId: string): Promise<void> {
    const { error } = await supabaseClient.from('tasks').delete().eq('id', taskId);
    if (error) {
      console.error('Error deleting task from Supabase:', error);
      throw error;
    }
  },
};
