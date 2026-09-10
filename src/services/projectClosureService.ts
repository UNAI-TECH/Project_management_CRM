/**
 * Project Closure Service (§82–§83)
 * ===================================
 * Validates project closure readiness:
 * - Required documents approved
 * - Required features completed
 * - Open critical blockers = 0
 * - Unresolved critical bugs = 0
 * Creates immutable project closure snapshots.
 */

import { supabase } from '../lib/supabaseClient';
import type { ProjectSnapshot, SnapshotType } from '../types';

export interface ProjectClosureValidation {
  canClose: boolean;
  blockers: string[];
  warnings: string[];
  metrics: {
    totalDocuments: number;
    approvedDocuments: number;
    totalFeatures: number;
    completedFeatures: number;
    openBlockers: number;
    openCriticalBugs: number;
  };
}

/**
 * Validate project closure conditions (§82)
 */
export async function validateProjectClosure(
  projectId: string
): Promise<ProjectClosureValidation> {
  const blockers: string[] = [];
  const warnings: string[] = [];

  const [
    { data: docs },
    { data: features },
    { data: openBlockers },
    { data: openBugs },
  ] = await Promise.all([
    supabase.from('project_documents').select('name, status, phase').eq('project_id', projectId),
    supabase.from('project_features').select('name, status').eq('project_id', projectId),
    supabase.from('blockers').select('id, reason, severity').eq('project_id', projectId).eq('status', 'Open'),
    supabase.from('bugs').select('id, title, severity').eq('project_id', projectId).in('status', ['Open', 'In Progress', 'Reopened']),
  ]);

  const totalDocs = docs?.length || 0;
  const approvedDocs = docs?.filter((d: any) => d.status === 'Approved' || d.status === 'Locked').length || 0;

  const totalFeats = features?.length || 0;
  const completedFeats = features?.filter((f: any) => f.status === 'Verified').length || 0;

  const activeBlockers = openBlockers?.length || 0;
  const criticalBugs = openBugs?.filter((b: any) => b.severity === 'Critical').length || 0;

  // Rule 1: Open critical blockers must be 0
  if (activeBlockers > 0) {
    blockers.push(`There are ${activeBlockers} unresolved blocker(s). All blockers must be resolved before project closure.`);
  }

  // Rule 2: Unresolved critical bugs must be 0
  if (criticalBugs > 0) {
    blockers.push(`There are ${criticalBugs} open critical bug(s). All critical defects must be resolved.`);
  }

  // Rule 3: Key documents must be approved
  if (totalDocs > 0 && approvedDocs < totalDocs) {
    const unapprovedCount = totalDocs - approvedDocs;
    if (unapprovedCount > totalDocs * 0.3) {
      blockers.push(`${unapprovedCount} project documents are not approved yet.`);
    } else {
      warnings.push(`${unapprovedCount} document(s) have not reached Approved status.`);
    }
  }

  // Rule 4: Feature completion
  if (totalFeats > 0 && completedFeats < totalFeats) {
    warnings.push(`${totalFeats - completedFeats} out of ${totalFeats} features are not yet verified.`);
  }

  return {
    canClose: blockers.length === 0,
    blockers,
    warnings,
    metrics: {
      totalDocuments: totalDocs,
      approvedDocuments: approvedDocs,
      totalFeatures: totalFeats,
      completedFeatures: completedFeats,
      openBlockers: activeBlockers,
      openCriticalBugs: criticalBugs,
    },
  };
}

/**
 * Close a project and create immutable snapshot (§82, §83)
 */
export async function closeProject(
  projectId: string,
  closedBy: string,
  closedByName: string,
  organizationId: string
): Promise<{ success: boolean; snapshotId?: string; error?: string }> {
  try {
    // 1. Validate closure readiness
    const validation = await validateProjectClosure(projectId);
    if (!validation.canClose) {
      return {
        success: false,
        error: `Cannot close project: ${validation.blockers.join('; ')}`,
      };
    }

    // 2. Gather complete project snapshot data (§83)
    const [
      { data: project },
      { data: docs },
      { data: features },
      { data: tasks },
      { data: sprints },
      { data: testCases },
      { data: bugs },
      { data: members },
    ] = await Promise.all([
      supabase.from('projects').select('*').eq('id', projectId).single(),
      supabase.from('project_documents').select('*').eq('project_id', projectId),
      supabase.from('project_features').select('*').eq('project_id', projectId),
      supabase.from('tasks').select('*').eq('project_id', projectId),
      supabase.from('sprints').select('*').eq('project_id', projectId),
      supabase.from('test_cases').select('*').eq('project_id', projectId),
      supabase.from('bugs').select('*').eq('project_id', projectId),
      supabase.from('project_members').select('*').eq('project_id', projectId),
    ]);

    const snapshotData = {
      closedAt: new Date().toISOString(),
      closedBy,
      closedByName,
      project,
      documents: docs || [],
      features: features || [],
      tasks: tasks || [],
      sprints: sprints || [],
      testCases: testCases || [],
      bugs: bugs || [],
      members: members || [],
      validationSummary: validation.metrics,
    };

    // 3. Insert immutable Project Closure snapshot (§83)
    const { data: snapshot, error: snapError } = await supabase
      .from('project_snapshots')
      .insert({
        project_id: projectId,
        snapshot_type: 'Project Closure',
        snapshot_version: '1.0',
        snapshot_data: snapshotData,
        created_by: closedBy,
        created_by_name: closedByName,
        organization_id: organizationId,
      })
      .select()
      .single();

    if (snapError) {
      return { success: false, error: `Snapshot creation failed: ${snapError.message}` };
    }

    // 4. Update project record to Completed
    const { error: projError } = await supabase
      .from('projects')
      .update({
        status: 'Completed',
        lifecycle_phase: 'Release',
        progress: 100,
        actual_end_date: new Date().toISOString().split('T')[0],
        closed_at: new Date().toISOString(),
        closed_by: closedBy,
        updated_at: new Date().toISOString(),
      })
      .eq('id', projectId);

    if (projError) {
      return { success: false, error: projError.message };
    }

    // 5. Audit log
    await supabase.from('audit_log').insert({
      actor_id: closedBy,
      actor_name: closedByName,
      actor_role: 'CTO',
      action: 'Project Closed',
      entity_type: 'Project',
      entity_id: projectId,
      project_id: projectId,
      details: `Project "${project?.name}" officially closed. Immutable snapshot ID: ${snapshot?.id}`,
      metadata: { snapshotId: snapshot?.id },
      organization_id: organizationId,
    });

    return { success: true, snapshotId: snapshot?.id };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
