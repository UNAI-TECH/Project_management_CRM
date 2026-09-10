/**
 * Document Workflow Service (§8, §12, §13)
 * ==========================================
 * Handles document lifecycle state machine, dependency validation,
 * and approval recording.
 * 
 * State Machine (§8):
 *   Not Started → Draft → In Progress → Ready for Review →
 *   Under Review → Approved → Locked → Archived
 * 
 * Rejected flow:
 *   Under Review → Changes Requested → In Progress → Ready for Review
 */

import { supabase } from '../lib/supabaseClient';
import type { DocumentStatus, ApprovalDecision, DocumentApproval } from '../types';

// Valid document status transitions per §8
const VALID_DOCUMENT_TRANSITIONS: Record<string, string[]> = {
  'Not Started': ['Draft'],
  'Draft': ['In Progress'],
  'In Progress': ['Ready for Review'],
  'Ready for Review': ['Under Review'],
  'Under Review': ['Approved', 'Changes Requested'],
  'Changes Requested': ['In Progress'],
  'Approved': ['Locked', 'Superseded'],
  'Locked': ['Archived'],
  // Legacy compatibility
  'In Review': ['Approved', 'Changes Requested'],
};

/**
 * Validate if a document status transition is allowed (§8)
 */
export function isValidDocumentTransition(
  fromStatus: string,
  toStatus: string
): boolean {
  const allowed = VALID_DOCUMENT_TRANSITIONS[fromStatus];
  return allowed ? allowed.includes(toStatus) : false;
}

/**
 * Transition document status with validation (§8)
 */
