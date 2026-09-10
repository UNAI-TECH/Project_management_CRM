/**
 * Requirement Service (§14–§15, §17, §30, §58, §101)
 * ====================================================
 * Manages first-class requirement entities with permanent IDs:
 * - Types: Business, Functional, Non-Functional, Technical, UX, Security, Compliance
 * - Traceability: BRD -> SRS -> Features -> Tasks -> Tests
 * - Coverage metrics calculation (§101)
 */

import { supabase } from '../lib/supabaseClient';
import type { Requirement, RequirementType, Priority, RequirementStatus } from '../types';

export interface RequirementCoverageMetrics {
  total: number;
  linkedToFeatures: number;
  linkedToTasks: number;
  verifiedTasks: number;
  linkedToTests: number;
  passedTests: number;
  coveragePercentage: number;
}

export interface TraceabilityNode {
  requirement: Requirement;
  parentRequirements: Requirement[];
  childRequirements: Requirement[];
  features: Array<{ id: string; name: string; status: string }>;
  tasks: Array<{ id: string; title: string; status: string; assignedToName?: string; actualHours?: number }>;
  testCases: Array<{ id: string; code: string; status: string }>;
}

/**
 * Generate sequential requirement code (e.g. SRS-FR-001)
 */
export async function generateRequirementCode(
  projectId: string,
  prefix: string = 'REQ'
): Promise<string> {
  try {
    const { data } = await supabase
      .from('requirements')
      .select('requirement_code')
      .eq('project_id', projectId)
      .like('requirement_code', `${prefix}-%`);

    let maxNum = 0;
    if (data && data.length > 0) {
      for (const item of data) {
        const parts = item.requirement_code.split('-');
        const lastPart = parts[parts.length - 1];
        const num = parseInt(lastPart, 10);
        if (!isNaN(num) && num > maxNum) {
          maxNum = num;
        }
      }
    }

    return `${prefix}-${String(maxNum + 1).padStart(3, '0')}`;
  } catch {
    return `${prefix}-${Date.now().toString().slice(-4)}`;
  }
}

/**
 * Create a new requirement (§14)
 */
export async function createRequirement(params: {
  projectId: string;
  documentId?: string;
  requirementCode?: string;
  requirementType: RequirementType;
  title: string;
  description?: string;
  priority?: Priority;
  source?: string;
  acceptanceCriteria?: string;
  createdBy?: string;
  createdByName?: string;
  organizationId: string;
}): Promise<{ success: boolean; requirement?: Requirement; error?: string }> {
  try {
    let code = params.requirementCode;
    if (!code) {
      const prefixMap: Record<RequirementType, string> = {
        Business: 'BRD-REQ',
        Functional: 'SRS-FR',
        'Non-Functional': 'SRS-NFR',
        Technical: 'TECH-REQ',
        UX: 'UX-REQ',
        Security: 'SEC-REQ',
        Compliance: 'COMP-REQ',
      };
      code = await generateRequirementCode(params.projectId, prefixMap[params.requirementType] || 'REQ');
    }

    const { data, error } = await supabase
      .from('requirements')
      .insert({
        project_id: params.projectId,
        document_id: params.documentId || null,
        requirement_code: code,
        requirement_type: params.requirementType,
        title: params.title,
        description: params.description || null,
        priority: params.priority || 'Medium',
        source: params.source || null,
        acceptance_criteria: params.acceptanceCriteria || null,
        status: 'Draft',
        version: '1.0',
        created_by: params.createdBy || null,
        created_by_name: params.createdByName || null,
        organization_id: params.organizationId,
      })
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, requirement: mapRequirementFromDb(data) };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Fetch requirements for a project
 */
export async function getProjectRequirements(
  projectId: string,
  filter?: { documentId?: string; requirementType?: RequirementType; status?: RequirementStatus }
): Promise<Requirement[]> {
  let query = supabase
    .from('requirements')
    .select('*')
    .eq('project_id', projectId)
    .eq('is_deleted', false);

  if (filter?.documentId) {
    query = query.eq('document_id', filter.documentId);
  }
  if (filter?.requirementType) {
    query = query.eq('requirement_type', filter.requirementType);
  }
  if (filter?.status) {
    query = query.eq('status', filter.status);
  }

  const { data } = await query.order('requirement_code', { ascending: true });
  return (data || []).map(mapRequirementFromDb);
}

/**
 * Link requirements (e.g. BRD -> SRS) (§15)
 */
export async function linkRequirements(
  sourceRequirementId: string,
  targetRequirementId: string,
  relationshipType: string = 'derived_from'
): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase
    .from('requirement_relationships')
    .upsert(
      {
        source_requirement_id: sourceRequirementId,
        target_requirement_id: targetRequirementId,
        relationship_type: relationshipType,
      },
      { onConflict: 'source_requirement_id,target_requirement_id,relationship_type' }
    );

  return error ? { success: false, error: error.message } : { success: true };
}

/**
 * Link requirement to feature (§17)
 */
export async function linkRequirementToFeature(
  requirementId: string,
  featureId: string
): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase
    .from('requirement_features')
    .upsert(
      {
        requirement_id: requirementId,
        feature_id: featureId,
        relationship_type: 'implements',
      },
      { onConflict: 'requirement_id,feature_id' }
    );

  return error ? { success: false, error: error.message } : { success: true };
}

/**
 * Link requirement to task (§30)
 */
export async function linkRequirementToTask(
  requirementId: string,
  taskId: string
): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase
    .from('requirement_tasks')
    .upsert(
      {
        requirement_id: requirementId,
        task_id: taskId,
        relationship_type: 'implements',
      },
      { onConflict: 'requirement_id,task_id' }
    );

  return error ? { success: false, error: error.message } : { success: true };
}

