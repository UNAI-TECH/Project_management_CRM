/**
 * Change Request (CR) Governance Service (§CR Governance)
 * ========================================================
 * Implements automated Impact Analysis, Tiered Approval Routing (PM vs CTO),
 * Traceability Graph generation, and Approval Ledger.
 * 
 * Rules:
 * - PM has final approval authority for normal operational changes.
 * - CTO approval is mandatory if:
 *     1. Budget Impact % exceeds threshold (e.g. > 15%)
 *     2. Timeline Delay exceeds threshold (e.g. > 14 days)
 *     3. Architecture / System Document (#7 ARCH) is modified
 *     4. Effort Redistribution exceeds threshold (e.g. > 30%)
 * - Traceability connects CR -> Affected Documents -> Features -> Tasks -> Team Allocations.
 */

import { supabaseClient } from '../lib/supabaseClient';
import type { 
  ChangeRequest, 
  CRImpactAnalysis, 
  CRApprovalDecision, 
  CRType, 
  CRSeverity, 
  UserRole, 
  GovernanceConfig 
} from '../types';
import { DOCUMENT_DEPENDENCY_GRAPH } from '../constants/documentDependencyGraph';
import { DEFAULT_GOVERNANCE_THRESHOLDS } from '../constants/governanceDefaults';
import { processEvent } from './workflowEngine';

export interface SubmitCRPayload {
  projectId: string;
  title: string;
  description: string;
  reason: string;
  crType: CRType;
  severity: CRSeverity;
  sourceDocumentId?: string;
  sourceVersionId?: string;
  budgetImpactAmount?: number;
  budgetImpactPct?: number;
  timelineImpactDays?: number;
  effortSplitRatio?: number;
  affectedFeatureIds?: string[];
  affectedTaskIds?: string[];
}