export async function transitionDocumentStatus(
  documentId: string,
  toStatus: DocumentStatus,
  actorId: string,
  actorName: string,
  actorRole: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Fetch current status
    const { data: doc, error: fetchError } = await supabase
      .from('project_documents')
      .select('id, status, project_id, doc_type, name')
      .eq('id', documentId)
      .single();

    if (fetchError || !doc) {
      return { success: false, error: 'Document not found' };
    }

    // Validate transition
    if (!isValidDocumentTransition(doc.status, toStatus)) {
      return {
        success: false,
        error: `Invalid transition: ${doc.status} → ${toStatus}. Allowed: ${VALID_DOCUMENT_TRANSITIONS[doc.status]?.join(', ') || 'none'}`,
      };
    }

    // Update status
    const { error: updateError } = await supabase
      .from('project_documents')
      .update({
        status: toStatus,
        updated_at: new Date().toISOString(),
      })
      .eq('id', documentId);

    if (updateError) {
      return { success: false, error: updateError.message };
    }

    // Create audit log
    await supabase.from('audit_log').insert({
      actor_id: actorId,
      actor_name: actorName,
      actor_role: actorRole,
      action: `Document Status: ${doc.status} → ${toStatus}`,
      entity_type: 'Document',
      entity_id: documentId,
      project_id: doc.project_id,
      details: `Document "${doc.name}" transitioned from ${doc.status} to ${toStatus}`,
      organization_id: (await getOrgId(actorId)) || '',
    });

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Check if all document dependencies are satisfied (§12)
 * Returns list of unsatisfied dependencies
 */
export async function checkDocumentDependencies(
  projectId: string,
  templateId: number
): Promise<{ satisfied: boolean; unsatisfied: Array<{ docName: string; currentStatus: string; requiredStatus: string }> }> {
  try {
    // Get dependency graph from the frontend constants (legacy support)
    // In future, this will read from document_type_dependencies table
    const { DOCUMENT_DEPENDENCY_GRAPH } = await import('../constants/documentDependencyGraph');
    const node = DOCUMENT_DEPENDENCY_GRAPH[templateId];

    if (!node || node.requiredDocs.length === 0) {
      return { satisfied: true, unsatisfied: [] };
    }

    // Fetch all project documents
    const { data: docs } = await supabase
      .from('project_documents')
      .select('doc_type, status, name')
      .eq('project_id', projectId);

    const unsatisfied: Array<{ docName: string; currentStatus: string; requiredStatus: string }> = [];

    for (const requiredTemplateId of node.requiredDocs) {
      const doc = docs?.find((d: any) => d.doc_type === requiredTemplateId);
      if (!doc || doc.status !== 'Approved') {
        unsatisfied.push({
          docName: doc?.name || `Template #${requiredTemplateId}`,
          currentStatus: doc?.status || 'Not Started',
          requiredStatus: 'Approved',
        });
      }
    }

    return {
      satisfied: unsatisfied.length === 0,
      unsatisfied,
    };
  } catch {
    return { satisfied: true, unsatisfied: [] };
  }
}

/**
 * Record a document approval decision (§13)
 * Never overwrites approval history
 */
export async function recordApproval(
  documentId: string,
  versionId: string | null,
  approverId: string,
  approverName: string,
  approverRole: string,
  decision: ApprovalDecision,
  comments?: string
): Promise<{ success: boolean; approval?: DocumentApproval; error?: string }> {
  try {
    const { data, error } = await supabase
      .from('document_approvals')
      .insert({
        document_id: documentId,
        version_id: versionId,
        approver_id: approverId,
        approver_name: approverName,
        approver_role: approverRole,
        decision,
        comments: comments || null,
      })
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    // Map to TS type
    const approval: DocumentApproval = {
      id: data.id,
      documentId: data.document_id,
      versionId: data.version_id,
      approverId: data.approver_id,
      approverName: data.approver_name,
      approverRole: data.approver_role,
      decision: data.decision,
      comments: data.comments,
      approvedAt: data.approved_at,
    };

    return { success: true, approval };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Get all approvals for a document (§13)
 */
export async function getDocumentApprovals(
  documentId: string
): Promise<DocumentApproval[]> {
  const { data } = await supabase
    .from('document_approvals')
    .select('*')
    .eq('document_id', documentId)
    .order('approved_at', { ascending: false });

  if (!data) return [];

  return data.map((d: any) => ({
    id: d.id,
    documentId: d.document_id,
    versionId: d.version_id,
    approverId: d.approver_id,
    approverName: d.approver_name,
    approverRole: d.approver_role,
    decision: d.decision,
    comments: d.comments,
    approvedAt: d.approved_at,
  }));
}

/**
 * Create a document revision (§8 — revision flow)
 * Approved doc → v1.1 Draft
 */
export async function createRevision(
  documentId: string,
  actorId: string,
  actorName: string
): Promise<{ success: boolean; newVersionNo?: string; error?: string }> {
  try {
    const { data: doc } = await supabase
      .from('project_documents')
      .select('*')
      .eq('id', documentId)
      .single();

    if (!doc) return { success: false, error: 'Document not found' };
    if (doc.status !== 'Approved' && doc.status !== 'Locked') {
      return { success: false, error: 'Only Approved or Locked documents can be revised' };
    }

    // Snapshot the current version
    const currentVersion = doc.version || '1.0';
    await supabase.from('document_versions').insert({
      document_id: documentId,
      version_no: currentVersion,
      snapshot: doc.content,
      changed_by: actorId,
      changed_by_name: actorName,
      remarks: `Snapshot before revision`,
    });

    // Increment version
    const parts = currentVersion.split('.');
    const minor = parseInt(parts[1] || '0') + 1;
    const newVersion = `${parts[0]}.${minor}`;

    // Set document back to Draft with new version
    await supabase
      .from('project_documents')
      .update({
        version: newVersion,
        status: 'Draft',
        updated_at: new Date().toISOString(),
      })
      .eq('id', documentId);

    return { success: true, newVersionNo: newVersion };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// Helper to get organization ID for a user
async function getOrgId(userId: string): Promise<string | null> {
  const { data } = await supabase
    .from('organization_members')
    .select('organization_id')
    .eq('auth_user_id', userId)
    .limit(1)
    .single();
  return data?.organization_id || null;
}
