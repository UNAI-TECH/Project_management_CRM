export type UserRole = 'CEO' | 'MD' | 'COO' | 'CTO' | 'CIO' | 'PM' | 'TL' | 'Employee';

export type LifecyclePhase = 
  | 'All Phases'
  | 'Initiate'
  | 'Plan'
  | 'Requirements'
  | 'Design'
  | 'Build'
  | 'Test'
  | 'Release'
  | 'Maintain';

export type ProjectStatus = 'On Track' | 'At Risk' | 'Delayed' | 'Completed' | 'Planning';

export type DocumentStatus = 
  | 'Not Started' | 'Draft' | 'In Progress' | 'Ready for Review' 
  | 'Under Review' | 'Changes Requested' | 'Approved' | 'Locked' 
  | 'Superseded' | 'Archived'
  // Legacy compatibility
  | 'In Review';

export type TaskStatus = 
  | 'Open' | 'Assigned' | 'Accepted' | 'In Progress' | 'Blocked' 
  | 'Submitted' | 'Changes Requested' | 'Resubmitted' | 'Verified' 
  | 'Cancelled' | 'Closed'
  // Legacy compatibility
  | 'Reopened';

export type FeatureStatus = 'Pending' | 'In Progress' | 'Submitted' | 'Verified' | 'Blocked';

export type Priority = 'High' | 'Medium' | 'Low';

export interface DocumentBrandingTemplate {
  watermark: {
    enabled: boolean;
    type: 'logo' | 'custom' | 'text'; // 'logo' = Company Logo, 'custom' = Custom Watermark
    customType?: 'text' | 'image'; // 'text' = shortform/text, 'image' = uploaded custom watermark logo
    text: string;
    customImageUrl?: string; // custom watermark image URL fetched from storage
    isFaded: boolean;
    opacity: number; // 5 to 75
    size: 'sm' | 'md' | 'lg' | 'xl'; // watermark size
    orientation?: 'diagonal' | 'horizontal'; // 'diagonal' = tilted (-30deg), 'horizontal' = straight (0deg)
  };
  header: {
    enabled: boolean;
    showLogo: boolean;
    alignment: 'left' | 'center' | 'right' | 'split';
    layout: 'inline' | 'stacked'; // 'inline' = side-by-side, 'stacked' = text under logo
    isBold: boolean;
    leftText: string;
    rightText: string;
  };
  footer: {
    enabled: boolean;
    copyrightText: string;
    showPageNumber: boolean;
    confidentialityNotice: string;
  };
}

export interface Organization {
  id: string;
  name: string;
  registrationNo?: string;
  industry?: string;
  country: string;
  companyEmail?: string;
  contactNumber?: string;
  aboutCompany?: string;
  employeeCount?: string;
  logoUrl?: string;
  documentBranding?: DocumentBrandingTemplate;
  isVerified: boolean;
  onboardedBy?: string;
  createdAt: string;
}

export interface OrganizationMember {
  id: string;
  organizationId: string;
  authUserId: string;
  email: string;
  fullName: string;
  role: UserRole;
  department: string;
  designation: string;
  avatarUrl?: string;
  mustChangePassword?: boolean;
  hasCompletedSetup?: boolean;
  isActive: boolean;
  invitedBy?: string;
  createdAt: string;
}

export interface UserProfile {
  id: string;
  email: string;
  fullName: string;
  department: string;
  designation: string;
  employeeCode: string;
  isActive: boolean;
  isHrAdmin: boolean;
  role: UserRole;
  avatar?: string;
  mustChangePassword?: boolean;
  hasCompletedSetup?: boolean;
  organizationId?: string;
  organizationName?: string;
  organizationLogo?: string;
  documentBranding?: DocumentBrandingTemplate;
}

export interface Project {
  id: string;
  code: string;
  name: string;
  client: string;
  sponsor: string;
  status: ProjectStatus;
  priority: Priority;
  department: string;
  startDate: string;
  targetEndDate: string;
  progress: number;
  pmName: string;
  pmId: string;
  description: string;
  lifecyclePhase: LifecyclePhase;
  totalDocuments: number;
  completedDocuments: number;
  totalTasks: number;
  completedTasks: number;
  overdueTasks: number;
  budget?: number;
  technology?: string;
  businessObjective?: string;
  projectType?: string;
  poId?: string;
  poName?: string;
  actualStartDate?: string;
  actualEndDate?: string;
}