/**
 * Get complete end-to-end traceability for a requirement (§58, §114)
 */
export async function getRequirementTraceability(
  requirementId: string
): Promise<TraceabilityNode | null> {
  try {
    const { data: req } = await supabase
      .from('requirements')
      .select('*')
      .eq('id', requirementId)
      .single();

    if (!req) return null;

    // Upstream (parents)
    const { data: parentRels } = await supabase
      .from('requirement_relationships')
      .select('source_requirement_id, requirements!requirement_relationships_source_requirement_id_fkey(*)')
      .eq('target_requirement_id', requirementId);

    // Downstream (children)
    const { data: childRels } = await supabase
      .from('requirement_relationships')
      .select('target_requirement_id, requirements!requirement_relationships_target_requirement_id_fkey(*)')
      .eq('source_requirement_id', requirementId);

    // Linked features
    const { data: featRels } = await supabase
      .from('requirement_features')
      .select('feature_id, project_features(*)')
      .eq('requirement_id', requirementId);

    // Linked tasks
    const { data: taskRels } = await supabase
      .from('requirement_tasks')
      .select('task_id, tasks(id, title, status, assigned_to_name, actual_hours)')
      .eq('requirement_id', requirementId);

    // Linked test cases
    const { data: testCases } = await supabase
      .from('test_cases')
      .select('id, test_case_code, status')
      .eq('requirement_id', requirementId);

    return {
      requirement: mapRequirementFromDb(req),
      parentRequirements: (parentRels || []).map((r: any) => mapRequirementFromDb(r.requirements)).filter(Boolean),
      childRequirements: (childRels || []).map((r: any) => mapRequirementFromDb(r.requirements)).filter(Boolean),
      features: (featRels || []).map((f: any) => ({
        id: f.feature_id,
        name: f.project_features?.name || 'Feature',
        status: f.project_features?.status || 'Pending',
      })),
      tasks: (taskRels || []).map((t: any) => ({
        id: t.task_id,
        title: t.tasks?.title || 'Task',
        status: t.tasks?.status || 'Open',
        assignedToName: t.tasks?.assigned_to_name,
        actualHours: t.tasks?.actual_hours,
      })),
      testCases: (testCases || []).map((tc: any) => ({
        id: tc.id,
        code: tc.test_case_code,
        status: tc.status,
      })),
    };
  } catch {
    return null;
  }
}

/**
 * Calculate requirement coverage metrics for a project (§101)
 */
export async function calculateRequirementCoverage(
  projectId: string
): Promise<RequirementCoverageMetrics> {
  try {
    const { data: reqs } = await supabase
      .from('requirements')
      .select('id')
      .eq('project_id', projectId)
      .eq('is_deleted', false);

    const total = reqs?.length || 0;
    if (total === 0) {
      return {
        total: 0,
        linkedToFeatures: 0,
        linkedToTasks: 0,
        verifiedTasks: 0,
        linkedToTests: 0,
        passedTests: 0,
        coveragePercentage: 0,
      };
    }

    const reqIds = reqs!.map((r: any) => r.id);

    const [
      { data: featRels },
      { data: taskRels },
      { data: testCases },
    ] = await Promise.all([
      supabase.from('requirement_features').select('requirement_id').in('requirement_id', reqIds),
      supabase.from('requirement_tasks').select('requirement_id, tasks(status)').in('requirement_id', reqIds),
      supabase.from('test_cases').select('requirement_id, status').in('requirement_id', reqIds),
    ]);

    const uniqueFeatReqs = new Set((featRels || []).map((r: any) => r.requirement_id));
    const uniqueTaskReqs = new Set((taskRels || []).map((r: any) => r.requirement_id));
    const verifiedTasksCount = (taskRels || []).filter((r: any) => r.tasks?.status === 'Verified').length;
    const uniqueTestReqs = new Set((testCases || []).map((tc: any) => tc.requirement_id));
    const passedTestsCount = (testCases || []).filter((tc: any) => tc.status === 'Passed').length;

    const coveragePercentage = total > 0 ? Math.round((uniqueTaskReqs.size / total) * 100) : 0;

    return {
      total,
      linkedToFeatures: uniqueFeatReqs.size,
      linkedToTasks: uniqueTaskReqs.size,
      verifiedTasks: verifiedTasksCount,
      linkedToTests: uniqueTestReqs.size,
      passedTests: passedTestsCount,
      coveragePercentage,
    };
  } catch {
    return {
      total: 0,
      linkedToFeatures: 0,
      linkedToTasks: 0,
      verifiedTasks: 0,
      linkedToTests: 0,
      passedTests: 0,
      coveragePercentage: 0,
    };
  }
}

function mapRequirementFromDb(d: any): Requirement {
  return {
    id: d.id,
    projectId: d.project_id,
    documentId: d.document_id,
    requirementCode: d.requirement_code,
    requirementType: d.requirement_type,
    title: d.title,
    description: d.description,
    priority: d.priority || 'Medium',
    source: d.source,
    acceptanceCriteria: d.acceptance_criteria,
    status: d.status || 'Draft',
    version: d.version || '1.0',
    createdBy: d.created_by,
    createdByName: d.created_by_name,
    approvedBy: d.approved_by,
    approvedByName: d.approved_by_name,
    approvedAt: d.approved_at,
    organizationId: d.organization_id,
    isDeleted: d.is_deleted || false,
    createdAt: d.created_at,
    updatedAt: d.updated_at,
  };
}
