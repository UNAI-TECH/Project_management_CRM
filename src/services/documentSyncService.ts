/**
 * Document Sync Service (Reverse Sync)
 * =====================================
 * When tasks linked to a document are verified/completed, this service
 * writes task completion data back into the document's content object.
 * 
 * This ensures that when the document is exported (DOCX), it automatically
 * includes who completed which task, when, and with what deliverables.
 */

import { ProjectDocument, Task, TaskSubmission } from '../types';
import { supabaseClient } from '../lib/supabaseClient';

export interface TaskCompletionEntry {
  taskId: string;
  taskTitle: string;
  completedBy: string;
  completedByRole: string;
  verifiedBy: string;
  verifiedAt: string;
  deliverableFiles: string[];
  notes: string;
}

export const documentSyncService = {
  /**
   * Sync a verified task's completion data back to its linked document.
   * Appends to the document's content under the 'task_completion_log' key.
   */
  async syncTaskCompletionToDocument(
    task: Task,
    verifiedBy: string,
    verifiedByName: string
  ): Promise<void> {
    if (!task.docId) return; // No linked document

    try {
      // Fetch the current document content
      const { data: docData, error: fetchError } = await supabaseClient
        .from('project_documents')
        .select('content, completion')
        .eq('id', task.docId)
        .maybeSingle();

      if (fetchError || !docData) {
        console.error('documentSyncService: Failed to fetch document for reverse sync:', fetchError);
        return;
      }

      const currentContent = docData.content || {};
      const existingLog: TaskCompletionEntry[] = currentContent.task_completion_log || [];

      // Avoid duplicates
      if (existingLog.some((entry) => entry.taskId === task.id)) {
        return;
      }

      // Build the completion entry
      const completionEntry: TaskCompletionEntry = {
        taskId: task.id,
        taskTitle: task.title,
        completedBy: task.assignedToName || 'Unknown',
        completedByRole: task.assignedToRole || 'Employee',
        verifiedBy: verifiedByName,
        verifiedAt: new Date().toISOString(),
        deliverableFiles: task.submission?.fileUrls || [],
        notes: task.submission?.notes || '',
      };

      // Append to log
      const updatedLog = [...existingLog, completionEntry];
      const updatedContent = {
        ...currentContent,
        task_completion_log: updatedLog,
      };

      // Update the document
      const { error: updateError } = await supabaseClient
        .from('project_documents')
        .update({
          content: updatedContent,
          updated_at: new Date().toISOString(),
        })
        .eq('id', task.docId);

      if (updateError) {
        console.error('documentSyncService: Failed to sync task completion to document:', updateError);
      }
    } catch (err) {
      console.error('documentSyncService: Unexpected error during reverse sync:', err);
    }
  },

  /**
   * Get all task completion entries for a document.
   * Useful for rendering in the document detail view and export.
   */
  getTaskCompletionLog(document: ProjectDocument): TaskCompletionEntry[] {
    return document.content?.task_completion_log || [];
  },

  /**
   * Calculate document completion percentage based on linked task statuses.
   * Returns a number 0-100.
   */
  calculateDocumentCompletion(
    document: ProjectDocument,
    linkedTasks: Task[]
  ): number {
    if (linkedTasks.length === 0) {
      // No linked tasks — use the document's own completion
      return document.completion;
    }

    const verifiedCount = linkedTasks.filter((t) => t.status === 'Verified').length;
    const totalCount = linkedTasks.length;

    // Document base completion (form fill) counts as 50%,
    // task completions count as the other 50%
    const formCompletion = Math.min(document.completion, 50);
    const taskCompletion = Math.round((verifiedCount / totalCount) * 50);

    return formCompletion + taskCompletion;
  },
};