export interface AutoFillMapping {
  sourceTemplateId: number;
  fieldMappings: Record<string, string>; // targetFieldId -> sourceFieldId
}

export interface DocumentTemplate {
  id: number;
  number: string;
  name: string;
  shortName: string;
  phase: LifecyclePhase;
  ownerRole: string;
  description: string;
  sections: Array<{
    id: string;
    title: string;
    description: string;
    fields: Array<{
      id: string;
      label: string;
      type: 'text' | 'textarea' | 'select' | 'table' | 'date' | 'tags';
      options?: string[];
      placeholder?: string;
      defaultValue?: any;
      columns?: Array<{ id: string; label: string; placeholder?: string; type?: 'text' | 'select' | 'date'; options?: string[] }>;
    }>;
  }>;
  // --- Document Lifecycle Automation Fields ---
  dependencies?: number[];              // Template IDs that must be 'Approved' before editing
  autoFillSources?: AutoFillMapping[];   // Auto-populate fields from upstream documents
  editableByRoles?: UserRole[];          // Roles allowed to edit this document
  taskGeneratable?: boolean;             // Auto-generate tasks when this doc is approved
}

export interface DocumentCompletionRequest {
  id: string;
  requestedBy: string;
  requestedByName: string;
  requestedByRole: UserRole;
  targetDocTemplateId: number;
  targetDocName: string;
  blockedDocTemplateId: number;
  blockedDocName: string;
  blockedUserName: string;
  blockedUserRole: UserRole;
  projectId: string;
  projectName: string;
  status: 'Pending' | 'Acknowledged' | 'Resolved';
  createdAt: string;
}

export interface ProjectDocument {
  id: string;
  projectId: string;
  projectName: string;
  templateId: number;
  docNumber: string;
  name: string;
  phase: LifecyclePhase;
  version: string;
  status: DocumentStatus;
  completion: number;
  ownerName: string;
  ownerId: string;
  createdAt: string;
  lastUpdated: string;
  description: string;
  content: Record<string, any>;
  files?: Array<{ name: string; size: string; url: string }>;
  history?: Array<{
    version: string;
    date: string;
    author: string;
    summary: string;
  }>;
}

export interface TaskReferenceFile {
  id: string;
  name: string;
  type: 'image' | 'file' | 'url';
  url: string;
  size?: string;
}

export interface TaskSubmission {
  id: string;
  submittedBy: string;
  submittedByName: string;
  submittedAt: string;
  notes: string;
  fileUrls: string[];
  referenceUrls: string[];
}

export interface TaskStatusLog {
  id: string;
  fromStatus: TaskStatus;
  toStatus: TaskStatus;
  changedBy: string;
  changedByName: string;
  remarks: string;
  changedAt: string;
}

export interface TaskTimeLog {
  id: string;
  taskId: string;
  employeeId: string;
  employeeName: string;
  action: 'begin' | 'end' | 'break_start' | 'break_end' | 'pause';
  timestamp: string;
  notes?: string;
}

export interface TaskTimeTracker {
  taskId: string;
  totalWorkMinutes: number;
  totalBreakMinutes: number;
  isActive: boolean;
  startedAt?: string;
  lastActivityAt?: string;
  isOverdue: boolean;
  overdueMinutes: number;
  timeLogs: TaskTimeLog[];
}

export interface ProjectFeature {
  id: string;
  projectId: string;
  name: string;
  description: string;
  technology?: string;
  sourceDocIds: string[];
  sourceDocNames: string[];
  sequenceOrder: number;
  status: FeatureStatus;
  progress: number;
  assignedTlId?: string;
  assignedTlName?: string;
  isBlocked: boolean;
  linkedFunctions: string[];
  linkedApis: string[];
  linkedScreens: string[];
  estimatedHours?: number;
  actualHours?: number;
  startDate?: string;
  dueDate?: string;
  organizationId: string;
  createdAt: string;
}

export interface TaskChecklistItem {
  id: string;
  title: string;
  isCompleted: boolean;
  assignedTo?: string;
  assignedToName?: string;
}

