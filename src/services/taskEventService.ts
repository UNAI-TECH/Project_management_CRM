/**
 * Task Event Service (§36)
 * =========================
 * Immutable task event recording.
 * Creates historical event records for every task status change.
 * Replaces task_status_log over time with richer event data.
 */

import { supabase } from '../lib/supabaseClient';
import type { TaskEvent, TaskEventType } from '../types';

// Valid task transitions per §35
const VALID_TASK_TRANSITIONS: Record<string, string[]> = {
  'Open': ['Assigned', 'Cancelled'],
  'Assigned': ['Accepted', 'Cancelled'],
  'Accepted': ['In Progress', 'Cancelled'],
  'In Progress': ['Blocked', 'Submitted', 'Cancelled'],
  'Blocked': ['In Progress'],
  'Submitted': ['Verified', 'Changes Requested'],
  'Changes Requested': ['In Progress'],
  'Resubmitted': ['Verified', 'Changes Requested'],
  'Verified': ['Closed', 'Reopened'],
  'Reopened': ['In Progress'],
  // Legacy compatibility
  'Closed': [],
  'Cancelled': [],
};

/**
 * Validate if a task status transition is allowed (§35)
 */
export function isValidTaskTransition(fromStatus: string, toStatus: string): boolean {
  const allowed = VALID_TASK_TRANSITIONS[fromStatus];
  return allowed ? allowed.includes(toStatus) : false;
}

/**
 * Get allowed transitions for a given task status
 */
export function getAllowedTransitions(currentStatus: string): string[] {
  return VALID_TASK_TRANSITIONS[currentStatus] || [];
}

/**
 * Map task status change to event type (§36)
 */
function mapToEventType(fromStatus: string, toStatus: string): TaskEventType {
  const mapping: Record<string, TaskEventType> = {
    'Open→Assigned': 'ASSIGNED',
    'Assigned→Accepted': 'ACCEPTED',
    'Accepted→In Progress': 'STARTED',
    'In Progress→Blocked': 'BLOCKED',
    'Blocked→In Progress': 'UNBLOCKED',
    'In Progress→Submitted': 'SUBMITTED',
    'Submitted→Verified': 'VERIFIED',
    'Submitted→Changes Requested': 'REVISION_REQUESTED',
    'Changes Requested→In Progress': 'STARTED',
    'Resubmitted→Verified': 'VERIFIED',
    'Resubmitted→Changes Requested': 'REVISION_REQUESTED',
    'Verified→Closed': 'CLOSED',
    'Verified→Reopened': 'REOPENED',
    'Reopened→In Progress': 'STARTED',
  };

  const key = `${fromStatus}→${toStatus}`;
  return mapping[key] || 'CREATED';
}

/**
 * Record a task event (§36)
 * This is an immutable insert — events are never updated or deleted
 */
export async function recordTaskEvent(
  taskId: string,
  projectId: string,
  eventType: TaskEventType,
  fromStatus: string | null,
  toStatus: string | null,
  actorId: string,
  actorName: string,
  metadata?: Record<string, any>
): Promise<{ success: boolean; event?: TaskEvent; error?: string }> {
  try {
    const { data, error } = await supabase
      .from('task_events')
      .insert({
        task_id: taskId,
        project_id: projectId,
        event_type: eventType,
        from_status: fromStatus,
        to_status: toStatus,
        actor_id: actorId,
        actor_name: actorName,
        metadata: metadata || {},
      })
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    return {
      success: true,
      event: {
        id: data.id,
        taskId: data.task_id,
        projectId: data.project_id,
        eventType: data.event_type,
        fromStatus: data.from_status,
        toStatus: data.to_status,
        actorId: data.actor_id,
        actorName: data.actor_name,
        metadata: data.metadata,
        createdAt: data.created_at,
      },
    };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Transition a task with full validation and event recording (§35, §36)
 */
export async function transitionTaskStatus(
  taskId: string,
  toStatus: string,
  actorId: string,
  actorName: string,
  actorRole: string,
  remarks?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Fetch current task
    const { data: task, error: fetchError } = await supabase
      .from('tasks')
      .select('id, status, project_id, title, organization_id, started_at')
      .eq('id', taskId)
      .single();

    if (fetchError || !task) {
      return { success: false, error: 'Task not found' };
    }

    const fromStatus = task.status;

    // Validate transition (§35)
    if (!isValidTaskTransition(fromStatus, toStatus)) {
      return {
        success: false,
        error: `Invalid transition: ${fromStatus} → ${toStatus}. Allowed: ${getAllowedTransitions(fromStatus).join(', ') || 'none'}`,
      };
    }

    // Additional validations (§62)
    if (toStatus === 'Verified') {
      // Check that task has a submission
      const { data: submissions } = await supabase
        .from('task_submissions')
        .select('id')
        .eq('task_id', taskId)
        .limit(1);

      if (!submissions || submissions.length === 0) {
        return { success: false, error: 'Cannot verify: task has no submission (§62)' };
      }
    }

    // Update task status
    const updateData: Record<string, any> = {
      status: toStatus,
      updated_at: new Date().toISOString(),
    };

    // Set timestamps based on transition
    if (toStatus === 'In Progress' && !task.started_at) {
      updateData.started_at = new Date().toISOString();
    }
    if (toStatus === 'Verified' || toStatus === 'Closed') {
      updateData.completed_at = new Date().toISOString();
    }
    if (toStatus === 'Verified') {
      updateData.verified_by = actorId;
      updateData.verified_by_name = actorName;
      updateData.verified_at = new Date().toISOString();
    }

    const { error: updateError } = await supabase
      .from('tasks')
      .update(updateData)
      .eq('id', taskId);

    if (updateError) {
      return { success: false, error: updateError.message };
    }

    // Record task event (§36) — immutable
    const eventType = mapToEventType(fromStatus, toStatus);
    await recordTaskEvent(
      taskId,
      task.project_id,
      eventType,
      fromStatus,
      toStatus,
      actorId,
      actorName,
      { remarks }
    );

    // Also write to legacy task_status_log for backward compatibility
    await supabase.from('task_status_log').insert({
      task_id: taskId,
      from_status: fromStatus,
      to_status: toStatus,
      changed_by: actorId,
      changed_by_name: actorName,
      remarks: remarks || null,
    });

    // Create blocker record if task is blocked (§20)
    if (toStatus === 'Blocked') {
      await supabase.from('blockers').insert({
        project_id: task.project_id,
        task_id: taskId,
        reported_by: actorId,
        reported_by_name: actorName,
        severity: 'Medium',
        reason: remarks || 'Task blocked',
        status: 'Open',
        organization_id: task.organization_id,
      });
    }

    // Resolve blocker if task is unblocked
    if (fromStatus === 'Blocked' && toStatus === 'In Progress') {
      await supabase
        .from('blockers')
        .update({
          status: 'Resolved',
          resolved_at: new Date().toISOString(),
          resolution: remarks || 'Task unblocked',
        })
        .eq('task_id', taskId)
        .eq('status', 'Open');
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Get task event history (§36)
 */
export async function getTaskEvents(taskId: string): Promise<TaskEvent[]> {
  const { data } = await supabase
    .from('task_events')
    .select('*')
    .eq('task_id', taskId)
    .order('created_at', { ascending: true });

  if (!data) return [];

  return data.map((e: any) => ({
    id: e.id,
    taskId: e.task_id,
    projectId: e.project_id,
    eventType: e.event_type,
    fromStatus: e.from_status,
    toStatus: e.to_status,
    actorId: e.actor_id,
    actorName: e.actor_name,
    metadata: e.metadata,
    createdAt: e.created_at,
  }));
}
