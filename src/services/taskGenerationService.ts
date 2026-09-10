/**
 * Task Generation Service
 * =======================
 * Integrates with Feature Architecture & Approved Documentation (FDS, TDS, ARCH, UI/UX).
 */

import { ProjectDocument, Task, UserRole, TeamMember, ProjectFeature } from '../types';
import { DOCUMENT_TEMPLATES } from '../constants/documentTemplates';
import { isTaskGeneratable } from '../constants/documentDependencyGraph';

interface GeneratedTask {
  title: string;
  description: string;
  docId: string;
  docName: string;
  templateId: number;
  projectId: string;
  projectName: string;
  assignedToRole: UserRole;
  hierarchyLevel: 'CTO_TO_PM' | 'PM_TO_TL' | 'TL_TO_DEV';
  priority: 'High' | 'Medium' | 'Low';
  featureId?: string;
  featureName?: string;
  estimatedHours?: number;
  sequenceOrder?: number;
  isBlocked?: boolean;
}

const TASK_GENERATION_RULES: Record<number, {
  contentFields: string[];
  taskPrefix: string;
  descriptionTemplate: (docName: string, field: string, value: string) => string;
}> = {
  5: {
    contentFields: ['user_flow_description', 'validation_rules'],
    taskPrefix: 'FDS',
    descriptionTemplate: (docName, field, value) =>
      `Implement functional specification from "${docName}".\n\nScope: ${field === 'user_flow_description' ? 'User Flow & Screen Logic' : 'Field Validation Rules'}\n\nDetails:\n${value?.substring(0, 500) || 'See document for full specification.'}`,
  },
  6: {
    contentFields: ['api_endpoints', 'db_schema_notes'],
    taskPrefix: 'TDS',
    descriptionTemplate: (docName, field, value) =>
      `Implement technical specification from "${docName}".\n\nScope: ${field === 'api_endpoints' ? 'API Endpoints Development' : 'Database Schema & Indexing'}\n\nDetails:\n${value?.substring(0, 500) || 'See document for full specification.'}`,
  },
  7: {
    contentFields: ['infrastructure_tier', 'caching_messaging'],
    taskPrefix: 'ARCH',
    descriptionTemplate: (docName, field, value) =>
      `Implement architecture component from "${docName}".\n\nScope: ${field === 'infrastructure_tier' ? 'Cloud Infrastructure Setup' : 'Caching & Event Pipeline'}\n\nDetails:\n${value?.substring(0, 500) || 'See document for full specification.'}`,
  },
  8: {
    contentFields: ['figma_url', 'design_tokens'],
    taskPrefix: 'UIUX',
    descriptionTemplate: (docName, field, value) =>
      `Implement UI/UX design from "${docName}".\n\nScope: ${field === 'figma_url' ? 'Design Implementation from Figma' : 'Design System & Tokens'}\n\nDetails:\n${value?.substring(0, 500) || 'See document for full specification.'}`,
  },
};