export interface TaskChecklist {
  id: string;
  title: string;
  items: TaskChecklistItem[];
}

export interface TaskComment {
  id: string;
  taskId: string;
  authorId: string;
  authorName: string;
  authorRole: string;
  authorAvatar?: string;
  content: string;
  createdAt: string;
  type?: 'comment' | 'system_event';
}

export interface Task {
  id: string;
  projectId: string;
  projectName: string;
  docId?: string;
  docName?: string;
  templateId?: number;
  title: string;
  description: string;
  assignedBy: string;
  assignedByName: string;
  assignedByRole: UserRole;
  assignedTo: string;
  assignedToName: string;
  assignedToRole: UserRole;
  assignedToDesignation?: string;
  status: TaskStatus;
  priority: Priority;
  dueDate: string;
  createdAt: string;
  progress: number;
  referenceFiles?: TaskReferenceFile[];
  submission?: TaskSubmission;
  statusLogs?: TaskStatusLog[];
  parentTaskId?: string | null;
  hierarchyLevel?: 'CTO_TO_PM' | 'PM_TO_TL' | 'TL_TO_DEV';
  organizationId?: string;
  featureId?: string | null;
  featureName?: string | null;
  taskType?: 'feature_task' | 'subtask';
  sequenceOrder?: number;
  isBlocked?: boolean;
  estimatedHours?: number;
  actualHours?: number;
  startedAt?: string;
  completedAt?: string;
  timeTracker?: TaskTimeTracker;
  checklists?: TaskChecklist[];
  observers?: string[];
  comments?: TaskComment[];
}

export interface TeamMember {
  id: string;
  projectId: string;
  name: string;
  email: string;
  role: UserRole;
  designation: string;
  department: string;
  accessLevel: 'Full Access' | 'Team Access' | 'Task Access' | 'Read Only';
  reportsTo?: string | null;
  reportsToName?: string | null;
  avatar?: string;
  tasksCount?: number;
  completedTasksCount?: number;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  actorId: string;
  actorName: string;
  actorRole: UserRole;
  action: string;
  entityType: 'Project' | 'Document' | 'Task' | 'Team' | 'Auth' | 'Setting';
  entityId: string;
  details: string;
}

export interface StatsOverview {
  totalProjects: number;
  activeProjects: number;
  totalDocuments: number;
  totalTasks: number;
  overdueTasks: number;
  pendingTasks: number;
  completedTasks: number;
  inProgressTasks: number;
  statusDistribution: {
    onTrack: number;
    atRisk: number;
    delayed: number;
    completed: number;
  };
  monthlyTaskOverview: Array<{
    month: string;
    completed: number;
    pending: number;
    overdue: number;
  }>;
}

// =====================================================================
// GOVERNANCE ENTITY TYPES (Spec §10–§83)
// =====================================================================

// §10 — Document Types (DB-driven template registry)
export interface DocumentType {
  id: string;
  code: string;
  name: string;
  phase: string;
  description?: string;
  sequenceOrder: number;
  isRequired: boolean;
  requiresApproval: boolean;
  templateVersion: string;
  legacyTemplateId?: number;
  organizationId?: string;
}

// §11 — Document Relationships
export type DocumentRelationshipType = 'depends_on' | 'derived_from' | 'supports' | 'supersedes' | 'references' | 'requires';

export interface DocumentRelationship {
  id: string;
  projectId: string;
  sourceDocumentId: string;
  targetDocumentId: string;
  relationshipType: DocumentRelationshipType;
  createdBy?: string;
  createdAt: string;
}

// §13 — Document Approvals
export type ApprovalDecision = 'Approved' | 'Rejected' | 'Changes Requested';

export interface DocumentApproval {
  id: string;
  documentId: string;
  versionId?: string;
  approverId: string;
  approverName?: string;
  approverRole?: string;
  decision: ApprovalDecision;
  comments?: string;
  approvedAt: string;
}

// §14 — Requirements
export type RequirementType = 'Business' | 'Functional' | 'Non-Functional' | 'Technical' | 'UX' | 'Security' | 'Compliance';
export type RequirementStatus = 'Draft' | 'Active' | 'Approved' | 'Deprecated' | 'Rejected';

