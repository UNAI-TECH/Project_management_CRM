/**
 * Document Dependency Graph (DAG)
 * ================================
 * Defines the sequential completion order for project documents.
 * A document can only be edited when ALL of its prerequisite documents
 * have reached 'Approved' status.
 *
 * Flow:
 *   01 Project Charter (CTO)
 *     └──▶ 02 Project Plan (CTO/PM)
 *           └──▶ 03 SRS (PM — after stakeholder meetings)
 *                 └──▶ 04 BRD (CTO)
 *                       ├──▶ 05 Functional Spec (PM)
 *                       ├──▶ 06 Technical Spec (PM)
 *                       ├──▶ 07 Architecture Doc (PM)
 *                       └──▶ 08 UI/UX Design Doc (PM)
 *                             └──▶ 09 Sprint Plan (auto-fill from teams)
 *                                   ├──▶ 10 Test Plan (QA Lead)
 *                                   ├──▶ 11 Test Cases (QA / Employees)
 *                                   └──▶ [Tasks from 05-08 → TL → Employee]
 *                                         └──▶ 12 UAT Sign-off
 *                                               └──▶ 13 Deployment Checklist
 *                                                     └──▶ 14 Go-Live Checklist
 *                                                           └──▶ 15 Maintenance Plan
 */

import { UserRole, ProjectDocument, DocumentTemplate } from '../types';

// ---------------------------------------------------------------------------
// Dependency Definitions
// ---------------------------------------------------------------------------

export interface DocumentDependencyNode {
  templateId: number;
  /** Template IDs that must be 'Approved' before this document can be edited */
  requiredDocs: number[];
  /** Roles that are allowed to fill / edit this document */
  editableByRoles: UserRole[];
  /** Whether approving this document auto-generates tasks for TLs */
  taskGeneratable: boolean;
  /** Auto-fill field mappings: which upstream doc fields flow into this doc */
  autoFillMappings: Array<{
    sourceTemplateId: number;
    /** Maps: this doc's field ID ← source doc's field ID */
    fieldMap: Record<string, string>;
  }>;
}

/**
 * The master dependency graph. Key = template ID.
 */
