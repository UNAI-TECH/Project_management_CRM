import { DocumentTemplate, LifecyclePhase, AutoFillMapping, UserRole } from '../types';
import { DOCUMENT_DEPENDENCY_GRAPH } from './documentDependencyGraph';

export const LIFECYCLE_PHASES: LifecyclePhase[] = [
  'All Phases',
  'Initiate',
  'Plan',
  'Requirements',
  'Design',
  'Build',
  'Test',
  'Release',
  'Maintain'
];

export const PHASE_COLORS: Record<LifecyclePhase, { bg: string; text: string; border: string }> = {
  'All Phases': { bg: 'bg-slate-100', text: 'text-slate-700', border: 'border-slate-300' },
  'Initiate': { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
  'Plan': { bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200' },
  'Requirements': { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' },
  'Design': { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
  'Build': { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
  'Test': { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200' },
  'Release': { bg: 'bg-cyan-50', text: 'text-cyan-700', border: 'border-cyan-200' },
  'Maintain': { bg: 'bg-teal-50', text: 'text-teal-700', border: 'border-teal-200' },
};

export const DOCUMENT_TEMPLATES: DocumentTemplate[] = [
  // ── 0. Master Record ──
  {
    id: 0,
    number: '0',
    name: 'Master Record',
    shortName: 'Master Record',
    phase: 'All Phases',
    ownerRole: 'CTO',
    description: 'Central project registry tracking lifecycle milestones, high-level deliverables, and cross-phase approvals.',
    sections: [
      {
        id: 'basic_info',
        title: '1. PROJECT IDENTIFICATION',
        description: 'Core metadata and project classification',
        fields: [
          { id: 'project_name', label: 'Project Name', type: 'text' },
          { id: 'project_code', label: 'Project Code', type: 'text' },
          { id: 'client_sponsor', label: 'Client / Sponsor', type: 'text' },
          { id: 'executive_summary', label: 'Executive Summary', type: 'textarea' },
        ]
      },
      {
        id: 'milestone_matrix',
        title: '2. LIFECYCLE MILESTONES MATRIX',
        description: 'Phase transition gates, schedules, and deliverables',
        fields: [
          {
            id: 'milestones_table',
            label: 'Milestones & Key Gates',
            type: 'table',
            columns: [
              { id: 'phase', label: 'Phase / Gate' },
              { id: 'target_date', label: 'Target Date', type: 'date' },
              { id: 'deliverable', label: 'Key Deliverable' },
              { id: 'owner', label: 'Owner / Lead' },
              { id: 'status', label: 'Status', type: 'select', options: ['Not Started', 'In Progress', 'Approved'] }
            ]
          },
          { id: 'risk_classification', label: 'Risk Classification', type: 'select', options: ['Low', 'Moderate', 'High', 'Critical'] },
        ]
      },
      {
        id: 'approvals',
        title: '3. GOVERNANCE & APPROVALS',
        description: 'Executive sign-off',
        fields: [
          { id: 'cto_approval', label: 'CTO Sign-off Status', type: 'select', options: ['Pending Review', 'Approved', 'Revisions Requested'] },
          { id: 'approval_date', label: 'Approval Date', type: 'date' },
          { id: 'approval_notes', label: 'CTO Remarks', type: 'textarea' }
        ]
      }
    ],
    dependencies: [],
    editableByRoles: ['CEO', 'MD', 'COO', 'CTO', 'CIO'],
    taskGeneratable: false,
  },

  // ── 1. Project Charter ──
  {
    id: 1,
    number: '1',
    name: 'Project Charter',
    shortName: 'Project Charter',
    phase: 'Initiate',
    ownerRole: 'CTO / Sponsor',
    description: 'Formal authorization document outlining project objectives, scope boundaries, key stakeholders, and initial budget.',
    sections: [
      {
        id: 'charter_overview',
        title: '1. PROJECT OVERVIEW',
        description: 'Project identity, purpose, and executive justification',
        fields: [
          { id: 'purpose', label: 'Project Purpose & Strategic Objectives', type: 'textarea', placeholder: 'Defines the overarching purpose, core objectives, and vision for this project.' },
          { id: 'business_case', label: 'Business Problem / Opportunity', type: 'textarea', placeholder: 'Describe the business problem or market opportunity addressed.' },
          { id: 'executive_summary', label: 'Executive Summary', type: 'textarea', placeholder: 'High-level summary of expected outcomes.' }
        ]
      },
      {
        id: 'charter_objectives',
        title: '2. PROJECT OBJECTIVES',
        description: 'Quantifiable goals and targets',
        fields: [
          {
            id: 'objectives_table',
            label: 'Objectives Matrix',
            type: 'table',
            columns: [
              { id: 'objective', label: 'Objective' },
              { id: 'target_kpi', label: 'Target / KPI' },
              { id: 'priority', label: 'Priority', type: 'select', options: ['High', 'Medium', 'Low'] }
            ]
          }
        ]
      },
      {
        id: 'charter_scope',
        title: '3. SCOPE OF WORK',
        description: 'In-scope and out-of-scope boundaries',
        fields: [
          { id: 'in_scope', label: 'In-Scope Items', type: 'textarea', placeholder: 'List all core modules, features, and user workflows.' },
          { id: 'out_of_scope', label: 'Out-of-Scope Items', type: 'textarea', placeholder: 'List excluded features, third-party legacy integrations, etc.' },
          { id: 'assumptions_constraints', label: 'Assumptions & Constraints', type: 'textarea' },
          { id: 'success_criteria', label: 'Success Criteria', type: 'textarea' }
        ]
      },
      {
        id: 'charter_deliverables',
        title: '4. KEY DELIVERABLES & MILESTONES',
        description: 'Major project milestones and timeline',
        fields: [
          {
            id: 'deliverables_table',
            label: 'Key Deliverables Table',
            type: 'table',
            columns: [
              { id: 'deliverable', label: 'Deliverable' },
              { id: 'description', label: 'Description' },
              { id: 'target_date', label: 'Target Date', type: 'date' },
              { id: 'owner', label: 'Owner' }
            ]
          },
          {
            id: 'milestones_table',
            label: 'Project Timeline & Milestones',
            type: 'table',
            columns: [
              { id: 'milestone', label: 'Milestone' },
              { id: 'target_date', label: 'Target Date', type: 'date' },
              { id: 'owner', label: 'Owner' }
            ]
          }
        ]
      },
      {
        id: 'charter_risks_roles',
        title: '5. BUDGET, RISKS & STAKEHOLDERS',
        description: 'Budget estimates, risk log, and governance roles',
        fields: [
          {
            id: 'budget_table',
            label: 'Budget & Resource Estimates',
            type: 'table',
            columns: [
              { id: 'item', label: 'Resource / Cost Item' },
              { id: 'estimate', label: 'Estimate' },
              { id: 'notes', label: 'Notes' }
            ]
          },
          {
            id: 'risks_table',
            label: 'Risks & Constraints Matrix',
            type: 'table',
            columns: [
              { id: 'risk', label: 'Risk / Constraint' },
              { id: 'impact', label: 'Impact', type: 'select', options: ['High', 'Moderate', 'Low'] },
              { id: 'mitigation', label: 'Mitigation Strategy' }
            ]
          },
          {
            id: 'roles_table',
            label: 'Project Roles & Stakeholders',
            type: 'table',
            columns: [
              { id: 'name', label: 'Name' },
              { id: 'role', label: 'Role' },
              { id: 'responsibility', label: 'Responsibility' }
            ]
          }
        ]
      },
      {
        id: 'approvals',
        title: '6. APPROVAL & SIGN-OFF',
        description: 'Formal stakeholder sign-offs',
        fields: [
          { id: 'cto_approval', label: 'CTO Sign-off Status', type: 'select', options: ['Pending Review', 'Approved', 'Revisions Requested'] },
          { id: 'approval_date', label: 'Approval Date', type: 'date' },
          { id: 'approval_notes', label: 'CTO / Sponsor Remarks', type: 'textarea' }
        ]
      }
    ],
    dependencies: [],
    editableByRoles: ['CEO', 'MD', 'COO', 'CTO', 'CIO'],
    taskGeneratable: false,
  },

  // ── 2. Project Plan ──
  {
    id: 2,
    number: '2',
    name: 'Project Plan',
    shortName: 'Project Plan',
    phase: 'Plan',
    ownerRole: 'Project Manager',
    description: 'Comprehensive roadmap detailing work breakdown structure (WBS), resource allocations, and dependency Gantt schedule.',
    sections: [
      {
        id: 'plan_summary',
        title: '1. EXECUTIVE SUMMARY & ROADMAP',
        description: 'High level project roadmap and timeline boundaries',
        fields: [
          { id: 'executive_summary', label: 'Executive Summary', type: 'textarea' },
          { id: 'planned_start', label: 'Planned Start Date', type: 'date' },
          { id: 'planned_end', label: 'Planned Finish Date', type: 'date' },
          { id: 'sprint_cadence', label: 'Sprint Cadence', type: 'select', options: ['1 Week', '2 Weeks', '3 Weeks', '1 Month'] }
        ]
      },
      {
        id: 'plan_wbs',
        title: '2. WORK BREAKDOWN STRUCTURE (WBS)',
        description: 'Detailed work breakdown schedule',
        fields: [
          {
            id: 'wbs_table',
            label: 'Work Breakdown Structure Matrix',
            type: 'table',
            columns: [
              { id: 'code', label: 'WBS Code' },
              { id: 'task_name', label: 'Task / Deliverable Name' },
              { id: 'owner', label: 'Owner / Lead' },
              { id: 'start_date', label: 'Start Date', type: 'date' },
              { id: 'end_date', label: 'End Date', type: 'date' },
              { id: 'dependencies', label: 'Dependencies' }
            ]
          },
          { id: 'wbs_summary', label: 'WBS Summary & Notes', type: 'textarea' }
        ]
      },
      {
        id: 'plan_resources',
        title: '3. RESOURCE ALLOCATION',
        description: 'Team allocations and responsibilities',
        fields: [
          {
            id: 'resource_table',
            label: 'Resource Allocation Table',
            type: 'table',
            columns: [
              { id: 'role', label: 'Role / Designation' },
              { id: 'name', label: 'Member Name' },
              { id: 'allocation', label: 'Allocation %' },
              { id: 'responsibilities', label: 'Responsibilities' }
            ]
          },
          { id: 'critical_path', label: 'Critical Path & Risk Management', type: 'textarea' }
        ]
      },
      {
        id: 'plan_governance',
        title: '4. COMMUNICATION & GOVERNANCE',
        description: 'Project communication protocol and escalation path',
        fields: [
          {
            id: 'comm_table',
            label: 'Communication Matrix',
            type: 'table',
            columns: [
              { id: 'meeting', label: 'Meeting / Report' },
              { id: 'frequency', label: 'Frequency' },
              { id: 'audience', label: 'Audience' },
              { id: 'owner', label: 'Owner' }
            ]
          }
        ]
      },
      {
        id: 'approvals',
        title: '5. APPROVAL',
        description: 'Sign-off and baseline freeze',
        fields: [
          { id: 'cto_approval', label: 'CTO Sign-off Status', type: 'select', options: ['Pending Review', 'Approved', 'Revisions Requested'] },
          { id: 'approval_date', label: 'Approval Date', type: 'date' },
          { id: 'approval_notes', label: 'CTO / PM Remarks', type: 'textarea' }
        ]
      }
    ],
    dependencies: [1],
    editableByRoles: ['CEO', 'MD', 'COO', 'CTO', 'CIO', 'PM'],
    taskGeneratable: false,
    autoFillSources: [{ sourceTemplateId: 1, fieldMappings: { 'wbs_summary': 'in_scope', 'planned_start': 'approval_date' } }],
  },

  // ── 3. Software Requirements Specification (SRS) ──
  {
    id: 3,
    number: '3',
    name: 'Software Requirements Spec (SRS)',
    shortName: 'SRS',
    phase: 'Requirements',
    ownerRole: 'PM / Business Analyst',
    description: 'Detailed software specifications covering functional behaviors, non-functional requirements, data flows, and constraints.',
    sections: [
      {
        id: 'srs_intro',
        title: '1. INTRODUCTION',
        description: 'Purpose, scope, and domain definitions',
        fields: [
          { id: 'purpose', label: '1.1 Purpose', type: 'textarea' },
          { id: 'scope', label: '1.2 Scope & Boundaries', type: 'textarea' },
          {
            id: 'definitions_table',
            label: '1.3 Definitions, Acronyms & Abbreviations',
            type: 'table',
            columns: [
              { id: 'term', label: 'Term' },
              { id: 'definition', label: 'Definition' }
            ]
          }
        ]
      },
      {
        id: 'srs_fr',
        title: '2. FUNCTIONAL REQUIREMENTS',
        description: 'Functional requirements matrix and behavior specs',
        fields: [
          {
            id: 'fr_table',
            label: 'Functional Requirements Table',
            type: 'table',
            columns: [
              { id: 'req_id', label: 'Req ID' },
              { id: 'description', label: 'Requirement Description' },
              { id: 'priority', label: 'Priority', type: 'select', options: ['Must Have', 'Should Have', 'Nice to Have'] },
              { id: 'source', label: 'Source' }
            ]
          },
          { id: 'fr_workflows', label: 'Business Logic & Workflow Details', type: 'textarea' }
        ]
      },
      {
        id: 'srs_nfr',
        title: '3. NON-FUNCTIONAL REQUIREMENTS',
        description: 'Performance, security, availability, and SLA',
        fields: [
          {
            id: 'nfr_table',
            label: 'Non-Functional Requirements Table',
            type: 'table',
            columns: [
              { id: 'category', label: 'Category' },
              { id: 'requirement', label: 'Requirement' },
              { id: 'acceptance_criteria', label: 'Acceptance Criteria' }
            ]
          }
        ]
      },
      {
        id: 'srs_interfaces',
        title: '4. EXTERNAL INTERFACES & CONSTRAINTS',
        description: 'Hardware, software, and user interface requirements',
        fields: [
          { id: 'interface_requirements', label: '4. External Interface Requirements', type: 'textarea' },
          { id: 'assumptions_constraints', label: '5. Assumptions & Constraints', type: 'textarea' }
        ]
      },
      {
        id: 'approvals',
        title: '5. APPROVAL',
        description: 'Sign-off and requirements lock',
        fields: [
          { id: 'cto_approval', label: 'CTO Sign-off Status', type: 'select', options: ['Pending Review', 'Approved', 'Revisions Requested'] },
          { id: 'approval_date', label: 'Approval Date', type: 'date' },
          { id: 'approval_notes', label: 'Sign-off Remarks', type: 'textarea' }
        ]
      }
    ],
    dependencies: [1, 2],
    editableByRoles: ['PM', 'CTO', 'CIO'],
    taskGeneratable: false,
    autoFillSources: [
      { sourceTemplateId: 1, fieldMappings: { 'scope': 'in_scope', 'purpose': 'purpose' } },
      { sourceTemplateId: 2, fieldMappings: { 'fr_workflows': 'wbs_summary' } },
    ],
  },

  // ── 4. Business Requirement Document (BRD) ──
  {
    id: 4,
    number: '4',
    name: 'Business Requirement Doc (BRD)',
    shortName: 'BRD',
    phase: 'Requirements',
    ownerRole: 'Business Owner',
    description: 'High-level business objectives, ROI models, regulatory compliance constraints, and stakeholder acceptance criteria.',
    sections: [
      {
        id: 'brd_objectives',
        title: '1. BUSINESS OBJECTIVES & BACKGROUND',
        description: 'Strategic value and problem definition',
        fields: [
          { id: 'business_problem', label: '1. Business Objective & Need', type: 'textarea' },
          { id: 'background', label: '2. Background & Market Context', type: 'textarea' },
          { id: 'expected_roi', label: 'Expected Business Value / ROI', type: 'textarea' }
        ]
      },
      {
        id: 'brd_reqs',
        title: '2. BUSINESS REQUIREMENTS',
        description: 'Core business requirement specifications',
        fields: [
          {
            id: 'business_reqs_table',
            label: '3. Business Requirements Matrix',
            type: 'table',
            columns: [
              { id: 'req_id', label: 'Req ID' },
              { id: 'requirement', label: 'Requirement' },
              { id: 'priority', label: 'Priority', type: 'select', options: ['High', 'Medium', 'Low'] },
              { id: 'justification', label: 'Justification' }
            ]
          }
        ]
      },
      {
        id: 'brd_stakeholders',
        title: '3. STAKEHOLDERS & GOVERNANCE',
        description: 'Stakeholder mapping and constraints',
        fields: [
          {
            id: 'stakeholders_table',
            label: '4. Stakeholders Table',
            type: 'table',
            columns: [
              { id: 'name', label: 'Name' },
              { id: 'role', label: 'Role' },
              { id: 'department', label: 'Department' }
            ]
          },
          { id: 'assumptions', label: '5. Assumptions', type: 'textarea' },
          { id: 'constraints', label: '6. Constraints', type: 'textarea' },
          { id: 'success_criteria', label: '7. Success Criteria', type: 'textarea' }
        ]
      },
      {
        id: 'approvals',
        title: '4. APPROVAL',
        description: 'Business sign-off',
        fields: [
          { id: 'cto_approval', label: 'CTO Sign-off Status', type: 'select', options: ['Pending Review', 'Approved', 'Revisions Requested'] },
          { id: 'approval_date', label: 'Approval Date', type: 'date' },
          { id: 'approval_notes', label: 'Sign-off Remarks', type: 'textarea' }
        ]
      }
    ],
    dependencies: [1, 2, 3],
    editableByRoles: ['CEO', 'MD', 'COO', 'CTO', 'CIO'],
    taskGeneratable: false,
    autoFillSources: [
      { sourceTemplateId: 1, fieldMappings: { 'business_problem': 'purpose' } },
      { sourceTemplateId: 3, fieldMappings: { 'expected_roi': 'fr_workflows' } },
    ]
  },

  // ── 5. Functional Specification ──
  {
    id: 5,
    number: '5',
    name: 'Functional Specification',
    shortName: 'Functional Spec',
    phase: 'Design',
    ownerRole: 'PM / Tech Lead',
    description: 'Screen-by-screen UX interaction logic, field validations, status transitions, and user error handling rules.',
    sections: [
      {
        id: 'fds_overview',
        title: '1. OVERVIEW & FUNCTIONAL REQUIREMENTS',
        description: 'Functional boundaries and specs',
        fields: [
          { id: 'overview', label: '1. Overview', type: 'textarea' },
          {
            id: 'func_reqs_table',
            label: '2. Functional Requirements Table',
            type: 'table',
            columns: [
              { id: 'func_id', label: 'Func ID' },
              { id: 'description', label: 'Description' },
              { id: 'priority', label: 'Priority', type: 'select', options: ['High', 'Medium', 'Low'] }
            ]
          }
        ]
      },
      {
        id: 'fds_roles_usecases',
        title: '2. USER ROLES & USE CASES',
        description: 'Role access permissions and use cases',
        fields: [
          {
            id: 'roles_permissions_table',
            label: '3. User Roles & Permissions Table',
            type: 'table',
            columns: [
              { id: 'role', label: 'Role' },
              { id: 'permissions', label: 'Permissions' },
              { id: 'notes', label: 'Notes' }
            ]
          },
          {
            id: 'use_cases_table',
            label: '4. Use Cases Table',
            type: 'table',
            columns: [
              { id: 'use_case_id', label: 'Use Case ID' },
              { id: 'actor', label: 'Actor' },
              { id: 'description', label: 'Description' },
              { id: 'preconditions', label: 'Preconditions' },
              { id: 'expected_outcome', label: 'Expected Outcome' }
            ]
          },
          { id: 'workflow_process', label: '5. Workflow / Process Description', type: 'textarea' }
        ]
      },
      {
        id: 'approvals',
        title: '3. APPROVAL',
        description: 'Functional sign-off',
        fields: [
          { id: 'cto_approval', label: 'CTO Sign-off Status', type: 'select', options: ['Pending Review', 'Approved', 'Revisions Requested'] },
          { id: 'approval_date', label: 'Approval Date', type: 'date' },
          { id: 'approval_notes', label: 'Sign-off Remarks', type: 'textarea' }
        ]
      }
    ],
    dependencies: [1, 2, 3, 4],
    editableByRoles: ['PM', 'TL', 'CTO', 'CIO'],
    taskGeneratable: true,
    autoFillSources: [{ sourceTemplateId: 3, fieldMappings: { 'overview': 'purpose', 'workflow_process': 'fr_workflows' } }],
  },

  // ── 6. Technical Specification ──
  {
    id: 6,
    number: '6',
    name: 'Technical Specification',
    shortName: 'Technical Spec',
    phase: 'Design',
    ownerRole: 'Tech Lead',
    description: 'Engineering blueprint covering API endpoints, data models, schema definitions, algorithms, and integration hooks.',
    sections: [
      {
        id: 'tds_tech_stack',
        title: '1. OVERVIEW & TECHNOLOGY STACK',
        description: 'System overview and framework layers',
        fields: [
          { id: 'overview', label: '1. Overview', type: 'textarea' },
          {
            id: 'tech_stack_table',
            label: '2. Technology Stack Table',
            type: 'table',
            columns: [
              { id: 'layer', label: 'Layer' },
              { id: 'technology', label: 'Technology' },
              { id: 'version', label: 'Version' },
              { id: 'notes', label: 'Notes' }
            ]
          }
        ]
      },
      {
        id: 'tds_components_apis',
        title: '2. SYSTEM COMPONENTS & APIS',
        description: 'Component architecture and REST API endpoints',
        fields: [
          {
            id: 'components_table',
            label: '3. System Components Table',
            type: 'table',
            columns: [
              { id: 'component', label: 'Component' },
              { id: 'responsibility', label: 'Responsibility' },
              { id: 'dependencies', label: 'Dependencies' }
            ]
          },
          { id: 'data_model', label: '4. Data Model & Schema Notes', type: 'textarea' },
          {
            id: 'api_table',
            label: '5. API Specifications Table',
            type: 'table',
            columns: [
              { id: 'endpoint', label: 'Endpoint' },
              { id: 'method', label: 'Method', type: 'select', options: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'] },
              { id: 'description', label: 'Description' },
              { id: 'request_response', label: 'Request / Response Payload' }
            ]
          },
          { id: 'security_considerations', label: '6. Security Considerations', type: 'textarea' }
        ]
      },
      {
        id: 'approvals',
        title: '3. APPROVAL',
        description: 'Engineering sign-off',
        fields: [
          { id: 'cto_approval', label: 'CTO Sign-off Status', type: 'select', options: ['Pending Review', 'Approved', 'Revisions Requested'] },
          { id: 'approval_date', label: 'Approval Date', type: 'date' },
          { id: 'approval_notes', label: 'Sign-off Remarks', type: 'textarea' }
        ]
      }
    ],
    dependencies: [1, 2, 3, 4],
    editableByRoles: ['PM', 'TL', 'CTO', 'CIO'],
    taskGeneratable: true,
    autoFillSources: [{ sourceTemplateId: 3, fieldMappings: { 'overview': 'scope' } }],
  },

  // ── 7. Architecture Document ──
  {
    id: 7,
    number: '7',
    name: 'Architecture Document',
    shortName: 'Architecture Doc',
    phase: 'Design',
    ownerRole: 'Tech Lead / Architect',
    description: 'System topology, cloud infrastructure diagrams, service decoupling, caching tiers, and scalability architecture.',
    sections: [
      {
        id: 'arch_overview',
        title: '1. SYSTEM OVERVIEW & TOPOLOGY',
        description: 'High-level topology and architecture patterns',
        fields: [
          { id: 'system_overview', label: '1. System Overview', type: 'textarea' },
          { id: 'architecture_diagram', label: '2. Architecture Diagram & Notes', type: 'textarea' },
          {
            id: 'components_table',
            label: '3. Components Matrix',
            type: 'table',
            columns: [
              { id: 'component', label: 'Component' },
              { id: 'description', label: 'Description' },
              { id: 'technology', label: 'Technology' },
              { id: 'owner', label: 'Owner' }
            ]
          }
        ]
      },
      {
        id: 'arch_stack_scalability',
        title: '2. DATA FLOW & TECHNOLOGY STACK',
        description: 'Data pipelines and scalability constraints',
        fields: [
          { id: 'data_flow', label: '4. Data Flow Description', type: 'textarea' },
          {
            id: 'tech_stack_table',
            label: '5. Technology Stack Table',
            type: 'table',
            columns: [
              { id: 'layer', label: 'Layer' },
              { id: 'technology', label: 'Technology' }
            ]
          },
          { id: 'scalability_performance', label: '6. Scalability & Performance', type: 'textarea' },
          { id: 'security_architecture', label: '7. Security Architecture', type: 'textarea' }
        ]
      },
      {
        id: 'approvals',
        title: '3. APPROVAL',
        description: 'Architecture review and approval',
        fields: [
          { id: 'cto_approval', label: 'CTO Sign-off Status', type: 'select', options: ['Pending Review', 'Approved', 'Revisions Requested'] },
          { id: 'approval_date', label: 'Approval Date', type: 'date' },
          { id: 'approval_notes', label: 'Architect / CTO Remarks', type: 'textarea' }
        ]
      }
    ],
    dependencies: [1, 2, 3, 4],
    editableByRoles: ['PM', 'TL', 'CTO', 'CIO'],
    taskGeneratable: true,
    autoFillSources: [{ sourceTemplateId: 6, fieldMappings: { 'system_overview': 'overview' } }],
  },

  // ── 8. UI/UX Design Document ──
  {
    id: 8,
    number: '8',
    name: 'UI/UX Design Document',
    shortName: 'UI/UX Design',
    phase: 'Design',
    ownerRole: 'Designer',
    description: 'Figma design tokens, typography scales, responsive breakpoints, component specs, and design system adherence.',
    sections: [
      {
        id: 'ui_overview',
        title: '1. DESIGN OVERVIEW & PRINCIPLES',
        description: 'Visual language and design guidelines',
        fields: [
          { id: 'design_overview', label: '1. Design Overview', type: 'textarea' },
          { id: 'design_principles', label: '2. Design Principles', type: 'textarea' }
        ]
      },
      {
        id: 'ui_screens_tokens',
        title: '2. SCREENS & DESIGN TOKENS',
        description: 'Screen specifications and design system tokens',
        fields: [
          {
            id: 'screens_table',
            label: '3. Screens / Wireframes Table',
            type: 'table',
            columns: [
              { id: 'screen_name', label: 'Screen Name' },
              { id: 'description', label: 'Description' },
              { id: 'reference_link', label: 'Reference / Link' }
            ]
          },
          {
            id: 'design_tokens_table',
            label: '4. Design Tokens & Specifications Table',
            type: 'table',
            columns: [
              { id: 'element', label: 'Element' },
              { id: 'specification', label: 'Specification' }
            ]
          }
        ]
      },
      {
        id: 'approvals',
        title: '3. APPROVAL',
        description: 'Design sign-off',
        fields: [
          { id: 'cto_approval', label: 'CTO Sign-off Status', type: 'select', options: ['Pending Review', 'Approved', 'Revisions Requested'] },
          { id: 'approval_date', label: 'Approval Date', type: 'date' },
          { id: 'approval_notes', label: 'Design Sign-off Remarks', type: 'textarea' }
        ]
      }
    ],
    dependencies: [1, 2, 3, 4],
    editableByRoles: ['PM', 'TL', 'CTO', 'CIO', 'Employee'],
    taskGeneratable: true,
    autoFillSources: [{ sourceTemplateId: 5, fieldMappings: { 'design_overview': 'overview' } }],
  },

  // ── 9. Sprint Plan ──
  {
    id: 9,
    number: '9',
    name: 'Sprint Plan',
    shortName: 'Sprint Plan',
    phase: 'Build',
    ownerRole: 'Scrum Master / TL',
    description: 'Sprint backlog commitment, team capacity calculations, story point estimations, and sprint goals.',
    sections: [
      {
        id: 'sprint_metadata',
        title: '1. SPRINT IDENTIFICATION',
        description: 'Sprint parameters and primary goal',
        fields: [
          { id: 'sprint_number', label: 'Sprint Number', type: 'text', placeholder: 'Sprint 1' },
          { id: 'sprint_duration', label: 'Sprint Duration', type: 'text', placeholder: '2 Weeks (14 Days)' },
          { id: 'sprint_goal', label: 'Sprint Goal', type: 'textarea', placeholder: 'Primary business deliverable for this sprint.' },
          { id: 'scrum_master', label: 'Scrum Master / Team Lead', type: 'text' }
        ]
      },
      {
        id: 'sprint_backlog_capacity',
        title: '2. SPRINT BACKLOG & TEAM CAPACITY',
        description: 'Story commitments and engineering capacity',
        fields: [
          {
            id: 'backlog_table',
            label: 'Sprint Backlog Table',
            type: 'table',
            columns: [
              { id: 'story_id', label: 'Story ID' },
              { id: 'user_story', label: 'User Story' },
              { id: 'priority', label: 'Priority', type: 'select', options: ['P0', 'P1', 'P2'] },
              { id: 'story_points', label: 'Story Points' },
              { id: 'assignee', label: 'Assignee' },
              { id: 'status', label: 'Status', type: 'select', options: ['To Do', 'In Progress', 'Done'] }
            ]
          },
          {
            id: 'capacity_table',
            label: 'Team Capacity Table',
            type: 'table',
            columns: [
              { id: 'team_member', label: 'Team Member' },
              { id: 'availability', label: 'Availability (days)' },
              { id: 'planned_capacity', label: 'Planned Capacity (pts/hrs)' }
            ]
          }
        ]
      },
      {
        id: 'sprint_execution_tracking',
        title: '3. TASK EXECUTION, TIME TRACKING & RESUBMISSION LOGS',
        description: 'Actual work hours logged, delays, submission notes and supervisor feedback history',
        fields: [
          {
            id: 'execution_table',
            label: 'Task & Subtask Work Duration Table',
            type: 'table',
            columns: [
              { id: 'feature_name', label: 'Feature Module' },
              { id: 'task_title', label: 'Task Directive / Subtask' },
              { id: 'subtask_assignee', label: 'Assignee & Role' },
              { id: 'supervisor', label: 'Supervisor / Lead' },
              { id: 'work_duration', label: 'Actual Logged Time' },
              { id: 'break_delays', label: 'Break / Delays' },
              { id: 'status', label: 'Status' }
            ]
          },
          {
            id: 'audit_trail_table',
            label: 'Submissions, Resubmissions & Remarks Audit Trail',
            type: 'table',
            columns: [
              { id: 'timestamp', label: 'Date / Timestamp' },
              { id: 'task_item', label: 'Task Item' },
              { id: 'action_type', label: 'Workflow Action' },
              { id: 'actor', label: 'Actor / Reviewer' },
              { id: 'remarks', label: 'Remarks / Feedback Notes' }
            ]
          }
        ]
      },
      {
        id: 'approvals',
        title: '4. APPROVAL & SIGN-OFF',
        description: 'Sprint commitment and verification sign-off',
        fields: [
          { id: 'cto_approval', label: 'CTO Sign-off Status', type: 'select', options: ['Pending Review', 'Approved', 'Revisions Requested'] },
          { id: 'approval_date', label: 'Approval Date', type: 'date' },
          { id: 'approval_notes', label: 'Scrum Master / CTO Remarks', type: 'textarea' }
        ]
      }
    ],
    dependencies: [2, 5, 6, 7, 8],
    editableByRoles: ['PM', 'TL', 'CTO', 'CIO'],
    taskGeneratable: false,
    autoFillSources: [{ sourceTemplateId: 2, fieldMappings: { 'sprint_goal': 'critical_path' } }],
  },

  // ── 10. Test Plan ──
  {
    id: 10,
    number: '10',
    name: 'Test Plan',
    shortName: 'Test Plan',
    phase: 'Test',
    ownerRole: 'QA Lead',
    description: 'Quality assurance strategy, testing scopes, environment requirements, entry/exit criteria, and resource matrix.',
    sections: [
      {
        id: 'test_strategy_scope',
        title: '1. SCOPE & TEST STRATEGY',
        description: 'Testing scope, strategy, and test environment',
        fields: [
          { id: 'test_scope', label: '1. Scope of Testing', type: 'textarea' },
          { id: 'test_strategy', label: '2. Test Strategy', type: 'textarea' },
          {
            id: 'test_env_table',
            label: '3. Test Environment Table',
            type: 'table',
            columns: [
              { id: 'environment', label: 'Environment' },
              { id: 'configuration', label: 'Configuration' },
              { id: 'purpose', label: 'Purpose' }
            ]
          }
        ]
      },
      {
        id: 'test_criteria_schedule',
        title: '2. CRITERIA, ROLES & SCHEDULE',
        description: 'Entry/Exit gates, roles, and testing schedule',
        fields: [
          { id: 'entry_exit_criteria', label: '4. Entry & Exit Criteria', type: 'textarea' },
          {
            id: 'roles_table',
            label: '5. Roles & Responsibilities Table',
            type: 'table',
            columns: [
              { id: 'name', label: 'Name' },
              { id: 'role', label: 'Role' },
              { id: 'responsibility', label: 'Responsibility' }
            ]
          },
          {
            id: 'test_schedule_table',
            label: '6. Test Schedule Table',
            type: 'table',
            columns: [
              { id: 'test_phase', label: 'Test Phase' },
              { id: 'start_date', label: 'Start Date', type: 'date' },
              { id: 'end_date', label: 'End Date', type: 'date' }
            ]
          }
        ]
      },
      {
        id: 'approvals',
        title: '3. APPROVAL',
        description: 'QA sign-off',
        fields: [
          { id: 'cto_approval', label: 'CTO Sign-off Status', type: 'select', options: ['Pending Review', 'Approved', 'Revisions Requested'] },
          { id: 'approval_date', label: 'Approval Date', type: 'date' },
          { id: 'approval_notes', label: 'QA Lead / CTO Remarks', type: 'textarea' }
        ]
      }
    ],
    dependencies: [3, 5, 9],
    editableByRoles: ['PM', 'TL', 'CTO', 'CIO', 'Employee'],
    taskGeneratable: false,
    autoFillSources: [{ sourceTemplateId: 3, fieldMappings: { 'test_scope': 'scope' } }],
  },

  // ── 11. Test Cases ──
  {
    id: 11,
    number: '11',
    name: 'Test Cases',
    shortName: 'Test Cases',
    phase: 'Test',
    ownerRole: 'QA / Employees',
    description: 'Detailed test suite covering test steps, pre-conditions, input datasets, expected results, and execution statuses.',
    sections: [
      {
        id: 'test_cases_suite',
        title: '1. TEST CASES SUITE',
        description: 'Detailed verification test cases',
        fields: [
          { id: 'module_name', label: 'Module / Feature Name', type: 'text' },
          {
            id: 'test_cases_table',
            label: 'Test Cases Execution Matrix',
            type: 'table',
            columns: [
              { id: 'test_case_id', label: 'Test Case ID' },
              { id: 'description', label: 'Description' },
              { id: 'pre_conditions', label: 'Pre-conditions' },
              { id: 'test_steps', label: 'Test Steps' },
              { id: 'expected_result', label: 'Expected Result' },
              { id: 'actual_result', label: 'Actual Result' },
              { id: 'status', label: 'Status', type: 'select', options: ['Pass', 'Fail', 'Blocked', 'Not Run'] }
            ]
          }
        ]
      },
      {
        id: 'approvals',
        title: '2. APPROVAL',
        description: 'Test case execution sign-off',
        fields: [
          { id: 'cto_approval', label: 'CTO Sign-off Status', type: 'select', options: ['Pending Review', 'Approved', 'Revisions Requested'] },
          { id: 'approval_date', label: 'Approval Date', type: 'date' },
          { id: 'approval_notes', label: 'QA / Reviewer Remarks', type: 'textarea' }
        ]
      }
    ],
    dependencies: [10],
    editableByRoles: ['PM', 'TL', 'CTO', 'CIO', 'Employee'],
    taskGeneratable: false,
    autoFillSources: [{ sourceTemplateId: 10, fieldMappings: { 'module_name': 'test_scope' } }],
  },

  // ── 12. UAT Sign-off ──
  {
    id: 12,
    number: '12',
    name: 'UAT Sign-off',
    shortName: 'UAT Sign-off',
    phase: 'Test',
    ownerRole: 'Business Owner',
    description: 'Formal business user acceptance testing sign-off, scenario verification log, and issues clearance report.',
    sections: [
      {
        id: 'uat_summary_section',
        title: '1. UAT SUMMARY & SCENARIOS',
        description: 'UAT summary and verification scenarios',
        fields: [
          { id: 'uat_round', label: 'UAT Round', type: 'text', placeholder: 'Round 1 (Final)' },
          { id: 'uat_summary', label: '1. UAT Summary', type: 'textarea' },
          {
            id: 'scenarios_table',
            label: '2. Test Scenarios Table',
            type: 'table',
            columns: [
              { id: 'scenario_id', label: 'Scenario ID' },
              { id: 'description', label: 'Description' },
              { id: 'status', label: 'Status', type: 'select', options: ['Accepted', 'Rejected', 'Conditional'] },
              { id: 'comments', label: 'Comments' }
            ]
          }
        ]
      },
      {
        id: 'uat_issues_declaration',
        title: '2. ISSUES LOG & DECLARATION',
        description: 'Resolved issues log and formal sign-off declaration',
        fields: [
          {
            id: 'issues_table',
            label: '3. Issues Log Table',
            type: 'table',
            columns: [
              { id: 'issue_id', label: 'Issue ID' },
              { id: 'description', label: 'Description' },
              { id: 'severity', label: 'Severity', type: 'select', options: ['Critical', 'Major', 'Minor'] },
              { id: 'status', label: 'Status', type: 'select', options: ['Resolved', 'Open', 'Deferred'] },
              { id: 'owner', label: 'Owner' }
            ]
          },
          { id: 'sign_off_declaration', label: '4. Sign-Off Declaration', type: 'textarea', defaultValue: 'The business team confirms that the software meets user acceptance criteria.' }
        ]
      },
      {
        id: 'approvals',
        title: '3. SIGN-OFF',
        description: 'Business and PM formal sign-off',
        fields: [
          { id: 'cto_approval', label: 'CTO Sign-off Status', type: 'select', options: ['Pending Review', 'Approved', 'Revisions Requested'] },
          { id: 'approval_date', label: 'Approval Date', type: 'date' },
          { id: 'approval_notes', label: 'Business Owner Remarks', type: 'textarea' }
        ]
      }
    ],
    dependencies: [11],
    editableByRoles: ['CEO', 'MD', 'COO', 'CTO', 'CIO', 'PM'],
    taskGeneratable: false,
    autoFillSources: [{ sourceTemplateId: 4, fieldMappings: { 'uat_summary': 'business_problem' } }],
  },

  // ── 13. Deployment Checklist ──
  {
    id: 13,
    number: '13',
    name: 'Deployment Checklist',
    shortName: 'Deployment Checklist',
    phase: 'Release',
    ownerRole: 'Deployment Owner',
    description: 'Production release checklist covering pre-deployment verification, execution steps, post-release smoke tests, and rollback plans.',
    sections: [
      {
        id: 'deploy_pre_and_steps',
        title: '1. PRE-DEPLOYMENT & STEPS',
        description: 'Pre-flight checks and sequential deployment steps',
        fields: [
          { id: 'release_version', label: 'Release Version', type: 'text', placeholder: 'v1.0.0-PROD' },
          { id: 'deployment_date', label: 'Deployment Date', type: 'date' },
          { id: 'deployment_owner', label: 'Deployment Owner', type: 'text' },
          {
            id: 'pre_deployment_table',
            label: 'Pre-Deployment Checklist Table',
            type: 'table',
            columns: [
              { id: 'item', label: 'Item' },
              { id: 'status', label: 'Status', type: 'select', options: ['Ready', 'Pending', 'N/A'] },
              { id: 'owner', label: 'Owner' },
              { id: 'remarks', label: 'Remarks' }
            ]
          },
          {
            id: 'deployment_steps_table',
            label: 'Deployment Steps Table',
            type: 'table',
            columns: [
              { id: 'step_no', label: 'Step No.' },
              { id: 'action', label: 'Action' },
              { id: 'owner', label: 'Owner' },
              { id: 'status', label: 'Status', type: 'select', options: ['Completed', 'In Progress', 'Pending'] }
            ]
          }
        ]
      },
      {
        id: 'deploy_post_and_rollback',
        title: '2. POST-VERIFICATION & ROLLBACK',
        description: 'Post-deployment verification and rollback procedure',
        fields: [
          {
            id: 'post_deployment_table',
            label: 'Post-Deployment Verification Table',
            type: 'table',
            columns: [
              { id: 'item', label: 'Item' },
              { id: 'status', label: 'Status', type: 'select', options: ['Verified', 'Failed', 'Pending'] },
              { id: 'verified_by', label: 'Verified By' }
            ]
          },
          { id: 'rollback_plan', label: 'Rollback Plan', type: 'textarea', placeholder: 'Step-by-step contingency procedure if deployment fails.' }
        ]
      },
      {
        id: 'approvals',
        title: '3. SIGN-OFF',
        description: 'Release deployment approval',
        fields: [
          { id: 'cto_approval', label: 'CTO Sign-off Status', type: 'select', options: ['Pending Review', 'Approved', 'Revisions Requested'] },
          { id: 'approval_date', label: 'Approval Date', type: 'date' },
          { id: 'approval_notes', label: 'Deployment Sign-off Remarks', type: 'textarea' }
        ]
      }
    ],
    dependencies: [12],
    editableByRoles: ['PM', 'TL', 'CTO', 'CIO'],
    taskGeneratable: false,
    autoFillSources: [{ sourceTemplateId: 12, fieldMappings: { 'release_version': 'uat_round' } }],
  },

  // ── 14. Go-Live Checklist ──
  {
    id: 14,
    number: '14',
    name: 'Go-Live Checklist',
    shortName: 'Go-Live Checklist',
    phase: 'Release',
    ownerRole: 'PM',
    description: 'Operational readiness review, customer communication plan, 24/7 hypercare support schedule, and Go/No-Go decision.',
    sections: [
      {
        id: 'golive_readiness_comm',
        title: '1. READINESS & COMMUNICATION',
        description: 'Go-live readiness and communication plan',
        fields: [
          { id: 'go_live_date', label: 'Go-Live Date', type: 'date' },
          {
            id: 'readiness_table',
            label: 'Readiness Checklist Table',
            type: 'table',
            columns: [
              { id: 'item', label: 'Item' },
              { id: 'status', label: 'Status', type: 'select', options: ['Go', 'No-Go', 'Pending'] },
              { id: 'owner', label: 'Owner' },
              { id: 'remarks', label: 'Remarks' }
            ]
          },
          {
            id: 'comm_plan_table',
            label: 'Communication Plan Table',
            type: 'table',
            columns: [
              { id: 'audience', label: 'Audience' },
              { id: 'message', label: 'Message' },
              { id: 'channel', label: 'Channel' },
              { id: 'owner', label: 'Owner' }
            ]
          }
        ]
      },
      {
        id: 'golive_decision',
        title: '2. SUPPORT & GO / NO-GO DECISION',
        description: 'Support readiness and executive decision',
        fields: [
          { id: 'support_plan', label: 'Support Plan & Hypercare', type: 'textarea' },
          { id: 'go_no_go_decision', label: 'Go / No-Go Decision', type: 'textarea' }
        ]
      },
      {
        id: 'approvals',
        title: '3. SIGN-OFF',
        description: 'Official go-live authorization',
        fields: [
          { id: 'cto_approval', label: 'CTO Sign-off Status', type: 'select', options: ['Pending Review', 'Approved', 'Revisions Requested'] },
          { id: 'approval_date', label: 'Approval Date', type: 'date' },
          { id: 'approval_notes', label: 'Executive Authorization Remarks', type: 'textarea' }
        ]
      }
    ],
    dependencies: [13],
    editableByRoles: ['CEO', 'MD', 'COO', 'CTO', 'CIO', 'PM'],
    taskGeneratable: false,
    autoFillSources: [{ sourceTemplateId: 13, fieldMappings: { 'go_live_date': 'deployment_date' } }],
  },

  // ── 15. Maintenance Plan ──
  {
    id: 15,
    number: '15',
    name: 'Maintenance Plan',
    shortName: 'Maintenance Plan',
    phase: 'Maintain',
    ownerRole: 'TL / Support Owner',
    description: 'Post-launch operational maintenance schedule, SLA response tiers, incident escalation matrix, and change management procedures.',
    sections: [
      {
        id: 'maint_scope_sched',
        title: '1. SCOPE & MAINTENANCE SCHEDULE',
        description: 'Operational maintenance scope and routine activity schedule',
        fields: [
          { id: 'maintenance_scope', label: '1. Maintenance Scope', type: 'textarea' },
          {
            id: 'schedule_table',
            label: '2. Maintenance Schedule Table',
            type: 'table',
            columns: [
              { id: 'activity', label: 'Activity' },
              { id: 'frequency', label: 'Frequency' },
              { id: 'owner', label: 'Owner' }
            ]
          }
        ]
      },
      {
        id: 'maint_sla_escalation',
        title: '2. SLA, ESCALATION & CHANGE PROCESS',
        description: 'Support response SLA, escalation hierarchy, and change process',
        fields: [
          {
            id: 'sla_table',
            label: '3. Support Levels / SLA Table',
            type: 'table',
            columns: [
              { id: 'severity', label: 'Severity' },
              { id: 'response_time', label: 'Response Time' },
              { id: 'resolution_time', label: 'Resolution Time' }
            ]
          },
          {
            id: 'escalation_table',
            label: '4. Escalation Matrix Table',
            type: 'table',
            columns: [
              { id: 'level', label: 'Level' },
              { id: 'contact', label: 'Contact' },
              { id: 'role', label: 'Role' },
              { id: 'escalation_time', label: 'Escalation Time' }
            ]
          },
          { id: 'change_management_process', label: '5. Change Management Process', type: 'textarea' }
        ]
      },
      {
        id: 'approvals',
        title: '3. APPROVAL',
        description: 'Maintenance plan sign-off',
        fields: [
          { id: 'cto_approval', label: 'CTO Sign-off Status', type: 'select', options: ['Pending Review', 'Approved', 'Revisions Requested'] },
          { id: 'approval_date', label: 'Approval Date', type: 'date' },
          { id: 'approval_notes', label: 'Maintenance Sign-off Remarks', type: 'textarea' }
        ]
      }
    ],
    dependencies: [14],
    editableByRoles: ['PM', 'TL', 'CTO', 'CIO'],
    taskGeneratable: false,
    autoFillSources: [{ sourceTemplateId: 14, fieldMappings: { 'maintenance_scope': 'support_plan' } }],
  }
];

export function isTemplateAllowedForUser(
  template: DocumentTemplate,
  role: UserRole | string,
  designation?: string
): boolean {
  if (role === 'CEO' || role === 'MD' || role === 'COO' || role === 'CTO' || role === 'CIO') return true;
  if (template.editableByRoles && template.editableByRoles.includes(role as UserRole)) return true;
  return false;
}