export const crGovernanceService = {
  /**
   * Load governance thresholds from DB or fallback to defaults
   */
  async getGovernanceThresholds(orgId: string = 'org-unai') {
    try {
      const { data } = await supabaseClient
        .from('governance_config')
        .select('*')
        .eq('organization_id', orgId);

      const configMap = new Map<string, any>();
      (data || []).forEach((c) => configMap.set(c.config_key, c.config_value));

      return {
        budgetPct: Number(configMap.get('CR_BUDGET_THRESHOLD_PCT') ?? DEFAULT_GOVERNANCE_THRESHOLDS.budgetImpactPctThreshold),
        timelineDays: Number(configMap.get('CR_TIMELINE_THRESHOLD_DAYS') ?? DEFAULT_GOVERNANCE_THRESHOLDS.timelineImpactDaysThreshold),
        effortSplit: Number(configMap.get('CR_EFFORT_SPLIT_THRESHOLD') ?? DEFAULT_GOVERNANCE_THRESHOLDS.effortSplitRatioThreshold),
      };
    } catch {
      return {
        budgetPct: DEFAULT_GOVERNANCE_THRESHOLDS.budgetImpactPctThreshold,
        timelineDays: DEFAULT_GOVERNANCE_THRESHOLDS.timelineImpactDaysThreshold,
        effortSplit: DEFAULT_GOVERNANCE_THRESHOLDS.effortSplitRatioThreshold,
      };
    }
  },

  /**
   * Submit a Change Request and automatically run Impact Analysis & Authority Determination
   */
  async submitChangeRequest(
    payload: SubmitCRPayload,
    actorId: string,
    actorName: string,
    actorRole: UserRole,
    orgId: string = 'org-unai'
  ): Promise<ChangeRequest> {
    const crId = `cr-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
    const changeCode = `CR-${Date.now().toString().slice(-4)}`;

    // 1. Initial Insert
    const newCrRow = {
      id: crId,
      project_id: payload.projectId,
      change_code: changeCode,
      title: payload.title,
      description: payload.description,
      reason: payload.reason,
      cr_type: payload.crType,
      severity: payload.severity,
      requested_by: actorId,
      requested_by_name: actorName,
      status: 'Impact Analysis',
      requires_cto_approval: false,
      source_document_id: payload.sourceDocumentId || null,
      source_version_id: payload.sourceVersionId || null,
      affected_feature_ids: payload.affectedFeatureIds || [],
      affected_task_ids: payload.affectedTaskIds || [],
      budget_impact_amount: payload.budgetImpactAmount || 0,
      budget_impact_pct: payload.budgetImpactPct || 0,
      timeline_impact_days: payload.timelineImpactDays || 0,
      effort_split_ratio: payload.effortSplitRatio || 0,
      organization_id: orgId,
    };

    const { data: insertedCr, error: insertErr } = await supabaseClient
      .from('change_requests')
      .insert(newCrRow)
      .select()
      .single();

    if (insertErr) {
      console.error('[CRGovernanceService] Error inserting change request:', insertErr);
      throw insertErr;
    }

    // 2. Automated Impact Analysis & Authority Determination
    const impact = await this.runImpactAnalysis(crId, payload, actorId, orgId);

    // 3. Update CR with final routing status
    const targetStatus = impact.requiresCtoApproval ? 'Escalated to CTO' : 'Under Review';
    const { data: updatedCr, error: updateErr } = await supabaseClient
      .from('change_requests')
      .update({
        status: targetStatus,
        requires_cto_approval: impact.requiresCtoApproval,
        affected_feature_ids: impact.affectedFeatureIds,
        affected_task_ids: impact.affectedTaskIds,
        updated_at: new Date().toISOString(),
      })
      .eq('id', crId)
      .select()
      .single();

    if (updateErr) throw updateErr;

    // 4. Emit domain event via Workflow Engine (§75)
    try {
      await processEvent({
        eventType: impact.requiresCtoApproval ? 'CR_ESCALATED' : 'CR_SUBMITTED',
        projectId: payload.projectId,
        entityType: 'ChangeRequest',
        entityId: crId,
        actorId,
        actorName,
        actorRole,
        organizationId: orgId,
        payload: {
          changeCode,
          title: payload.title,
          requiresCtoApproval: impact.requiresCtoApproval,
          escalationReasons: impact.escalationReasons,
          riskScore: impact.riskScore,
        },
      });
    } catch (wfErr) {
      console.warn('[CRGovernanceService] Workflow event emit notice:', wfErr);
    }

    return this.mapDbRowToCR(updatedCr);
  },

  /**
   * Run automated Impact Analysis
   * Gathers affected documents, features, tasks, calculates risk score and escalation rules.
   */
  async runImpactAnalysis(
    crId: string,
    payload: Partial<SubmitCRPayload>,
    analystId?: string,
    orgId: string = 'org-unai'
  ): Promise<CRImpactAnalysis> {
    const projectId = payload.projectId || '';
    const affectedDocIds: string[] = [];
    const affectedFeatureIds: string[] = [...(payload.affectedFeatureIds || [])];
    const affectedTaskIds: string[] = [...(payload.affectedTaskIds || [])];
    const escalationReasons: string[] = [];

    // 1. Check Source Document & Downstream Document DAG
    let isArchDocModified = false;
    if (payload.sourceDocumentId) {
      affectedDocIds.push(payload.sourceDocumentId);

      const { data: srcDoc } = await supabaseClient
        .from('project_documents')
        .select('doc_type, name')
        .eq('id', payload.sourceDocumentId)
        .maybeSingle();

      if (srcDoc) {
        if (srcDoc.doc_type === 7) {
          isArchDocModified = true;
          escalationReasons.push('Architecture Document (#7 ARCH) modification requires CTO Approval');
        }

        // Trace downstream dependencies in DAG
        Object.entries(DOCUMENT_DEPENDENCY_GRAPH).forEach(([tId, node]) => {
          if (node.requiredDocs.includes(srcDoc.doc_type)) {
            // Downstream template impacted
            affectedDocIds.push(`template-${tId}`);
          }
        });
      }
    }

    // 2. Fetch associated features & tasks if not explicitly provided
    if (affectedFeatureIds.length === 0 && projectId) {
      const { data: feats } = await supabaseClient
        .from('project_features')
        .select('id, name')
        .eq('project_id', projectId)
        .limit(3);
      (feats || []).forEach((f) => affectedFeatureIds.push(f.id));
    }

    if (affectedTaskIds.length === 0 && affectedFeatureIds.length > 0) {
      const { data: tasks } = await supabaseClient
        .from('tasks')
        .select('id')
        .in('feature_id', affectedFeatureIds)
        .limit(5);
      (tasks || []).forEach((t) => affectedTaskIds.push(t.id));
    }

    // 3. Threshold Evaluation
    const thresholds = await this.getGovernanceThresholds(orgId);
    const budgetPct = Number(payload.budgetImpactPct || 0);
    const timelineDays = Number(payload.timelineImpactDays || 0);
    const effortSplit = Number(payload.effortSplitRatio || 0);

    if (budgetPct >= thresholds.budgetPct) {
      escalationReasons.push(`Budget impact (${budgetPct}%) exceeds threshold of ${thresholds.budgetPct}%`);
    }

    if (timelineDays >= thresholds.timelineDays) {
      escalationReasons.push(`Timeline impact (${timelineDays} days) exceeds threshold of ${thresholds.timelineDays} days`);
    }

    if (effortSplit >= thresholds.effortSplit) {
      escalationReasons.push(`Effort reallocation (${Math.round(effortSplit * 100)}%) exceeds threshold of ${Math.round(thresholds.effortSplit * 100)}%`);
    }

    const requiresCto = escalationReasons.length > 0 || isArchDocModified;

    // 4. Calculate Risk Score (0 - 100)
    let riskScore = 20; // Base baseline
    if (payload.severity === 'Critical') riskScore += 40;
    else if (payload.severity === 'High') riskScore += 25;
    else if (payload.severity === 'Medium') riskScore += 10;

    if (budgetPct > 10) riskScore += Math.min(20, budgetPct);
    if (timelineDays > 7) riskScore += Math.min(20, timelineDays * 2);
    if (isArchDocModified) riskScore += 20;
    riskScore = Math.min(100, riskScore);

    const analysisRecord: CRImpactAnalysis = {
      id: `ia-${crId}-${Date.now().toString(36)}`,
      changeRequestId: crId,
      projectId,
      analyzedAt: new Date().toISOString(),
      analyzedBy: analystId,
      affectedDocumentIds: Array.from(new Set(affectedDocIds)),
      affectedFeatureIds: Array.from(new Set(affectedFeatureIds)),
      affectedTaskIds: Array.from(new Set(affectedTaskIds)),
      budgetDelta: Number(payload.budgetImpactAmount || 0),
      timelineDeltaDays: timelineDays,
      riskScore,
      requiresCtoApproval: requiresCto,
      escalationReasons,
      traceabilityGraph: {
        crId,
        sourceDocId: payload.sourceDocumentId,
        affectedDocCount: affectedDocIds.length,
        affectedFeatureCount: affectedFeatureIds.length,
        affectedTaskCount: affectedTaskIds.length,
      },
      organizationId: orgId,
    };

    // Save impact analysis in DB
    try {
      await supabaseClient.from('cr_impact_analysis').insert({
        id: analysisRecord.id,
        change_request_id: analysisRecord.changeRequestId,
        project_id: analysisRecord.projectId,
        analyzed_by: analysisRecord.analyzedBy,
        affected_document_ids: analysisRecord.affectedDocumentIds,
        affected_feature_ids: analysisRecord.affectedFeatureIds,
        affected_task_ids: analysisRecord.affectedTaskIds,
        budget_delta: analysisRecord.budgetDelta,
        timeline_delta_days: analysisRecord.timelineDeltaDays,
        risk_score: analysisRecord.riskScore,
        requires_cto_approval: analysisRecord.requiresCtoApproval,
        escalation_reasons: analysisRecord.escalationReasons,
        traceability_graph: analysisRecord.traceabilityGraph,
        organization_id: analysisRecord.organizationId,
      });
    } catch (iaErr) {
      console.warn('[CRGovernanceService] Notice saving impact analysis:', iaErr);
    }

    return analysisRecord;
  },

  /**
   * Record Approval / Rejection Decision in the immutable Ledger
   */
  async recordDecision(
    crId: string,
    decision: 'Approved' | 'Rejected' | 'Changes Requested',
    comments: string,
    approverId: string,
    approverName: string,
    approverRole: string,
    orgId: string = 'org-unai'
  ): Promise<ChangeRequest> {
    // 1. Insert immutable decision record
    const decisionId = `crd-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
    await supabaseClient.from('cr_approval_decisions').insert({
      id: decisionId,
      change_request_id: crId,
      approver_id: approverId,
      approver_name: approverName,
      approver_role: approverRole,
      decision,
      comments: comments || null,
      organization_id: orgId,
    });

    // 2. Update CR status
    const targetStatus = decision === 'Approved' ? 'Approved' : decision === 'Rejected' ? 'Rejected' : 'Under Review';
    const updatePayload: Record<string, any> = {
      status: targetStatus,
      updated_at: new Date().toISOString(),
    };

    if (decision === 'Approved') {
      updatePayload.approved_by = approverId;
      updatePayload.approved_by_name = approverName;
      updatePayload.approved_at = new Date().toISOString();
    }

    const { data: updatedCr, error: updateErr } = await supabaseClient
      .from('change_requests')
      .update(updatePayload)
      .eq('id', crId)
      .select()
      .single();

    if (updateErr) throw updateErr;

    // 3. Emit domain event
    try {
      await processEvent({
        eventType: decision === 'Approved' ? 'CR_APPROVED' : 'CR_REJECTED',
        projectId: updatedCr.project_id,
        entityType: 'ChangeRequest',
        entityId: crId,
        actorId: approverId,
        actorName: approverName,
        actorRole: approverRole,
        organizationId: orgId,
        payload: {
          decision,
          comments,
          changeCode: updatedCr.change_code,
        },
      });
    } catch (wfErr) {
      console.warn('[CRGovernanceService] Notice emitting CR decision event:', wfErr);
    }

    return this.mapDbRowToCR(updatedCr);
  },

  /**
   * Fetch Change Requests with filters
   */
  async getChangeRequests(projectId?: string, orgId?: string, statusFilter?: string): Promise<ChangeRequest[]> {
    try {
      let query = supabaseClient
        .from('change_requests')
        .select('*')
        .order('created_at', { ascending: false });

      if (projectId && projectId !== 'all') {
        query = query.eq('project_id', projectId);
      }
      if (orgId) {
        query = query.eq('organization_id', orgId);
      }
      if (statusFilter && statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      const { data, error } = await query;
      if (error) {
        console.warn('[CRGovernanceService] getChangeRequests notice:', error.message);
        return [];
      }

      return (data || []).map(this.mapDbRowToCR);
    } catch (err) {
      console.warn('[CRGovernanceService] Error fetching change requests:', err);
      return [];
    }
  },

  /**
   * Fetch pending escalation requests for CTO Inbox
   */
  async getPendingEscalations(orgId?: string): Promise<ChangeRequest[]> {
    try {
      let query = supabaseClient
        .from('change_requests')
        .select('*')
        .eq('status', 'Escalated to CTO')
        .order('created_at', { ascending: false });

      if (orgId) {
        query = query.eq('organization_id', orgId);
      }

      const { data, error } = await query;
      if (error) {
        console.warn('[CRGovernanceService] getPendingEscalations notice:', error.message);
        return [];
      }

      return (data || []).map(this.mapDbRowToCR);
    } catch (err) {
      console.warn('[CRGovernanceService] Error fetching escalations:', err);
      return [];
    }
  },

  /**
   * Get full details of a CR including Impact Analysis and Approval Decision Ledger
   */
  async getChangeRequestDetails(crId: string): Promise<{
    changeRequest: ChangeRequest | null;
    impactAnalysis: CRImpactAnalysis | null;
    approvalHistory: CRApprovalDecision[];
  }> {
    try {
      const [
        { data: crRow },
        { data: iaRow },
        { data: decisions },
      ] = await Promise.all([
        supabaseClient.from('change_requests').select('*').eq('id', crId).maybeSingle(),
        supabaseClient.from('cr_impact_analysis').select('*').eq('change_request_id', crId).order('analyzed_at', { ascending: false }).limit(1).maybeSingle(),
        supabaseClient.from('cr_approval_decisions').select('*').eq('change_request_id', crId).order('decided_at', { ascending: false }),
      ]);

      const changeRequest = crRow ? this.mapDbRowToCR(crRow) : null;

      const impactAnalysis: CRImpactAnalysis | null = iaRow ? {
        id: iaRow.id,
        changeRequestId: iaRow.change_request_id,
        projectId: iaRow.project_id,
        analyzedAt: iaRow.analyzed_at,
        analyzedBy: iaRow.analyzed_by,
        affectedDocumentIds: iaRow.affected_document_ids || [],
        affectedFeatureIds: iaRow.affected_feature_ids || [],
        affectedTaskIds: iaRow.affected_task_ids || [],
        budgetDelta: Number(iaRow.budget_delta || 0),
        timelineDeltaDays: Number(iaRow.timeline_delta_days || 0),
        riskScore: Number(iaRow.risk_score || 0),
        requiresCtoApproval: iaRow.requires_cto_approval || false,
        escalationReasons: iaRow.escalation_reasons || [],
        traceabilityGraph: iaRow.traceability_graph || {},
        organizationId: iaRow.organization_id || 'org-unai',
      } : null;

      const approvalHistory: CRApprovalDecision[] = (decisions || []).map((d: any) => ({
        id: d.id,
        changeRequestId: d.change_request_id,
        approverId: d.approver_id,
        approverName: d.approver_name,
        approverRole: d.approver_role,
        decision: d.decision,
        comments: d.comments,
        decidedAt: d.decided_at,
        organizationId: d.organization_id,
      }));

      return { changeRequest, impactAnalysis, approvalHistory };
    } catch (err) {
      console.warn('[CRGovernanceService] Error fetching CR details:', err);
      return { changeRequest: null, impactAnalysis: null, approvalHistory: [] };
    }
  },

  mapDbRowToCR(row: any): ChangeRequest {
    return {
      id: row.id,
      projectId: row.project_id,
      changeCode: row.change_code || 'CR-001',
      title: row.title || 'Untitled Change Request',
      description: row.description || '',
      reason: row.reason || '',
      crType: row.cr_type || 'Scope',
      severity: row.severity || 'Medium',
      requestedBy: row.requested_by,
      requestedByName: row.requested_by_name || 'Requester',
      impactScope: row.impact_scope,
      impactSchedule: row.impact_schedule,
      impactCost: row.impact_cost,
      impactResources: row.impact_resources,
      status: row.status || 'Pending',
      requiresCtoApproval: row.requires_cto_approval ?? false,
      sourceDocumentId: row.source_document_id,
      sourceVersionId: row.source_version_id,
      affectedFeatureIds: row.affected_feature_ids || [],
      affectedTaskIds: row.affected_task_ids || [],
      budgetImpactAmount: Number(row.budget_impact_amount || 0),
      budgetImpactPct: Number(row.budget_impact_pct || 0),
      timelineImpactDays: Number(row.timeline_impact_days || 0),
      effortSplitRatio: Number(row.effort_split_ratio || 0),
      approvedBy: row.approved_by,
      approvedByName: row.approved_by_name,
      approvedAt: row.approved_at,
      organizationId: row.organization_id || 'org-unai',
      isDeleted: row.is_deleted ?? false,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  },
};
