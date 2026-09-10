/**
 * Workflow Engine (§27–§29, §75–§79)
 * ====================================
 * Processes domain events and triggers automated actions.
 * Ensures idempotency via workflow_executions table.
 * 
 * Domain Events: DOCUMENT_APPROVED, FEATURE_CREATED, TASK_VERIFIED,
 *                SPRINT_CREATED, SPRINT_CLOSED, etc.
 */

import { supabase } from '../lib/supabaseClient';
import type { WorkflowExecution } from '../types';

// Domain event types (§75)
export type DomainEventType =
  | 'PROJECT_CREATED'
  | 'DOCUMENT_APPROVED'
  | 'REQUIREMENT_CREATED'
  | 'FEATURE_CREATED'
  | 'TASK_CREATED'
  | 'TASK_VERIFIED'
  | 'SPRINT_CREATED'
  | 'SPRINT_CLOSED'
  | 'TEST_EXECUTED'
  | 'BUG_CREATED'
  | 'CHANGE_REQUEST_APPROVED'
  | 'PROJECT_CLOSED'
  // CR Governance Events
  | 'CR_SUBMITTED'
  | 'CR_IMPACT_ANALYZED'
  | 'CR_ESCALATED'
  | 'CR_APPROVED'
  | 'CR_REJECTED'
  | 'CR_IMPLEMENTED'
  // Delegation Events
  | 'DELEGATION_PROPOSED'
  | 'DELEGATION_ACCEPTED'
  | 'DELEGATION_OVERRIDDEN'
  | 'DELEGATION_REASSIGNED'
  // Skill Profile Events
  | 'SKILL_PROFILE_UPDATED'
  | 'SKILL_OVERRIDE_APPLIED';

export interface DomainEvent {
  eventType: DomainEventType;
  projectId: string;
  entityType: string;
  entityId: string;
  versionId?: string;
  documentType?: string;
  actorId: string;
  actorName: string;
  actorRole: string;
  organizationId: string;
  payload?: Record<string, any>;
}

export interface WorkflowResult {
  success: boolean;
  executed: number;
  skipped: number;
  failed: number;
  details: Array<{
    ruleId: string;
    action: string;
    status: 'completed' | 'skipped' | 'failed';
    message: string;
    createdEntities?: Array<{ type: string; id: string; name: string }>;
  }>;
  error?: string;
}

/**
 * Generate a unique execution key for idempotency (§29)
 */
function generateExecutionKey(event: DomainEvent, ruleId: string): string {
  return `${event.eventType}:${event.projectId}:${event.entityId}:${event.versionId || 'latest'}:${ruleId}`;
}

/**
 * Check if a workflow has already been executed (§29)
 */
async function hasBeenExecuted(executionKey: string): Promise<boolean> {
  const { data } = await supabase
    .from('workflow_executions')
    .select('id')
    .eq('execution_key', executionKey)
    .limit(1);

  return (data?.length || 0) > 0;
}

/**
 * Record a workflow execution (§29)
 */
async function recordExecution(
  event: DomainEvent,
  ruleId: string,
  executionKey: string,
  status: 'Completed' | 'Failed' | 'Skipped',
  resultMetadata?: Record<string, any>
): Promise<void> {
  // Only link real rule ID from workflow_rules table, never pseudo IDs like 'built-in'
  const validRuleId =
    ruleId && ruleId !== 'built-in' && ruleId !== 'system' && !ruleId.startsWith('BUILTIN')
      ? ruleId
      : null;

  try {
    await supabase.from('workflow_executions').upsert(
      {
        event_type: event.eventType,
        source_entity_type: event.entityType,
        source_entity_id: event.entityId,
        workflow_rule_id: validRuleId,
        execution_key: executionKey,
        status,
        result_metadata: resultMetadata || {},
      },
      { onConflict: 'execution_key', ignoreDuplicates: true }
    );
  } catch (e) {
    console.warn('[WorkflowEngine] recordExecution notice:', e);
  }
}

/**
 * Safe audit logging for workflow events
 */