export interface Requirement {
  id: string;
  projectId: string;
  documentId?: string;
  requirementCode: string;
  requirementType: RequirementType;
  title: string;
  description?: string;
  priority: Priority;
  source?: string;
  acceptanceCriteria?: string;
  status: RequirementStatus;
  version: string;
  createdBy?: string;
  createdByName?: string;
  approvedBy?: string;
  approvedByName?: string;
  approvedAt?: string;
  organizationId: string;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
}

// §18 — Project Milestones
export type MilestoneStatus = 'Pending' | 'In Progress' | 'Completed' | 'Delayed' | 'At Risk' | 'Cancelled';

export interface ProjectMilestone {
  id: string;
  projectId: string;
  milestoneCode: string;
  name: string;
  description?: string;
  plannedStart?: string;
  plannedEnd?: string;
  actualStart?: string;
  actualEnd?: string;
  ownerId?: string;
  ownerName?: string;
  status: MilestoneStatus;
  progress: number;
  organizationId: string;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
}

// §19 — Project Risks
export type RiskLikelihood = 'Very Low' | 'Low' | 'Medium' | 'High' | 'Very High';
export type RiskSeverity = 'Low' | 'Medium' | 'High' | 'Critical';
export type RiskStatus = 'Open' | 'Mitigated' | 'Resolved' | 'Accepted' | 'Closed';

export interface ProjectRisk {
  id: string;
  projectId: string;
  riskCode: string;
  title: string;
  description?: string;
  likelihood?: RiskLikelihood;
  impact?: RiskLikelihood;
  severity?: RiskSeverity;
  mitigation?: string;
  ownerId?: string;
  ownerName?: string;
  status: RiskStatus;
  identifiedAt: string;
  resolvedAt?: string;
  organizationId: string;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
}

// §20 — Blockers
export type BlockerStatus = 'Open' | 'In Progress' | 'Resolved' | 'Closed';

export interface Blocker {
  id: string;
  projectId: string;
  featureId?: string;
  taskId?: string;
  reportedBy?: string;
  reportedByName?: string;
  ownerId?: string;
  ownerName?: string;
  severity: RiskSeverity;
  reason: string;
  impact?: string;
  status: BlockerStatus;
  startedAt: string;
  resolvedAt?: string;
  resolution?: string;
  organizationId: string;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
}

// §21 — Change Requests
export type ChangeRequestStatus = 
  | 'Pending' 
  | 'Impact Analysis'
  | 'Under Review' 
  | 'Escalated to CTO'
  | 'Approved' 
  | 'Rejected' 
  | 'Implemented' 
  | 'Closed';

export type CRType = 'Scope' | 'Budget' | 'Timeline' | 'Resource' | 'Technical';
export type CRSeverity = 'Low' | 'Medium' | 'High' | 'Critical';

export interface ChangeRequest {
  id: string;
  projectId: string;
  changeCode: string;
  title: string;
  description?: string;
  reason?: string;
  crType?: CRType;
  severity?: CRSeverity;
  requestedBy?: string;
  requestedByName?: string;
  impactScope?: string;
  impactSchedule?: string;
  impactCost?: string;
  impactResources?: string;
  status: ChangeRequestStatus;
  requiresCtoApproval?: boolean;
  sourceDocumentId?: string;
  sourceVersionId?: string;
  affectedFeatureIds?: string[];
  affectedTaskIds?: string[];
  budgetImpactAmount?: number;
  budgetImpactPct?: number;
  timelineImpactDays?: number;
  effortSplitRatio?: number;
  approvedBy?: string;
  approvedByName?: string;
  approvedAt?: string;
  organizationId: string;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
}

// Governance Configuration Entity
export interface GovernanceConfig {
  id: string;
  organizationId: string;
  configKey: string;
  configValue: Record<string, any>;
  description?: string;
  updatedBy?: string;
  updatedAt: string;
}

// CR Impact Analysis Result
export interface CRImpactAnalysis {
  id: string;
  changeRequestId: string;
  projectId: string;
  analyzedAt: string;
  analyzedBy?: string;
  affectedDocumentIds: string[];
  affectedFeatureIds: string[];
  affectedTaskIds: string[];
  budgetDelta: number;
  timelineDeltaDays: number;
  riskScore: number;
  requiresCtoApproval: boolean;
  escalationReasons: string[];
  traceabilityGraph?: Record<string, any>;
  organizationId: string;
}