export const taskGenerationService = {
  shouldGenerateTasks(templateId: number): boolean {
    return isTaskGeneratable(templateId);
  },

  generateTasksFromFeatures(
    features: ProjectFeature[],
    projectName: string,
    teamLeads: TeamMember[],
    pmUser: { id: string; name: string; role: UserRole },
    orgId: string
  ): Omit<Task, 'createdAt'>[] {
    const tasks: Omit<Task, 'createdAt'>[] = [];

    features.forEach((feat, featIdx) => {
      const assignedTL = teamLeads.find((tl) => tl.id === feat.assignedTlId) || teamLeads[featIdx % (teamLeads.length || 1)];

      // 1. Primary Feature Directive Task (Assigned to TL)
      const primaryTaskId = `task-feat-${feat.sequenceOrder}-${Date.now().toString(36)}-${featIdx}`;
      const specsSummary = [
        feat.linkedFunctions.length > 0 ? `• Functions to Implement:\n  ${feat.linkedFunctions.join('\n  ')}` : '',
        feat.linkedApis.length > 0 ? `• APIs to Build:\n  ${feat.linkedApis.join('\n  ')}` : '',
        feat.linkedScreens.length > 0 ? `• UI Screens:\n  ${feat.linkedScreens.join('\n  ')}` : '',
      ].filter(Boolean).join('\n\n');

      tasks.push({
        id: primaryTaskId,
        projectId: feat.projectId,
        projectName,
        docId: feat.sourceDocIds[0] || undefined,
        docName: feat.sourceDocNames[0] || 'Architecture & Design Specs',
        templateId: 7,
        title: `[Feature ${feat.sequenceOrder}] ${feat.name}`,
        description: `${feat.description}\n\nTechnology: ${feat.technology || 'Core Stack'}\n\n${specsSummary}`,
        assignedBy: pmUser.id,
        assignedByName: pmUser.name,
        assignedByRole: pmUser.role,
        assignedTo: assignedTL?.id || pmUser.id,
        assignedToName: assignedTL?.name || pmUser.name,
        assignedToRole: (assignedTL?.role || 'TL') as UserRole,
        assignedToDesignation: assignedTL?.designation || 'Team Lead',
        status: feat.isBlocked ? 'Blocked' : 'Open',
        priority: 'High',
        dueDate: feat.dueDate || new Date(Date.now() + 14 * 86400000).toLocaleDateString('en-GB'),
        progress: 0,
        parentTaskId: null,
        featureId: feat.id,
        featureName: feat.name,
        taskType: 'feature_task',
        sequenceOrder: feat.sequenceOrder,
        isBlocked: feat.isBlocked,
        estimatedHours: feat.estimatedHours || 40,
        actualHours: 0,
        hierarchyLevel: 'PM_TO_TL',
        organizationId: orgId,
      });
    });

    return tasks;
  },

  generateTasksFromDocument(
    document: ProjectDocument,
    projectName: string,
    teamMembers: TeamMember[]
  ): GeneratedTask[] {
    const rules = TASK_GENERATION_RULES[document.templateId];
    if (!rules) return [];

    const tasks: GeneratedTask[] = [];
    let taskIndex = 0;

    for (const fieldId of rules.contentFields) {
      const fieldValue = document.content?.[fieldId];
      if (!fieldValue || fieldValue === '') continue;

      taskIndex++;
      const taskTitle = `${rules.taskPrefix}-${String(taskIndex).padStart(2, '0')}: ${getFieldLabel(document.templateId, fieldId)}`;

      tasks.push({
        title: taskTitle,
        description: rules.descriptionTemplate(document.name, fieldId, fieldValue),
        docId: document.id,
        docName: document.name,
        templateId: document.templateId,
        projectId: document.projectId,
        projectName,
        assignedToRole: 'TL',
        hierarchyLevel: 'PM_TO_TL',
        priority: 'High',
        sequenceOrder: taskIndex,
        isBlocked: false,
      });
    }

    return tasks;
  },

  buildTaskObjects(
    generatedTasks: GeneratedTask[],
    assignedBy: { id: string; name: string; role: UserRole },
    teamLeads: TeamMember[],
    organizationId: string
  ): Omit<Task, 'createdAt'>[] {
    return generatedTasks.map((gt, idx) => {
      const targetTL = teamLeads.length > 0
        ? teamLeads[idx % teamLeads.length]
        : undefined;

      return {
        id: `task-auto-${gt.templateId}-${Date.now()}-${idx}`,
        projectId: gt.projectId,
        projectName: gt.projectName,
        docId: gt.docId,
        docName: gt.docName,
        templateId: gt.templateId,
        title: gt.title,
        description: gt.description,
        assignedBy: assignedBy.id,
        assignedByName: assignedBy.name,
        assignedByRole: assignedBy.role,
        assignedTo: targetTL?.id || assignedBy.id,
        assignedToName: targetTL?.name || assignedBy.name,
        assignedToRole: (targetTL?.role || 'TL') as UserRole,
        assignedToDesignation: targetTL?.designation || '',
        status: 'Open' as const,
        priority: gt.priority,
        dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toLocaleDateString('en-GB'),
        progress: 0,
        parentTaskId: null,
        hierarchyLevel: gt.hierarchyLevel,
        taskType: 'feature_task',
        sequenceOrder: gt.sequenceOrder || 1,
        isBlocked: false,
        organizationId,
      };
    });
  },
};

function getFieldLabel(templateId: number, fieldId: string): string {
  const template = DOCUMENT_TEMPLATES.find((t) => t.id === templateId);
  if (!template) return fieldId;

  for (const section of template.sections) {
    const field = section.fields.find((f) => f.id === fieldId);
    if (field) return field.label;
  }

  return fieldId;
}
