/**
 * Document Auto-Fill Service
 * ==========================
 * Reads approved upstream documents and live task/feature data
 * to populate downstream document fields.
 */

import { ProjectDocument, ProjectFeature, Task, TeamMember, Project } from '../types';
import { DOCUMENT_DEPENDENCY_GRAPH, getAutoFillContent } from '../constants/documentDependencyGraph';
import { sprintAutoFillService } from './sprintAutoFillService';

export const documentAutoFillService = {
  /**
   * Get auto-filled content for a document template.
   * Only reads from *approved* upstream documents.
   */
  getAutoFilledFields(
    templateId: number,
    projectDocuments: ProjectDocument[]
  ): { autoFilledContent: Record<string, any>; sourceDocNames: string[] } {
    const autoFilledContent = getAutoFillContent(templateId, projectDocuments);
    
    // Collect which source documents contributed data
    const sourceDocNames: string[] = [];
    const node = DOCUMENT_DEPENDENCY_GRAPH[templateId];
    
    if (node?.autoFillMappings) {
      for (const mapping of node.autoFillMappings) {
        const sourceDoc = projectDocuments.find(
          (d) => d.templateId === mapping.sourceTemplateId && d.status === 'Approved'
        );
        if (sourceDoc) {
          const hasContribution = Object.values(mapping.fieldMap).some(
            (sourceField) => sourceDoc.content?.[sourceField]
          );
          if (hasContribution && !sourceDocNames.includes(sourceDoc.name)) {
            sourceDocNames.push(sourceDoc.name);
          }
        }
      }
    }

    return { autoFilledContent, sourceDocNames };
  },

  /**
   * Merge auto-filled content with existing user-entered content.
   * User edits always take priority over auto-filled values.
   */
  mergeWithExisting(
    existingContent: Record<string, any>,
    autoFilledContent: Record<string, any>
  ): Record<string, any> {
    const merged = { ...autoFilledContent };

    for (const [key, value] of Object.entries(existingContent)) {
      if (value !== undefined && value !== null && value !== '') {
        // If it's an array (e.g. table rows), only override if non-empty
        if (Array.isArray(value)) {
          if (value.length > 0) {
            merged[key] = value;
          }
        } else {
          merged[key] = value;
        }
      }
    }

    return merged;
  },

  /**
   * Auto-populate Sprint Plan (template 9) from features, tasks, and time tracking.
   */
  getSprintPlanAutoFill(
    projectTeamMembers: TeamMember[],
    projectDocuments: ProjectDocument[],
    project: Project | null = null,
    features: ProjectFeature[] = [],
    tasks: Task[] = []
  ): Record<string, any> {
    return sprintAutoFillService.generateSprintPlanContent(
      project,
      features,
      tasks,
      projectTeamMembers
    );
  },
};
