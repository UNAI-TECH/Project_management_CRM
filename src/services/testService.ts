/**
 * Testing Service (§32–§33, §112, §114)
 * ========================================
 * Manages test cases and historical test executions:
 * - Test cases linked to requirements, features, and tasks
 * - Immutable execution history (Not Run, Passed, Failed, Blocked, Skipped)
 * - Testing progress & metrics
 */

import { supabase } from '../lib/supabaseClient';
import type { TestCase, TestCaseStatus, TestExecution, Priority } from '../types';

export async function createTestCase(params: {
  projectId: string;
  testCaseCode?: string;
  requirementId?: string;
  featureId?: string;
  module?: string;
  description: string;
  preconditions?: string;
  steps?: Array<{ step: number; action: string; expected: string }>;
  expectedResult?: string;
  priority?: Priority;
  createdBy?: string;
  createdByName?: string;
  organizationId: string;
}): Promise<{ success: boolean; testCase?: TestCase; error?: string }> {
  try {
    let code = params.testCaseCode;
    if (!code) {
      const { data } = await supabase
        .from('test_cases')
        .select('test_case_code')
        .eq('project_id', params.projectId);

      const count = (data?.length || 0) + 1;
      code = `TC-${String(count).padStart(3, '0')}`;
    }

    const { data, error } = await supabase
      .from('test_cases')
      .insert({
        project_id: params.projectId,
        test_case_code: code,
        requirement_id: params.requirementId || null,
        feature_id: params.featureId || null,
        module: params.module || null,
        description: params.description,
        preconditions: params.preconditions || null,
        steps: params.steps || [],
        expected_result: params.expectedResult || null,
        priority: params.priority || 'Medium',
        status: 'Not Run',
        created_by: params.createdBy || null,
        created_by_name: params.createdByName || null,
        organization_id: params.organizationId,
      })
      .select()
      .single();

    if (error) return { success: false, error: error.message };
    return { success: true, testCase: mapTestCaseFromDb(data) };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function getProjectTestCases(
  projectId: string,
  filter?: { requirementId?: string; featureId?: string; status?: TestCaseStatus }
): Promise<TestCase[]> {
  let query = supabase
    .from('test_cases')
    .select('*')
    .eq('project_id', projectId)
    .eq('is_deleted', false);

  if (filter?.requirementId) query = query.eq('requirement_id', filter.requirementId);
  if (filter?.featureId) query = query.eq('feature_id', filter.featureId);
  if (filter?.status) query = query.eq('status', filter.status);

  const { data } = await query.order('test_case_code', { ascending: true });
  return (data || []).map(mapTestCaseFromDb);
}

export async function linkTaskToTestCase(
  taskId: string,
  testCaseId: string
): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase
    .from('task_test_cases')
    .upsert({ task_id: taskId, test_case_id: testCaseId }, { onConflict: 'task_id,test_case_id' });

  return error ? { success: false, error: error.message } : { success: true };
}

/**
 * Record a historical test execution (§33)
 * Updates the test case status and logs execution
 */
export async function recordTestExecution(params: {
  testCaseId: string;
  executedBy?: string;
  executedByName?: string;
  environment?: string;
  actualResult?: string;
  status: TestCaseStatus;
  remarks?: string;
  evidence?: any[];
}): Promise<{ success: boolean; execution?: TestExecution; error?: string }> {
  try {
    // 1. Insert execution record
    const { data, error } = await supabase
      .from('test_executions')
      .insert({
        test_case_id: params.testCaseId,
        executed_by: params.executedBy || null,
        executed_by_name: params.executedByName || null,
        environment: params.environment || 'Testing',
        actual_result: params.actualResult || null,
        status: params.status,
        remarks: params.remarks || null,
        evidence: params.evidence || [],
      })
      .select()
      .single();

    if (error) return { success: false, error: error.message };

    // 2. Update test case status
    await supabase
      .from('test_cases')
      .update({
        status: params.status,
        updated_at: new Date().toISOString(),
      })
      .eq('id', params.testCaseId);

    return {
      success: true,
      execution: {
        id: data.id,
        testCaseId: data.test_case_id,
        executedBy: data.executed_by,
        executedByName: data.executed_by_name,
        executedAt: data.executed_at,
        environment: data.environment,
        actualResult: data.actual_result,
        status: data.status,
        remarks: data.remarks,
        evidence: data.evidence || [],
      },
    };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function getTestCaseExecutions(testCaseId: string): Promise<TestExecution[]> {
  const { data } = await supabase
    .from('test_executions')
    .select('*')
    .eq('test_case_id', testCaseId)
    .order('executed_at', { ascending: false });

  return (data || []).map((e: any) => ({
    id: e.id,
    testCaseId: e.test_case_id,
    executedBy: e.executed_by,
    executedByName: e.executed_by_name,
    executedAt: e.executed_at,
    environment: e.environment,
    actualResult: e.actual_result,
    status: e.status,
    remarks: e.remarks,
    evidence: e.evidence || [],
  }));
}

function mapTestCaseFromDb(d: any): TestCase {
  return {
    id: d.id,
    projectId: d.project_id,
    testCaseCode: d.test_case_code,
    requirementId: d.requirement_id,
    featureId: d.feature_id,
    module: d.module,
    description: d.description,
    preconditions: d.preconditions,
    steps: d.steps || [],
    expectedResult: d.expected_result,
    priority: d.priority || 'Medium',
    status: d.status || 'Not Run',
    createdBy: d.created_by,
    createdByName: d.created_by_name,
    organizationId: d.organization_id,
    isDeleted: d.is_deleted || false,
    createdAt: d.created_at,
    updatedAt: d.updated_at,
  };
}
