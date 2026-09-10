/**
 * Document Relationship Service (§11)
 * =====================================
 * Manages relationships between documents in a project:
 * - depends_on: Downstream document depends on upstream
 * - derived_from: Content or requirements derived from source
 * - supports: Documentation supporting another entity
 * - supersedes: Newer version replacing older
 * - references: Cross-referencing documents
 * - requires: Strict requirement
 */

import { supabase } from '../lib/supabaseClient';
import type { DocumentRelationship, DocumentRelationshipType } from '../types';

export async function createDocumentRelationship(
  projectId: string,
  sourceDocumentId: string,
  targetDocumentId: string,
  relationshipType: DocumentRelationshipType,
  createdBy?: string
): Promise<{ success: boolean; relationship?: DocumentRelationship; error?: string }> {
  try {
    const { data, error } = await supabase
      .from('document_relationships')
      .upsert(
        {
          project_id: projectId,
          source_document_id: sourceDocumentId,
          target_document_id: targetDocumentId,
          relationship_type: relationshipType,
          created_by: createdBy,
        },
        { onConflict: 'source_document_id,target_document_id,relationship_type' }
      )
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    return {
      success: true,
      relationship: {
        id: data.id,
        projectId: data.project_id,
        sourceDocumentId: data.source_document_id,
        targetDocumentId: data.target_document_id,
        relationshipType: data.relationship_type,
        createdBy: data.created_by,
        createdAt: data.created_at,
      },
    };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function getDocumentRelationships(
  documentId: string
): Promise<{ upstream: DocumentRelationship[]; downstream: DocumentRelationship[] }> {
  try {
    const [{ data: upstream }, { data: downstream }] = await Promise.all([
      supabase
        .from('document_relationships')
        .select('*')
        .eq('target_document_id', documentId),
      supabase
        .from('document_relationships')
        .select('*')
        .eq('source_document_id', documentId),
    ]);

    const mapRel = (r: any): DocumentRelationship => ({
      id: r.id,
      projectId: r.project_id,
      sourceDocumentId: r.source_document_id,
      targetDocumentId: r.target_document_id,
      relationshipType: r.relationship_type,
      createdBy: r.created_by,
      createdAt: r.created_at,
    });

    return {
      upstream: (upstream || []).map(mapRel),
      downstream: (downstream || []).map(mapRel),
    };
  } catch {
    return { upstream: [], downstream: [] };
  }
}

export async function removeDocumentRelationship(
  relationshipId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('document_relationships')
      .delete()
      .eq('id', relationshipId);

    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