async function safeLogWorkflowAuditEvent(
  event: DomainEvent,
  action: string,
  details: string
): Promise<void> {
  try {
    let orgId = event.organizationId?.trim();
    if (!orgId) {
      if (event.projectId) {
        const { data: prj } = await supabase
          .from('projects')
          .select('organization_id')
          .eq('id', event.projectId)
          .maybeSingle();
        if (prj?.organization_id) {
          orgId = prj.organization_id;
        }
      }
    }

    if (!orgId) return;

    let safeActorId: string | null = null;
    if (event.actorId && event.actorId !== 'system') {
      const { data: emp } = await supabase
        .from('employees_cache')
        .select('employee_id')
        .eq('employee_id', event.actorId)
        .maybeSingle();
      if (emp) safeActorId = emp.employee_id;
    }

    await supabase.from('audit_log').insert({
      actor_id: safeActorId,
      actor_name: event.actorName || 'System',
      actor_role: event.actorRole || 'CTO',
      action,
      entity_type: event.entityType,
      entity_id: event.entityId,
      details,
      organization_id: orgId,
    });
  } catch (err) {
    console.warn('[WorkflowEngine] Safe audit log notice:', err);
  }
}

/**
 * Process a domain event through the workflow engine (§76)
 * 
 * Flow:
 *   Event → Find matching rules → Check idempotency → Execute actions → Record
 */
export async function processEvent(event: DomainEvent): Promise<WorkflowResult> {
  const result: WorkflowResult = {
    success: true,
    executed: 0,
    skipped: 0,
    failed: 0,
    details: [],
  };

  try {
    // 1. Find matching workflow rules (§28)
    const { data: rules } = await supabase
      .from('workflow_rules')
      .select('*')
      .eq('event_type', event.eventType)
      .eq('is_active', true)
      .or(`project_id.is.null,project_id.eq.${event.projectId}`)
      .order('sequence_order', { ascending: true });

    if (!rules || rules.length === 0) {
      // No rules — process built-in handlers
      const builtInResult = await processBuiltInHandlers(event);
      return builtInResult;
    }

    // 2. Execute each rule with idempotency check
    for (const rule of rules) {
      const executionKey = generateExecutionKey(event, rule.id);

      // Check idempotency (§29)
      if (await hasBeenExecuted(executionKey)) {
        result.skipped++;
        result.details.push({
          ruleId: rule.id,
          action: rule.action_type,
          status: 'skipped',
          message: 'Already executed (idempotency)',
        });
        continue;
      }

      try {
        // Execute the action
        const actionResult = await executeAction(rule, event);

        // Record execution
        await recordExecution(event, rule.id, executionKey, 'Completed', actionResult);

        result.executed++;
        result.details.push({
          ruleId: rule.id,
          action: rule.action_type,
          status: 'completed',
          message: `Action ${rule.action_type} completed successfully`,
          createdEntities: actionResult?.createdEntities || [],
        });
      } catch (actionError: any) {
        await recordExecution(event, rule.id, executionKey, 'Failed', {
          error: actionError.message,
        });

        result.failed++;
        result.details.push({
          ruleId: rule.id,
          action: rule.action_type,
          status: 'failed',
          message: actionError.message,
        });
      }
    }

    // Write audit event safely (§68)
    await safeLogWorkflowAuditEvent(
      event,
      `Workflow: ${event.eventType}`,
      `Workflow processed: ${result.executed} executed, ${result.skipped} skipped, ${result.failed} failed`
    );

    return result;
  } catch (err: any) {
    return {
      success: false,
      executed: result.executed,
      skipped: result.skipped,
      failed: result.failed + 1,
      details: result.details,
      error: err.message,
    };
  }
}

/**
 * Execute a workflow action (§76)
 */