export const DOCUMENT_DEPENDENCY_GRAPH: Record<number, DocumentDependencyNode> = {
  // ── Template 0: Master Record ──
  0: {
    templateId: 0,
    requiredDocs: [],
    editableByRoles: ['CEO', 'MD', 'COO', 'CTO', 'CIO'],
    taskGeneratable: false,
    autoFillMappings: [],
  },

  // ── Template 1: Project Charter ──
  1: {
    templateId: 1,
    requiredDocs: [], // First document — no dependencies
    editableByRoles: ['CEO', 'MD', 'COO', 'CTO', 'CIO'],
    taskGeneratable: false,
    autoFillMappings: [],
  },

  // ── Template 2: Project Plan ──
  2: {
    templateId: 2,
    requiredDocs: [1], // Requires Project Charter approved
    editableByRoles: ['CEO', 'MD', 'COO', 'CTO', 'CIO', 'PM'],
    taskGeneratable: false,
    autoFillMappings: [
      {
        sourceTemplateId: 1,
        fieldMap: {
          // Project Plan field ← Charter field
          'wbs_summary': 'in_scope',
          'planned_start': 'approval_date',
        },
      },
    ],
  },

  // ── Template 3: SRS ──
  3: {
    templateId: 3,
    requiredDocs: [1, 2], // Requires Charter + Project Plan
    editableByRoles: ['PM', 'CTO', 'CIO'],
    taskGeneratable: false,
    autoFillMappings: [
      {
        sourceTemplateId: 1,
        fieldMap: {
          'system_boundary': 'in_scope',
          'user_personas': 'primary_sponsor',
        },
      },
      {
        sourceTemplateId: 2,
        fieldMap: {
          'fr_workflows': 'wbs_summary',
        },
      },
    ],
  },

  // ── Template 4: BRD ──
  4: {
    templateId: 4,
    requiredDocs: [1, 2, 3], // Requires Charter + Plan + SRS
    editableByRoles: ['CEO', 'MD', 'COO', 'CTO', 'CIO'],
    taskGeneratable: false,
    autoFillMappings: [
      {
        sourceTemplateId: 1,
        fieldMap: {
          'business_problem': 'purpose',
        },
      },
      {
        sourceTemplateId: 3,
        fieldMap: {
          'expected_roi': 'fr_reporting',
        },
      },
    ],
  },

  // ── Template 5: Functional Specification ──
  5: {
    templateId: 5,
    requiredDocs: [1, 2, 3, 4], // Requires all upstream docs
    editableByRoles: ['PM', 'TL', 'CTO', 'CIO'],
    taskGeneratable: true, // Generates tasks for TLs from use cases
    autoFillMappings: [
      {
        sourceTemplateId: 3,
        fieldMap: {
          'user_flow_description': 'fr_workflows',
          'validation_rules': 'fr_auth',
        },
      },
    ],
  },

  // ── Template 6: Technical Specification ──
  6: {
    templateId: 6,
    requiredDocs: [1, 2, 3, 4], // Same gate as FDS
    editableByRoles: ['PM', 'TL', 'CTO', 'CIO'],
    taskGeneratable: true, // Generates tasks for TLs from API specs
    autoFillMappings: [
      {
        sourceTemplateId: 3,
        fieldMap: {
          'api_endpoints': 'fr_workflows',
          'db_schema_notes': 'security_standards',
        },
      },
    ],
  },

  // ── Template 7: Architecture Document ──
  7: {
    templateId: 7,
    requiredDocs: [1, 2, 3, 4], // Same gate
    editableByRoles: ['PM', 'TL', 'CTO', 'CIO'],
    taskGeneratable: true, // Generates tasks for TLs from components
    autoFillMappings: [
      {
        sourceTemplateId: 6,
        fieldMap: {
          'infrastructure_tier': 'db_schema_notes',
        },
      },
    ],
  },

  // ── Template 8: UI/UX Design Document ──
  8: {
    templateId: 8,
    requiredDocs: [1, 2, 3, 4], // Same gate
    editableByRoles: ['PM', 'TL', 'CTO', 'CIO', 'Employee'],
    taskGeneratable: true, // Generates tasks for TLs from screens
    autoFillMappings: [
      {
        sourceTemplateId: 5,
        fieldMap: {
          'design_tokens': 'user_flow_description',
        },
      },
    ],
  },

  // ── Template 9: Sprint Plan ──
  9: {
    templateId: 9,
    requiredDocs: [2, 5, 6, 7, 8], // Requires Plan + all Design docs
    editableByRoles: ['PM', 'TL', 'CTO', 'CIO'],
    taskGeneratable: false,
    autoFillMappings: [
      {
        sourceTemplateId: 2,
        fieldMap: {
          'total_story_points': 'allocated_engineers',
          'sprint_goal': 'critical_path',
        },
      },
    ],
  },

  // ── Template 10: Test Plan ──
  10: {
    templateId: 10,
    requiredDocs: [3, 5, 9], // Requires SRS + FDS + Sprint Plan
    editableByRoles: ['PM', 'TL', 'CTO', 'CIO', 'Employee'],
    taskGeneratable: false,
    autoFillMappings: [
      {
        sourceTemplateId: 3,
        fieldMap: {
          'qa_scope': 'fr_workflows',
        },
      },
    ],
  },

  // ── Template 11: Test Cases ──
  11: {
    templateId: 11,
    requiredDocs: [10], // Requires Test Plan
    editableByRoles: ['PM', 'TL', 'Employee', 'CTO', 'CIO'],
    taskGeneratable: false,
    autoFillMappings: [
      {
        sourceTemplateId: 10,
        fieldMap: {
          'test_suites_summary': 'qa_scope',
        },
      },
    ],
  },

  // ── Template 12: UAT Sign-off ──
  12: {
    templateId: 12,
    requiredDocs: [10, 11], // Requires Test Plan + Test Cases
    editableByRoles: ['PM', 'CTO', 'CIO', 'CEO', 'MD', 'COO'],
    taskGeneratable: false,
    autoFillMappings: [
      {
        sourceTemplateId: 11,
        fieldMap: {
          'signoff_officer': 'test_suites_summary',
        },
      },
    ],
  },

  // ── Template 13: Deployment Checklist ──
  13: {
    templateId: 13,
    requiredDocs: [7, 12], // Requires Architecture + UAT
    editableByRoles: ['PM', 'TL', 'CTO', 'CIO'],
    taskGeneratable: false,
    autoFillMappings: [
      {
        sourceTemplateId: 7,
        fieldMap: {
          'pre_flight_checks': 'infrastructure_tier',
          'db_migration_run': 'caching_messaging',
        },
      },
    ],
  },

  // ── Template 14: Go-Live Checklist ──
  14: {
    templateId: 14,
    requiredDocs: [13], // Requires Deployment Checklist
    editableByRoles: ['PM', 'CTO', 'CIO', 'CEO', 'MD', 'COO'],
    taskGeneratable: false,
    autoFillMappings: [
      {
        sourceTemplateId: 13,
        fieldMap: {
          'monitoring_alert_hooks': 'post_deploy_smoke',
        },
      },
    ],
  },

  // ── Template 15: Maintenance Plan ──
  15: {
    templateId: 15,
    requiredDocs: [14], // Requires Go-Live
    editableByRoles: ['PM', 'TL', 'CTO', 'CIO'],
    taskGeneratable: false,
    autoFillMappings: [
      {
        sourceTemplateId: 7,
        fieldMap: {
          'incident_escalation': 'infrastructure_tier',
        },
      },
    ],
  },
};

