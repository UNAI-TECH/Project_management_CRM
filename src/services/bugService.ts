/**
 * Bug / Defect Service (§34)
 * ===========================
 * Tracks defects and quality metrics:
 * - Bugs linked to features, requirements, test cases, tasks, and sprints
 * - Defect severity, priority, and resolution tracking
 */

import { supabase } from '../lib/supabaseClient';
import type { Bug, BugStatus, Priority, RiskSeverity } from '../types';

export async function createBug(params: {
  projectId: string;
  bugCode?: string;
  title: string;
  description?: string;
  severity?: RiskSeverity;
  priority?: Priority;
  reportedBy?: string;
  reportedByName?: string;
  assignedTo?: string;
  assignedToName?: string;
  featureId?: string;
  requirementId?: string;
  testCaseId?: string;
  organizationId: string;
}): Promise<{ success: boolean; bug?: Bug; error?: string }> {
  try {
    let code = params.bugCode;
    if (!code) {
      const { data } = await supabase
        .from('bugs')
        .select('bug_code')
        .eq('project_id', params.projectId);

      const count = (data?.length || 0) + 1;
      code = `BUG-${String(count).padStart(3, '0')}`;
    }

    const { data, error } = await supabase
      .from('bugs')
      .insert({
        project_id: params.projectId,
        bug_code: code,
        title: params.title,
        description: params.description || null,
        severity: params.severity || 'Medium',
        priority: params.priority || 'Medium',
        reported_by: params.reportedBy || null,
        reported_by_name: params.reportedByName || null,
        assigned_to: params.assignedTo || null,
        assigned_to_name: params.assignedToName || null,
        feature_id: params.featureId || null,
        requirement_id: params.requirementId || null,
        test_case_id: params.testCaseId || null,
        status: 'Open',
        organization_id: params.organizationId,
      })
      .select()
      .single();

    if (error) return { success: false, error: error.message };
    return { success: true, bug: mapBugFromDb(data) };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function getProjectBugs(
  projectId: string,
  filter?: { status?: BugStatus; severity?: RiskSeverity; assignedTo?: string }
): Promise<Bug[]> {
  let query = supabase
    .from('bugs')
    .select('*')
    .eq('project_id', projectId)
    .eq('is_deleted', false);

  if (filter?.status) query = query.eq('status', filter.status);
  if (filter?.severity) query = query.eq('severity', filter.severity);
  if (filter?.assignedTo) query = query.eq('assigned_to', filter.assignedTo);

  const { data } = await query.order('reported_at', { ascending: false });
  return (data || []).map(mapBugFromDb);
}

export async function updateBugStatus(
  bugId: string,
  status: BugStatus,
  resolution?: string,
  rootCause?: string
): Promise<{ success: boolean; error?: string }> {
  const updateData: Record<string, any> = {
    status,
    updated_at: new Date().toISOString(),
  };

  if (status === 'Resolved') {
    updateData.resolved_at = new Date().toISOString();
    if (resolution) updateData.resolution = resolution;
    if (rootCause) updateData.root_cause = rootCause;
  }
  if (status === 'Verified') {
    updateData.verified_at = new Date().toISOString();
  }

  const { error } = await supabase
    .from('bugs')
    .update(updateData)
    .eq('id', bugId);

  return error ? { success: false, error: error.message } : { success: true };
}

function mapBugFromDb(d: any): Bug {
  return {
    id: d.id,
    projectId: d.project_id,
    bugCode: d.bug_code,
    title: d.title,
    description: d.description,
    severity: d.severity || 'Medium',
    priority: d.priority || 'Medium',
    reportedBy: d.reported_by,
    reportedByName: d.reported_by_name,
    assignedTo: d.assigned_to,
    assignedToName: d.assigned_to_name,
    featureId: d.feature_id,
    requirementId: d.requirement_id,
    testCaseId: d.test_case_id,
    status: d.status || 'Open',
    rootCause: d.root_cause,
    resolution: d.resolution,
    reportedAt: d.reported_at,
    resolvedAt: d.resolved_at,
    verifiedAt: d.verified_at,
    organizationId: d.organization_id,
    isDeleted: d.is_deleted || false,
    createdAt: d.created_at,
    updatedAt: d.updated_at,
  };
}
