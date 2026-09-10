/**
 * Sprint Service (§22–§23, §46–§47, §80–§81)
 * ==============================================
 * First-class sprint entity management.
 * Sprint lifecycle: Planning → Active → Completed
 * Sprint closure creates immutable snapshots.
 */

import { supabase } from '../lib/supabaseClient';
import type { Sprint, SprintTask, SprintStatus } from '../types';

/**
 * Create a new sprint (§22)
 */
export async function createSprint(
  projectId: string,
  sprintNumber: number,
  goal: string,
  plannedStart: string,
  plannedEnd: string,
  scrumMasterId: string,
  scrumMasterName: string,
  organizationId: string
): Promise<{ success: boolean; sprint?: Sprint; error?: string }> {
  try {
    const sprintCode = `SPRINT-${String(sprintNumber).padStart(2, '0')}`;

    const { data, error } = await supabase
      .from('sprints')
      .insert({
        project_id: projectId,
        sprint_code: sprintCode,
        sprint_number: sprintNumber,
        goal,
        planned_start: plannedStart,
        planned_end: plannedEnd,
        scrum_master_id: scrumMasterId,
        scrum_master_name: scrumMasterName,
        status: 'Planning',
        organization_id: organizationId,
      })
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, sprint: mapSprintFromDb(data) };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Get all sprints for a project
 */
export async function getProjectSprints(projectId: string): Promise<Sprint[]> {
  const { data } = await supabase
    .from('sprints')
    .select('*')
    .eq('project_id', projectId)
    .eq('is_deleted', false)
    .order('sprint_number', { ascending: true });

  return (data || []).map(mapSprintFromDb);
}

/**
 * Get a single sprint by ID
 */
export async function getSprint(sprintId: string): Promise<Sprint | null> {
  const { data } = await supabase
    .from('sprints')
    .select('*')
    .eq('id', sprintId)
    .single();

  return data ? mapSprintFromDb(data) : null;
}

/**
 * Start a sprint (Planning → Active)
 */
export async function startSprint(
  sprintId: string
): Promise<{ success: boolean; error?: string }> {
  const { data: sprint } = await supabase
    .from('sprints')
    .select('status')
    .eq('id', sprintId)
    .single();

  if (!sprint || sprint.status !== 'Planning') {
    return { success: false, error: 'Sprint must be in Planning status to start' };
  }

  const { error } = await supabase
    .from('sprints')
    .update({
      status: 'Active',
      actual_start: new Date().toISOString().split('T')[0],
      updated_at: new Date().toISOString(),
    })
    .eq('id', sprintId);

  return error ? { success: false, error: error.message } : { success: true };
}

/**
 * Add tasks to a sprint (§22)
 */
export async function addTasksToSprint(
  sprintId: string,
  taskIds: string[]
): Promise<{ success: boolean; added: number; error?: string }> {
  try {
    const inserts = taskIds.map(taskId => ({
      sprint_id: sprintId,
      task_id: taskId,
    }));

    const { data, error } = await supabase
      .from('sprint_tasks')
      .upsert(inserts, { onConflict: 'sprint_id,task_id' })
      .select();

    if (error) {
      return { success: false, added: 0, error: error.message };
    }

    // Also update task.sprint_id for efficient querying
    await supabase
      .from('tasks')
      .update({ sprint_id: sprintId })
      .in('id', taskIds);

    return { success: true, added: data?.length || 0 };
  } catch (err: any) {
    return { success: false, added: 0, error: err.message };
  }
}

/**
 * Remove a task from a sprint
 */
export async function removeTaskFromSprint(
  sprintId: string,
  taskId: string,
  reason: string
): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase
    .from('sprint_tasks')
    .update({
      removed_at: new Date().toISOString(),
      removed_reason: reason,
    })
    .eq('sprint_id', sprintId)
    .eq('task_id', taskId);

  // Clear sprint_id on task
  await supabase
    .from('tasks')
    .update({ sprint_id: null })
    .eq('id', taskId);

  return error ? { success: false, error: error.message } : { success: true };
}

/**
 * Get sprint tasks with details
 */
export async function getSprintTasks(sprintId: string): Promise<any[]> {
  const { data } = await supabase
    .from('sprint_tasks')
    .select(`
      id, sprint_id, committed_at, removed_at, removed_reason,
      carry_forward_sprint_id, carry_forward_reason,
      tasks (
        id, title, status, priority, assigned_to_name,
        estimated_hours, actual_hours, story_points,
        started_at, completed_at
      )
    `)
    .eq('sprint_id', sprintId)
    .is('removed_at', null);

  return data || [];
}

/**
 * Calculate sprint metrics (§46)
 */