// ---------------------------------------------------------------------------
// Utility Functions
// ---------------------------------------------------------------------------

/**
 * Check whether a document's dependencies are satisfied.
 * Returns the list of unsatisfied dependency template IDs.
 */
export function getUnsatisfiedDependencies(
  templateId: number,
  projectDocuments: ProjectDocument[]
): number[] {
  const node = DOCUMENT_DEPENDENCY_GRAPH[templateId];
  if (!node || node.requiredDocs.length === 0) return [];

  return node.requiredDocs.filter((reqId) => {
    const doc = projectDocuments.find((d) => d.templateId === reqId);
    return !doc || doc.status !== 'Approved';
  });
}

/**
 * Check if a document is editable by the given role, considering both
 * role permissions AND dependency satisfaction.
 */
export function isDocumentEditable(
  templateId: number,
  userRole: UserRole,
  projectDocuments: ProjectDocument[]
): { editable: boolean; reason?: string; blockedBy?: number[] } {
  const node = DOCUMENT_DEPENDENCY_GRAPH[templateId];
  if (!node) {
    return { editable: true }; // Unknown template — allow editing
  }

  // Check role access
  if (!node.editableByRoles.includes(userRole)) {
    return {
      editable: false,
      reason: `Your role (${userRole}) does not have permission to edit this document. Required: ${node.editableByRoles.join(', ')}.`,
    };
  }

  // Check dependency satisfaction
  const unsatisfied = getUnsatisfiedDependencies(templateId, projectDocuments);
  if (unsatisfied.length > 0) {
    return {
      editable: false,
      reason: `Prerequisite documents must be approved before editing.`,
      blockedBy: unsatisfied,
    };
  }

  return { editable: true };
}

/**
 * Get the auto-fill content for a document based on its upstream dependencies.
 * Reads field values from approved upstream documents and maps them.
 */
export function getAutoFillContent(
  templateId: number,
  projectDocuments: ProjectDocument[]
): Record<string, any> {
  const node = DOCUMENT_DEPENDENCY_GRAPH[templateId];
  if (!node || !node.autoFillMappings || node.autoFillMappings.length === 0) {
    return {};
  }

  const autoFilled: Record<string, any> = {};

  for (const mapping of node.autoFillMappings) {
    const sourceDoc = projectDocuments.find(
      (d) => d.templateId === mapping.sourceTemplateId && d.status === 'Approved'
    );
    if (!sourceDoc || !sourceDoc.content) continue;

    for (const [targetField, sourceField] of Object.entries(mapping.fieldMap)) {
      const sourceValue = sourceDoc.content[sourceField];
      if (sourceValue && sourceValue !== '') {
        autoFilled[targetField] = sourceValue;
      }
    }
  }

  return autoFilled;
}

/**
 * Get all documents in the project that are currently blocked
 * (dependencies not met) and need upstream completion.
 */
export function getBlockedDocuments(
  projectDocuments: ProjectDocument[]
): Array<{ templateId: number; blockedBy: number[] }> {
  const blocked: Array<{ templateId: number; blockedBy: number[] }> = [];

  for (const doc of projectDocuments) {
    if (doc.status === 'Approved') continue; // Already done
    const unsatisfied = getUnsatisfiedDependencies(doc.templateId, projectDocuments);
    if (unsatisfied.length > 0) {
      blocked.push({ templateId: doc.templateId, blockedBy: unsatisfied });
    }
  }

  return blocked;
}

/**
 * Determine the "next actionable" documents for a given role.
 * These are documents whose dependencies are met AND the role can edit.
 */
export function getActionableDocuments(
  userRole: UserRole,
  projectDocuments: ProjectDocument[]
): ProjectDocument[] {
  return projectDocuments.filter((doc) => {
    if (doc.status === 'Approved') return false;
    const result = isDocumentEditable(doc.templateId, userRole, projectDocuments);
    return result.editable;
  });
}

/**
 * Check whether a template generates tasks on approval.
 */
export function isTaskGeneratable(templateId: number): boolean {
  const node = DOCUMENT_DEPENDENCY_GRAPH[templateId];
  return node?.taskGeneratable ?? false;
}