// CR Approval Decision Chain Entry
export interface CRApprovalDecision {
  id: string;
  changeRequestId: string;
  approverId: string;
  approverName: string;
  approverRole: string;
  decision: 'Approved' | 'Rejected' | 'Changes Requested' | 'Escalated';
  comments?: string;
  decidedAt: string;
  organizationId: string;
}

// Employee Master Skill Profile
export interface EmployeeSkillProfile {
  id: string;
  employeeId: string;
  skillName: string;
  category: 'Technical' | 'Domain' | 'Leadership' | 'QA';
  proficiencyLevel: number; // 1-5
  yearsOfExperience: number;
  certifications?: string[];
  organizationId: string;
  createdAt: string;
  updatedAt: string;
}

// Project Skill Override (TL-editable)
export interface ProjectSkillOverride {
  id: string;
  projectId: string;
  employeeId: string;
  skillName: string;
  overrideProficiency: number; // 1-5
  notes?: string;
  overriddenBy?: string;
  createdAt: string;
  updatedAt: string;
}

// Delegation Proposal Breakdown
export interface DelegationScoreBreakdown {
  compositeScore: number; // 0-100
  skillScore: number;     // 0-100
  capacityScore: number;  // 0-100
  workloadScore: number;  // 0-100
  experienceScore: number;// 0-100
  priorityScore: number;  // 0-100
}

// Smart Delegation Proposal
export interface DelegationProposal {
  id: string;
  projectId: string;
  taskId: string;
  featureId?: string;
  candidateEmployeeId: string;
  candidateName: string;
  rank: number;
  compositeScore: number;
  skillScore: number;
  capacityScore: number;
  workloadScore: number;
  experienceScore: number;
  priorityScore: number;
  status: 'Proposed' | 'Accepted' | 'Overridden' | 'Reassigned';
  isAutoAssigned: boolean;
  overrideReason?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  organizationId: string;
  createdAt: string;
}

// §22 — Sprints
export type SprintStatus = 'Planning' | 'Active' | 'Completed' | 'Cancelled';

export interface Sprint {
  id: string;
  projectId: string;
  sprintCode: string;
  sprintNumber: number;
  goal?: string;
  plannedStart?: string;
  plannedEnd?: string;
  actualStart?: string;
  actualEnd?: string;
  scrumMasterId?: string;
  scrumMasterName?: string;
  committedStoryPoints: number;
  completedStoryPoints: number;
  plannedCapacityHours: number;
  actualHours: number;
  status: SprintStatus;
  closedAt?: string;
  closedBy?: string;
  organizationId: string;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
}

// §22 — Sprint Tasks
export interface SprintTask {
  id: string;
  sprintId: string;
  taskId: string;
  committedAt: string;
  removedAt?: string;
  removedReason?: string;
  carryForwardSprintId?: string;
  carryForwardReason?: string;
  carryForwardApprovedBy?: string;
}

// §28 — Workflow Rules
export interface WorkflowRule {
  id: string;
  projectId?: string;
  documentTypeId?: string;
  eventType: string;
  actionType: string;
  targetRole?: string;
  taskTemplate: Record<string, any>;
  sequenceOrder: number;
  isActive: boolean;
  conditions: Record<string, any>;
  organizationId?: string;
}

// §29 — Workflow Executions
export type WorkflowExecutionStatus = 'Pending' | 'Completed' | 'Failed' | 'Skipped';

export interface WorkflowExecution {
  id: string;
  eventType: string;
  sourceEntityType: string;
  sourceEntityId: string;
  workflowRuleId?: string;
  executionKey: string;
  status: WorkflowExecutionStatus;
  resultMetadata: Record<string, any>;
  createdAt: string;
}

// §32 — Test Cases
export type TestCaseStatus = 'Not Run' | 'Passed' | 'Failed' | 'Blocked' | 'Skipped';

export interface TestCase {
  id: string;
  projectId: string;
  testCaseCode: string;
  requirementId?: string;
  featureId?: string;
  module?: string;
  description: string;
  preconditions?: string;
  steps: Array<{ step: number; action: string; expected: string }>;
  expectedResult?: string;
  priority: Priority;
  status: TestCaseStatus;
  createdBy?: string;
  createdByName?: string;
  organizationId: string;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
}