export async function calculateSprintMetrics(sprintId: string): Promise<{
  committedTasks: number;
  completedTasks: number;
  verifiedTasks: number;
  blockedTasks: number;
  carryForwardTasks: number;
  committedStoryPoints: number;
  completedStoryPoints: number;
  plannedHours: number;
  actualHours: number;
  velocity: number;
}> {
  const tasks = await getSprintTasks(sprintId);

  const activeTasks = tasks.filter(t => !t.removed_at);
  const taskDetails = activeTasks.map(t => t.tasks).filter(Boolean);

  const completedStatuses = ['Verified', 'Closed'];
  const completedTasks = taskDetails.filter(t => completedStatuses.includes(t.status));
  const verifiedTasks = taskDetails.filter(t => t.status === 'Verified');
  const blockedTasks = taskDetails.filter(t => t.status === 'Blocked');

  const committedStoryPoints = taskDetails.reduce((sum: number, t: any) => sum + (t.story_points || 0), 0);
  const completedStoryPoints = completedTasks.reduce((sum: number, t: any) => sum + (t.story_points || 0), 0);
  const plannedHours = taskDetails.reduce((sum: number, t: any) => sum + (t.estimated_hours || 0), 0);
  const actualHours = taskDetails.reduce((sum: number, t: any) => sum + (t.actual_hours || 0), 0);

  const carryForwardTasks = tasks.filter(t => t.carry_forward_sprint_id).length;

  return {
    committedTasks: activeTasks.length,
    completedTasks: completedTasks.length,
    verifiedTasks: verifiedTasks.length,
    blockedTasks: blockedTasks.length,
    carryForwardTasks,
    committedStoryPoints,
    completedStoryPoints,
    plannedHours,
    actualHours,
    velocity: completedStoryPoints,
  };
}

/**
 * Close a sprint with validation (§81)
 */
export async function closeSprint(
  sprintId: string,
  closedBy: string,
  closedByName: string,
  organizationId: string
): Promise<{ success: boolean; snapshotId?: string; error?: string }> {
  try {
    const { data: sprint } = await supabase
      .from('sprints')
      .select('*')
      .eq('id', sprintId)
      .single();

    if (!sprint || sprint.status !== 'Active') {
      return { success: false, error: 'Sprint must be Active to close' };
    }

    // Calculate final metrics
    const metrics = await calculateSprintMetrics(sprintId);

    // Create closure snapshot (§23) — immutable
    const snapshotData = {
      sprint,
      metrics,
      closedAt: new Date().toISOString(),
      closedBy,
      closedByName,
    };

    const { data: snapshot, error: snapError } = await supabase
      .from('sprint_snapshots')
      .insert({
        sprint_id: sprintId,
        snapshot_type: 'Closure',
        snapshot_data: snapshotData,
        created_by: closedBy,
        created_by_name: closedByName,
      })
      .select()
      .single();

    if (snapError) {
      return { success: false, error: `Snapshot failed: ${snapError.message}` };
    }

    // Update sprint status
    const { error: updateError } = await supabase
      .from('sprints')
      .update({
        status: 'Completed',
        actual_end: new Date().toISOString().split('T')[0],
        closed_at: new Date().toISOString(),
        closed_by: closedBy,
        completed_story_points: metrics.completedStoryPoints,
        actual_hours: metrics.actualHours,
        updated_at: new Date().toISOString(),
      })
      .eq('id', sprintId);

    if (updateError) {
      return { success: false, error: updateError.message };
    }

    // Also create project snapshot (§83)
    await supabase.from('project_snapshots').insert({
      project_id: sprint.project_id,
      snapshot_type: 'Sprint Closure',
      snapshot_data: snapshotData,
      created_by: closedBy,
      created_by_name: closedByName,
      organization_id: organizationId,
    });

    return { success: true, snapshotId: snapshot?.id };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Carry forward incomplete tasks to a new sprint (§81)
 */
export async function carryForwardTasks(
  fromSprintId: string,
  toSprintId: string,
  taskIds: string[],
  reason: string,
  approvedBy: string
): Promise<{ success: boolean; carried: number; error?: string }> {
  try {
    // Mark tasks as carried forward in source sprint
    for (const taskId of taskIds) {
      await supabase
        .from('sprint_tasks')
        .update({
          carry_forward_sprint_id: toSprintId,
          carry_forward_reason: reason,
          carry_forward_approved_by: approvedBy,
        })
        .eq('sprint_id', fromSprintId)
        .eq('task_id', taskId);
    }

    // Add tasks to target sprint
    const result = await addTasksToSprint(toSprintId, taskIds);
    return { success: true, carried: result.added };
  } catch (err: any) {
    return { success: false, carried: 0, error: err.message };
  }
}

// Helper to map DB record to Sprint type
function mapSprintFromDb(data: any): Sprint {
  return {
    id: data.id,
    projectId: data.project_id,
    sprintCode: data.sprint_code,
    sprintNumber: data.sprint_number,
    goal: data.goal,
    plannedStart: data.planned_start,
    plannedEnd: data.planned_end,
    actualStart: data.actual_start,
    actualEnd: data.actual_end,
    scrumMasterId: data.scrum_master_id,
    scrumMasterName: data.scrum_master_name,
    committedStoryPoints: data.committed_story_points || 0,
    completedStoryPoints: data.completed_story_points || 0,
    plannedCapacityHours: data.planned_capacity_hours || 0,
    actualHours: data.actual_hours || 0,
    status: data.status,
    closedAt: data.closed_at,
    closedBy: data.closed_by,
    organizationId: data.organization_id,
    isDeleted: data.is_deleted || false,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}