async function executeAction(
  rule: any,
  event: DomainEvent
): Promise<any> {
  switch (rule.action_type) {
    case 'CREATE_TASK':
      return await createTaskFromRule(rule, event);
    case 'CREATE_FEATURE':
      return await createFeatureFromRule(rule, event);
    case 'UPDATE_STATUS':
      return await updateEntityStatus(rule, event);
    case 'CREATE_SNAPSHOT':
      return await createSnapshot(rule, event);
    case 'GENERATE_DELEGATION':
      return await handleGenerateDelegationAction(rule, event);
    case 'APPLY_CR_CHANGES':
      return await handleApplyCrChangesAction(rule, event);
    case 'SEND_NOTIFICATION':
      // Notification system — placeholder
      return { notified: true };
    default:
      throw new Error(`Unknown action type: ${rule.action_type}`);
  }
}

/**
 * Handle delegation proposal generation from a workflow rule
 */
async function handleGenerateDelegationAction(rule: any, event: DomainEvent): Promise<any> {
  try {
    const { delegationEngine } = await import('./delegationEngine');
    const { teamService } = await import('./teamService');
    const members = await teamService.getProjectMembers(event.projectId, event.organizationId);

    const proposals = await delegationEngine.generateDelegationProposals(
      { id: event.entityId, title: event.payload?.title, featureId: event.payload?.featureId },
      event.projectId,
      members,
      event.organizationId
    );

    return {
      delegationProposalsCount: proposals.length,
      topCandidate: proposals[0]?.candidateName || null,
      autoAssigned: proposals[0]?.isAutoAssigned || false,
    };
  } catch (err: any) {
    console.warn('[WorkflowEngine] handleGenerateDelegation notice:', err);
    return { error: err.message };
  }
}

/**
 * Handle applying CR changes when a CR is approved
 */
async function handleApplyCrChangesAction(rule: any, event: DomainEvent): Promise<any> {
  try {
    // If CR approved, ensure source documents / features reflect the change
    const { data: cr } = await supabase
      .from('change_requests')
      .select('*')
      .eq('id', event.entityId)
      .maybeSingle();

    if (cr?.source_document_id) {
      // Mark source doc for revision if needed
      await supabase
        .from('project_documents')
        .update({ status: 'In Progress', updated_at: new Date().toISOString() })
        .eq('id', cr.source_document_id);
    }

    return { applied: true, changeCode: cr?.change_code };
  } catch (err: any) {
    console.warn('[WorkflowEngine] handleApplyCrChanges notice:', err);
    return { error: err.message };
  }
}

/**
 * Create a task from a workflow rule template (§27)
 */
async function createTaskFromRule(rule: any, event: DomainEvent): Promise<any> {
  const template = rule.task_template || {};
  const taskId = `task-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;

  const { data, error } = await supabase
    .from('tasks')
    .insert({
      id: taskId,
      project_id: event.projectId,
      title: template.title || `Auto: ${event.eventType}`,
      description: template.description || `Generated by workflow rule`,
      task_type: template.task_type || 'feature_task',
      status: 'Open',
      priority: template.priority || 'Medium',
      generation_source: 'workflow_engine',
      generation_event: event.eventType,
      generation_rule_id: rule.id,
      source_document_id: event.entityType === 'Document' ? event.entityId : null,
      source_version_id: event.versionId || null,
      organization_id: event.organizationId,
    })
    .select()
    .single();

  if (error) throw error;

  // Create task event
  await supabase.from('task_events').insert({
    task_id: taskId,
    project_id: event.projectId,
    event_type: 'CREATED',
    to_status: 'Open',
    actor_id: event.actorId,
    actor_name: event.actorName,
    metadata: { source: 'workflow_engine', rule_id: rule.id },
  });

  return {
    createdEntities: [{ type: 'Task', id: taskId, name: data?.title || '' }],
  };
}

/**
 * Create a feature from a workflow rule (§78)
 */
async function createFeatureFromRule(rule: any, event: DomainEvent): Promise<any> {
  const template = rule.task_template || {};
  const featureId = `feat-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;

  const { data, error } = await supabase
    .from('project_features')
    .insert({
      id: featureId,
      project_id: event.projectId,
      name: template.name || `Auto Feature: ${event.eventType}`,
      description: template.description || '',
      status: 'Pending',
      organization_id: event.organizationId,
    })
    .select()
    .single();

  if (error) throw error;

  return {
    createdEntities: [{ type: 'Feature', id: featureId, name: data?.name || '' }],
  };
}