// §33 — Test Executions
export interface TestExecution {
  id: string;
  testCaseId: string;
  executedBy?: string;
  executedByName?: string;
  executedAt: string;
  environment?: string;
  actualResult?: string;
  status: TestCaseStatus;
  remarks?: string;
  evidence: any[];
}

// §34 — Bugs
export type BugStatus = 'Open' | 'In Progress' | 'Resolved' | 'Verified' | 'Closed' | 'Reopened' | 'Deferred';

export interface Bug {
  id: string;
  projectId: string;
  bugCode: string;
  title: string;
  description?: string;
  severity?: RiskSeverity;
  priority: Priority;
  reportedBy?: string;
  reportedByName?: string;
  assignedTo?: string;
  assignedToName?: string;
  featureId?: string;
  requirementId?: string;
  testCaseId?: string;
  status: BugStatus;
  rootCause?: string;
  resolution?: string;
  reportedAt: string;
  resolvedAt?: string;
  verifiedAt?: string;
  organizationId: string;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
}

// §36 — Task Events
export type TaskEventType = 
  | 'CREATED' | 'ASSIGNED' | 'ACCEPTED' | 'STARTED' | 'PAUSED' | 'RESUMED'
  | 'BLOCKED' | 'UNBLOCKED' | 'SUBMITTED' | 'REVISION_REQUESTED'
  | 'RESUBMITTED' | 'VERIFIED' | 'CLOSED' | 'CANCELLED' | 'REOPENED';

export interface TaskEvent {
  id: string;
  taskId: string;
  projectId: string;
  eventType: TaskEventType;
  fromStatus?: string;
  toStatus?: string;
  actorId?: string;
  actorName?: string;
  metadata: Record<string, any>;
  createdAt: string;
}

// §38 — Task Evidence
export type EvidenceType = 
  | 'Repository' | 'Pull Request' | 'Screenshot' | 'Video' | 'Document'
  | 'Deployment' | 'API' | 'Test Result' | 'Design' | 'Other';

export interface TaskEvidence {
  id: string;
  taskId: string;
  submissionId?: string;
  evidenceType: EvidenceType;
  title?: string;
  description?: string;
  url?: string;
  storagePath?: string;
  uploadedBy?: string;
  uploadedByName?: string;
  organizationId: string;
  createdAt: string;
}

// §45 — Document Exports
export type ExportType = 'PDF' | 'DOCX' | 'Print';

export interface DocumentExport {
  id: string;
  projectId: string;
  documentId: string;
  versionId?: string;
  exportType: ExportType;
  snapshotId?: string;
  generatedBy?: string;
  generatedByName?: string;
  generatedAt: string;
  filePath?: string;
  fileUrl?: string;
  checksum?: string;
  metadata: Record<string, any>;
  organizationId: string;
}

// §83 — Project Snapshots
export type SnapshotType = 'Baseline' | 'Milestone' | 'Sprint Closure' | 'Release' | 'Project Closure';

export interface ProjectSnapshot {
  id: string;
  projectId: string;
  snapshotType: SnapshotType;
  snapshotVersion: string;
  snapshotData: Record<string, any>;
  createdBy?: string;
  createdByName?: string;
  organizationId: string;
  createdAt: string;
}

// §65 — Role Permissions
export interface RolePermission {
  id: string;
  role: string;
  permission: string;
  scope: 'system' | 'project';
  organizationId?: string;
  isActive: boolean;
}

// §43 — Export Context (for document generation)
export interface ExportContext {
  organization: Organization;
  project: Project;
  projectMembers: TeamMember[];
  document?: ProjectDocument;
  documentVersion?: any;
  requirements: Requirement[];
  features: ProjectFeature[];
  milestones: ProjectMilestone[];
  risks: ProjectRisk[];
  sprints: Sprint[];
  tasks: Task[];
  timeLogs: TaskTimeLog[];
  submissions: TaskSubmission[];
  blockers: Blocker[];
  changeRequests: ChangeRequest[];
  testCases: TestCase[];
  testExecutions: TestExecution[];
  bugs: Bug[];
  approvals: DocumentApproval[];
  auditEvents: AuditLog[];
  snapshot?: ProjectSnapshot;
}