/**
 * Update entity status from a workflow rule
 */
async function updateEntityStatus(rule: any, event: DomainEvent): Promise<any> {
  const template = rule.task_template || {};
  const targetTable = template.target_table || event.entityType.toLowerCase() + 's';
  const newStatus = template.new_status || 'Ready';

  const { error } = await supabase
    .from(targetTable)
    .update({ status: newStatus, updated_at: new Date().toISOString() })
    .eq('id', event.entityId);

  if (error) throw error;

  return { updated: true, newStatus };
}

/**
 * Create a project or sprint snapshot (§23, §83)
 */
async function createSnapshot(rule: any, event: DomainEvent): Promise<any> {
  const template = rule.task_template || {};
  const snapshotType = template.snapshot_type || 'Milestone';

  // Gather snapshot data
  const snapshotData = await gatherSnapshotData(event.projectId);

  const { data, error } = await supabase
    .from('project_snapshots')
    .insert({
      project_id: event.projectId,
      snapshot_type: snapshotType,
      snapshot_data: snapshotData,
      created_by: event.actorId,
      created_by_name: event.actorName,
      organization_id: event.organizationId,
    })
    .select()
    .single();

  if (error) throw error;

  return {
    createdEntities: [{ type: 'Snapshot', id: data?.id || '', name: snapshotType }],
  };
}

/**
 * Gather all project data for a snapshot (§83)
 */
async function gatherSnapshotData(projectId: string): Promise<Record<string, any>> {
  const [
    { data: project },
    { data: features },
    { data: tasks },
    { data: documents },
    { data: members },
  ] = await Promise.all([
    supabase.from('projects').select('*').eq('id', projectId).single(),
    supabase.from('project_features').select('*').eq('project_id', projectId),
    supabase.from('tasks').select('*').eq('project_id', projectId),
    supabase.from('project_documents').select('id, doc_type, name, status, version, completion').eq('project_id', projectId),
    supabase.from('project_members').select('*').eq('project_id', projectId),
  ]);

  return {
    capturedAt: new Date().toISOString(),
    project,
    features: features || [],
    tasks: tasks || [],
    documents: documents || [],
    members: members || [],
    metrics: {
      totalTasks: tasks?.length || 0,
      completedTasks: tasks?.filter((t: any) => t.status === 'Verified' || t.status === 'Closed').length || 0,
      blockedTasks: tasks?.filter((t: any) => t.status === 'Blocked').length || 0,
      totalFeatures: features?.length || 0,
      completedFeatures: features?.filter((f: any) => f.status === 'Verified').length || 0,
    },
  };
}

/**
 * Built-in event handlers for common patterns (§77, §78)
 * These run when no custom workflow rules are defined
 */
async function processBuiltInHandlers(event: DomainEvent): Promise<WorkflowResult> {
  const result: WorkflowResult = {
    success: true,
    executed: 0,
    skipped: 0,
    failed: 0,
    details: [],
  };

  const builtInKey = `BUILTIN:${event.eventType}:${event.projectId}:${event.entityId}:${event.versionId || 'latest'}`;

  if (await hasBeenExecuted(builtInKey)) {
    result.skipped = 1;
    result.details.push({
      ruleId: 'built-in',
      action: event.eventType,
      status: 'skipped',
      message: 'Built-in handler already executed (idempotency)',
    });
    return result;
  }

  // Record that we processed this event
  await recordExecution(event, 'built-in', builtInKey, 'Completed', {
    handler: 'built-in',
  });

  // Write audit event safely
  await safeLogWorkflowAuditEvent(
    event,
    `Event: ${event.eventType}`,
    `Domain event processed: ${event.eventType}`
  );

  result.executed = 1;
  result.details.push({
    ruleId: 'built-in',
    action: event.eventType,
    status: 'completed',
    message: 'Built-in handler executed',
  });

  return result;
}
