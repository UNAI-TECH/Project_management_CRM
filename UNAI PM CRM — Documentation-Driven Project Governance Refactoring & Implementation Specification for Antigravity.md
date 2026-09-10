# UNAI PM CRM
## Documentation-Driven Project Governance Refactoring & Implementation Specification

**Purpose:** Refactor the existing UNAI Project Management CRM into a scalable, traceable, database-driven project documentation and execution platform.

**Implementation Target:** Existing React + TypeScript + Vite + Tailwind + Electron + Supabase/PostgreSQL CRM

**Primary Backend:** Supabase PostgreSQL

**Primary Instruction to Antigravity:**  
Do not rebuild the application from scratch. Audit the existing implementation, preserve functioning features, identify architectural flaws, implement the target architecture below incrementally, migrate existing data safely, and regression-test all existing functionality.

---

# 1. SYSTEM OBJECTIVE

The CRM must become a single source of truth for the complete project lifecycle.

The fundamental relationship must be:

```text
PROJECT
   ↓
PROJECT GOVERNANCE
   ↓
DOCUMENTATION
   ↓
REQUIREMENTS
   ↓
FEATURES
   ↓
DIRECTIVES
   ↓
TASKS
   ↓
EXECUTION
   ↓
EVIDENCE
   ↓
VERIFICATION
   ↓
ACTUAL PROJECT DATA
   ↓
DOCUMENT / REPORT GENERATION
```

Documents must no longer behave like isolated forms.

Documents are controlled representations of structured project information stored in the database.

Tasks must not be disconnected from documentation.

Completed work must feed actual project information.

Downloaded documents must be generated from verified database data and historical snapshots rather than merely reproducing previously entered JSON.

---

# 2. EXISTING SYSTEM THAT MUST BE PRESERVED

The existing CRM already contains:

- Organization management
- Organization members
- Employee cache
- Project management
- Project members
- Feature registry
- Project documents
- Document versions
- Tasks
- Task time logs
- Task reference files
- Task submissions
- Task status history
- Audit logs
- RBAC helper functions
- Supabase storage
- Document export
- Watermark and branding functionality

The current SQL schema contains these areas and must be treated as the starting point for migration rather than discarded.

Existing frontend/service concepts include:

```text
AuthContext
DataContext
onboardingAuth
documentService
taskService
timeTrackingService
teamService
exportService
dashboardService
supabaseClient
```

Preserve functioning services where possible.

Refactor them only where necessary to support the new architecture.

---

# 3. CRITICAL ARCHITECTURAL RULE

Never allow duplicated authoritative information.

Example:

BAD:

```text
Project Start Date
→ projects.start_date

Project Charter Start Date
→ project_documents.content.start_date

Project Plan Start Date
→ project_documents.content.start_date

Sprint Plan Start Date
→ project_documents.content.start_date
```

GOOD:

```text
projects.start_date
      ↓
Project Charter displays it
      ↓
Project Plan displays it
      ↓
Sprint calculations use it
      ↓
Reports use it
```

Use:

```text
MASTER DATA
+
DOCUMENT-SPECIFIC DATA
+
CALCULATED DATA
```

---

# 4. DATA CLASSIFICATION

Every document field must be classified as one of three types.

## 4.1 INHERITED DATA

Pulled automatically from authoritative project/entity records.

Examples:

```text
Project Name
Project Code
Client
Sponsor
PM
PO
Department
Project Start Date
Target End Date
Current Team
Project Priority
```

Users should not repeatedly re-enter these values.

The UI must visibly identify inherited fields where useful.

---

## 4.2 AUTHORED DATA

Information specifically owned by the document.

Examples:

```text
Business Justification
Requirement Description
Acceptance Criteria
Architecture Decisions
Design Principles
Test Strategy
Deployment Procedures
```

This data belongs to the relevant entity/document.

---

## 4.3 CALCULATED DATA

Generated from actual CRM activity.

Examples:

```text
Actual Start Date
Actual End Date
Actual Hours
Completed Tasks
Verified Story Points
Sprint Velocity
Task Delay
Blocked Time
Defect Count
UAT Completion
Project Progress
```

Users must not manually overwrite calculated values unless they have an explicitly authorized override function.

---

# 5. PROJECT ROOT MODEL

Every project must begin with a Project Master.

Required fields:

```text
project_id
project_code
project_name
client
sponsor
department
priority
project_type
description
business_objective
start_date
target_end_date
budget
technology
status
lifecycle_phase
created_by
organization_id
created_at
updated_at
```

Dates must use proper PostgreSQL date/timestamp types.

Do not use VARCHAR for dates.

The current project model uses string date fields; migrate them to proper date/timestamp columns.

---

# 6. PROJECT INITIATION WORKFLOW

The project lifecycle begins with the CTO.

```text
CTO
 ↓
Create Project
 ↓
Enter Master Project Data
 ↓
Assign PM / PO
 ↓
Assign initial project members
 ↓
Project becomes ACTIVE
 ↓
Initiate documentation workflow
```

CTO permissions:

```text
Create Project
Assign PM
Assign PO
Assign project team
Set project priority
Set project dates
Approve executive-level documents
Change project lifecycle state
Archive / close project
```

---

# 7. PM / PO PROJECT WORKSPACE

After assignment, PM/PO must work from a Project Workspace.

The workspace must contain:

```text
Overview
Team
Timeline
Requirements
Features
Documents
Tasks
Sprints
Risks
Issues / Blockers
Change Requests
Testing
Releases
Approvals
Reports
Audit
```

Do not create separate unrelated screens for each document.

The project is the central navigation context.

---

# 8. DOCUMENT LIFECYCLE

Every controlled document must have:

```text
Not Started
Draft
In Progress
Ready for Review
Under Review
Changes Requested
Approved
Locked
Superseded
Archived
```

Valid transition example:

```text
Draft
 ↓
In Progress
 ↓
Ready for Review
 ↓
Under Review
 ↓
Approved
 ↓
Locked
```

Rejected flow:

```text
Under Review
 ↓
Changes Requested
 ↓
In Progress
 ↓
Ready for Review
```

Approved documents must not be silently edited.

Creating a revision must produce:

```text
v1.0 Approved
 ↓
Create Revision
 ↓
v1.1 Draft
 ↓
Review
 ↓
v1.1 Approved
```

---

# 9. DOCUMENT TEMPLATE ARCHITECTURE

The current uploaded documentation includes project lifecycle documents such as:

- Project Charter
- Project Plan
- SRS
- BRD
- Functional Specification
- Technical Specification
- Architecture Document
- UI/UX Design Document
- Sprint Plan
- Test Plan
- Test Cases

These existing templates must be represented as structured CRM forms.

Do not blindly map the entire form into one unrestricted JSON blob.

Use structured database entities for information that participates in workflow, traceability, calculations, reporting, or automation.

JSON may still be used for genuinely flexible presentation-specific metadata.

---

# 10. DOCUMENT MASTER TABLE

Refactor the document model toward:

```text
project_documents
-----------------
id
project_id
document_type_id
document_number
title
phase
owner_id
status
current_version_id
completion
created_at
updated_at
```

Move document type definitions into:

```text
document_types
---------------
id
code
name
phase
description
sequence_order
is_required
requires_approval
template_version
```

Do not hard-code all document types throughout React components.

The workflow engine must refer to `document_types`.

---

# 11. DOCUMENT RELATIONSHIPS

Create:

```text
document_relationships
----------------------
id
project_id
source_document_id
target_document_id
relationship_type
created_by
created_at
```

Supported relationships should include:

```text
depends_on
derived_from
supports
supersedes
references
requires
```

Example:

```text
Project Charter
   ↓
Project Plan

BRD
   ↓
SRS

SRS
   ↓
Functional Specification

Functional Specification
   ↓
Technical Specification

Technical Specification
   ↓
Architecture

Architecture + Functional Specification
   ↓
Features
```

---

# 12. DOCUMENT DEPENDENCIES

Create:

```text
document_dependencies
---------------------
id
document_type_id
depends_on_document_type_id
required_status
dependency_rule
```

Example:

```text
SRS
depends on BRD
required status = Approved
```

Therefore SRS cannot be submitted for final approval until BRD is approved.

---

# 13. DOCUMENT APPROVAL MODEL

Create:

```text
document_approvals
------------------
id
document_id
version_id
approver_id
approver_role
decision
comments
approved_at
```

Allowed decisions:

```text
Approved
Rejected
Changes Requested
```

Approval must be stored historically.

Never overwrite approval history.

---

# 14. REQUIREMENTS MUST BECOME FIRST-CLASS ENTITIES

Create:

```text
requirements
------------
id
project_id
document_id
requirement_code
requirement_type
title
description
priority
source
acceptance_criteria
status
version
created_by
approved_by
approved_at
created_at
updated_at
```

Requirement types:

```text
Business
Functional
Non-Functional
Technical
UX
Security
Compliance
```

Requirements must have permanent IDs.

Examples:

```text
BRD-REQ-001
BRD-REQ-002
SRS-FR-001
SRS-FR-002
SRS-NFR-001
```

---

# 15. REQUIREMENT TRACEABILITY

Create:

```text
requirement_relationships
-------------------------
id
source_requirement_id
target_requirement_id
relationship_type
```

Example:

```text
BRD-REQ-001
 ↓
SRS-FR-004
```

---

# 16. PROJECT FEATURES

Refactor the existing feature registry.

A feature must contain:

```text
feature_id
project_id
feature_code
name
description
business_value
priority
status
assigned_tl_id
planned_start
planned_end
actual_start
actual_end
estimated_hours
actual_hours
progress
created_at
updated_at
```

Features must no longer depend on arrays such as:

```text
source_doc_ids TEXT[]
source_doc_names TEXT[]
```

for authoritative traceability.

Use relational junction tables.

---

# 17. REQUIREMENT → FEATURE RELATIONSHIP

Create:

```text
requirement_features
--------------------
id
requirement_id
feature_id
relationship_type
created_at
```

Example:

```text
SRS-FR-001
    ↓
FEATURE-001 Authentication
```

A feature may implement multiple requirements.

A requirement may be implemented by multiple features.

---

# 18. PROJECT MILESTONES

Create:

```text
project_milestones
------------------
id
project_id
milestone_code
name
description
planned_start
planned_end
actual_start
actual_end
owner_id
status
progress
created_at
updated_at
```

Milestones must not live only inside document JSON.

Documents display milestone records.

---

# 19. PROJECT RISKS

Create:

```text
project_risks
-------------
id
project_id
risk_code
title
description
likelihood
impact
severity
mitigation
owner_id
status
identified_at
resolved_at
```

Risks must be reportable independently.

---

# 20. BLOCKERS

Create:

```text
blockers
--------
id
project_id
feature_id
task_id
reported_by
owner_id
severity
reason
impact
status
started_at
resolved_at
resolution
```

When a task becomes blocked, the system must create or associate a blocker record.

Do not rely exclusively on:

```text
tasks.is_blocked
```

for historical reporting.

---

# 21. CHANGE REQUESTS

Create:

```text
change_requests
---------------
id
project_id
change_code
title
description
reason
requested_by
impact_scope
impact_schedule
impact_cost
impact_resources
status
approved_by
approved_at
created_at
updated_at
```

Relationship tables:

```text
change_request_requirements
change_request_features
change_request_tasks
change_request_sprints
```

Approved changes must be traceable to their downstream impact.

---

# 22. SPRINTS MUST BECOME FIRST-CLASS ENTITIES

Create:

```text
sprints
-------
id
project_id
sprint_code
sprint_number
goal
planned_start
planned_end
actual_start
actual_end
scrum_master_id
committed_story_points
completed_story_points
planned_capacity_hours
actual_hours
status
closed_at
created_at
updated_at
```

Create:

```text
sprint_tasks
------------
id
sprint_id
task_id
committed_at
removed_at
removed_reason
```

The Sprint Plan document should be generated from the Sprint entity.

It should not be the primary source of sprint information.

---

# 23. SPRINT SNAPSHOTS

Create:

```text
sprint_snapshots
---------------
id
sprint_id
snapshot_type
snapshot_version
snapshot_data
created_by
created_at
```

Snapshot types:

```text
Planning
Mid-Sprint
Closure
```

When a sprint is closed, create an immutable closure snapshot.

The exported Sprint Plan must use the closure snapshot when generating the historical final version.

---

# 24. TASK HIERARCHY

Task hierarchy must be:

```text
Project
 ↓
Feature
 ↓
PM Directive
 ↓
TL Subtask
 ↓
Execution Task
```

Use:

```text
parent_task_id
```

where appropriate.

A PM should normally create feature/directive-level work.

The TL should decompose technical work into executable tasks.

---

# 25. TASK OWNERSHIP MODEL

Distinguish:

```text
created_by
directive_owner
assigned_tl
assigned_to
reviewer
verified_by
```

Example:

```text
PM creates directive
 ↓
TL receives directive
 ↓
TL creates/delegates technical subtasks
 ↓
Developer executes
 ↓
TL verifies
 ↓
PM receives project-level result
```

---

# 26. TASK CONTEXT

Every task detail page must expose:

```text
Project
Feature
Requirement
Related Documents
Sprint
Directive Owner
TL
Assignee
Reviewer
Acceptance Criteria
Due Date
Estimated Hours
Actual Hours
Status
Evidence
Activity History
```

Never show an execution task without its project context.

---

# 27. TASK GENERATION ENGINE

Implement a reusable workflow/task generation service.

Example:

```text
documentService
        ↓
workflowEngine
        ↓
taskGenerationService
```

Task generation must be triggered by explicit events.

Examples:

```text
BRD Approved
SRS Approved
Functional Specification Approved
Feature Created
Sprint Created
Test Plan Approved
Change Request Approved
```

Do not create tasks simply because a user opened or saved a document.

---

# 28. TASK GENERATION RULES

Create configurable workflow rules:

```text
workflow_rules
--------------
id
project_id nullable
document_type_id nullable
event_type
action_type
target_role
task_template
sequence_order
is_active
conditions
```

Examples:

```text
Event:
Functional Specification Approved

Action:
Create Feature Review Task

Target:
PM
```

Another:

```text
Event:
Feature Created

Action:
Create Technical Directive

Target:
Assigned TL
```

Another:

```text
Event:
Sprint Closed

Action:
Generate Sprint Closure Report
```

---

# 29. IDEMPOTENCY REQUIREMENT

Automatic task generation must be idempotent.

The same workflow event must never create duplicate tasks.

Create:

```text
workflow_executions
-------------------
id
event_type
source_entity_type
source_entity_id
workflow_rule_id
execution_key
status
created_at
```

Add a unique constraint on:

```text
execution_key
```

Example:

```text
SRS_APPROVED:project123:version5
```

Running the event twice must not create two tasks.

---

# 30. REQUIREMENT → TASK TRACEABILITY

Create:

```text
requirement_tasks
-----------------
id
requirement_id
task_id
relationship_type
created_at
```

Now the CRM can answer:

```text
Which tasks implement this requirement?
Who performed them?
How much time was spent?
Were they verified?
Which sprint?
Which tests validate them?
```

---

# 31. FEATURE → TASK TRACEABILITY

Create:

```text
feature_tasks
-------------
id
feature_id
task_id
relationship_type
created_at
```

Keep `feature_id` on tasks for efficient queries if necessary, but the relationship table should support richer many-to-many cases.

---

# 32. TASK → TEST TRACEABILITY

Create:

```text
test_cases
----------
id
project_id
test_case_code
requirement_id
feature_id
module
description
preconditions
steps
expected_result
priority
status
created_by
created_at
updated_at
```

Create:

```text
task_test_cases
---------------
id
task_id
test_case_id
```

---

# 33. TEST EXECUTION

Create:

```text
test_executions
---------------
id
test_case_id
executed_by
executed_at
environment
actual_result
status
remarks
evidence
```

Statuses:

```text
Not Run
Passed
Failed
Blocked
Skipped
```

Test execution must be historical.

Do not overwrite previous executions.

---

# 34. DEFECT / BUG MODEL

Create:

```text
bugs
----
id
project_id
bug_code
title
description
severity
priority
reported_by
assigned_to
feature_id
requirement_id
test_case_id
status
root_cause
resolution
reported_at
resolved_at
verified_at
```

Relationships:

```text
bug_tasks
bug_requirements
bug_test_cases
bug_sprints
```

---

# 35. TASK STATUS MACHINE

Do not allow arbitrary status strings from the frontend.

Define controlled task states:

```text
Open
Assigned
Accepted
In Progress
Blocked
Submitted
Changes Requested
Resubmitted
Verified
Cancelled
Closed
```

Allowed transitions must be validated server-side.

Example:

```text
Open
 ↓
Assigned
 ↓
Accepted
 ↓
In Progress
 ↓
Submitted
 ↓
Verified
 ↓
Closed
```

Revision path:

```text
Submitted
 ↓
Changes Requested
 ↓
In Progress
 ↓
Resubmitted
 ↓
Verified
```

Blocked path:

```text
In Progress
 ↓
Blocked
 ↓
In Progress
```

---

# 36. TASK EVENTS

Create an immutable event table:

```text
task_events
-----------
id
task_id
project_id
event_type
from_status
to_status
actor_id
actor_name
metadata
created_at
```

Examples:

```text
CREATED
ASSIGNED
ACCEPTED
STARTED
PAUSED
RESUMED
BLOCKED
UNBLOCKED
SUBMITTED
REVISION_REQUESTED
RESUBMITTED
VERIFIED
CLOSED
```

Use events to build history.

---

# 37. TIME TRACKING

Retain the existing time tracking system.

However, calculate:

```text
elapsed_minutes
break_minutes
net_work_minutes
estimated_minutes
variance_minutes
```

Actual duration must be derived from timestamp events.

Do not trust frontend counters as the authoritative source.

Frontend timer is a UI representation.

Database timestamps are authoritative.

---

# 38. TASK EVIDENCE

Retain:

```text
task_submissions
task_reference_files
```

but make evidence more structured.

Create:

```text
task_evidence
------------
id
task_id
submission_id
evidence_type
title
description
url
storage_path
uploaded_by
created_at
```

Evidence types:

```text
Repository
Pull Request
Screenshot
Video
Document
Deployment
API
Test Result
Design
Other
```

---

# 39. VERIFICATION MODEL

When an employee submits work:

```text
Task
 ↓
Submitted
 ↓
TL Review
```

TL must see:

```text
Required output
Acceptance criteria
Actual submission
Files
URLs
Time logs
Task history
Related requirements
Related feature
Related sprint
```

TL actions:

```text
Verify & Approve
Request Revision
Reject
```

Verification must be recorded in the database.

---

# 40. PROJECT PROGRESS

Do not treat manually entered progress percentages as authoritative.

Derive progress from measurable project entities.

Example:

```text
Feature Progress
=
verified weighted tasks / total weighted tasks
```

Sprint progress:

```text
completed verified story points / committed story points
```

Project progress should be based on a configured weighted model.

Do not silently average unrelated percentages.

---

# 41. PROJECT TIMELINE ACCURACY

Use actual timestamp data.

For every meaningful project activity record:

```text
planned_start
planned_end
actual_start
actual_end
```

Never infer actual completion from a document update time.

For example:

```text
Task planned:
01 Sep → 03 Sep

Task actual:
02 Sep → 05 Sep
```

The project timeline must reflect that difference.

---

# 42. DOCUMENT EXPORT ENGINE

The current export engine must be preserved, but its data source must be redesigned.

Current conceptual model:

```text
Saved Document JSON
      ↓
Export
```

Target model:

```text
Document Template
+
Master Project Data
+
Structured Entity Data
+
Document Content
+
Verified Execution Data
+
Historical Snapshot
      ↓
Export
```

---

# 43. EXPORT CONTEXT

Every export operation must construct:

```text
ExportContext
{
    organization
    project
    projectMembers
    projectTimeline
    document
    documentVersion
    requirements
    features
    milestones
    risks
    sprints
    tasks
    timeLogs
    submissions
    blockers
    changeRequests
    testCases
    testExecutions
    bugs
    approvals
    auditEvents
    snapshot
}
```

The exact implementation may use typed TypeScript interfaces.

---

# 44. DOCUMENT EXPORT MUST BE DETERMINISTIC

Given the same:

```text
documentVersion
+
projectSnapshot
```

the generated document must represent the same historical state.

Do not generate old reports from current mutable project data.

---

# 45. EXPORT RECORD

Create:

```text
document_exports
----------------
id
project_id
document_id
version_id
export_type
snapshot_id
generated_by
generated_at
file_path
file_url
checksum
metadata
```

Export types:

```text
PDF
DOCX
Print
```

---

# 46. SPRINT PLAN EXPORT

The Sprint Plan must contain both:

## PLANNED DATA

```text
Sprint Number
Sprint Goal
Planned Dates
Committed Stories
Committed Story Points
Planned Capacity
Assigned Team
```

## ACTUAL DATA

```text
Actual Start
Actual End
Completed Stories
Verified Story Points
Actual Work Hours
Blocked Tasks
Reopened Tasks
Incomplete Tasks
Velocity
```

The actual section must be calculated from the execution database.

---

# 47. SPRINT TASK TABLE

Generate task rows from:

```text
sprint_tasks
    ↓
tasks
    ↓
task_events
    ↓
time_logs
    ↓
submissions
    ↓
verification
```

Each output row should support:

```text
Story / Task ID
Requirement
Feature
Task
Assignee
Priority
Story Points
Planned Dates
Actual Dates
Status
Actual Hours
Verification
```

---

# 48. PROJECT PLAN EXPORT

The Project Plan should dynamically populate:

```text
Project Overview
Scope
Deliverables
Milestones
Resource Plan
Communication Plan
Risks
Dependencies
Actual Project Timeline
```

The template structure already contains these sections.

Actual timeline values must come from project milestone/task/event data.

---

# 49. BRD → SRS LINKING

BRD contains:

```text
Business Requirements
Stakeholders
Assumptions
Constraints
Success Criteria
```

SRS contains:

```text
Functional Requirements
Non-Functional Requirements
Interfaces
Assumptions
Constraints
```

The CRM must provide a UI to link:

```text
BRD Requirement
      ↓
SRS Requirement
```

A PM/PO must be able to see unresolved business requirements.

---

# 50. FUNCTIONAL SPECIFICATION

Functional Specification must link to:

```text
Requirements
Features
Use Cases
Screens
Business Logic
Validation Rules
```

Each use case should have a permanent ID.

Example:

```text
UC-001
UC-002
```

---

# 51. TECHNICAL SPECIFICATION

Technical specification must link to:

```text
Features
Components
Data Model
APIs
Technology Stack
Security Requirements
```

API records should be structured where possible.

Create optionally:

```text
api_endpoints
------------
id
project_id
feature_id
method
path
description
request_schema
response_schema
authentication
status
```

---

# 52. ARCHITECTURE DOCUMENT

Architecture must reference:

```text
Features
Technical Components
Technology Stack
Data Flows
Security Model
Scalability Decisions
```

Create:

```text
architecture_components
-----------------------
id
project_id
architecture_document_id
component_code
name
description
technology
owner_id
status
```

---

# 53. UI / UX DOCUMENT

The UI/UX document must structure:

```text
Screens
User Flows
Design Principles
Style Guide
Accessibility
```

Create:

```text
project_screens
--------------
id
project_id
screen_code
name
description
route
reference_url
status
```

Create relationships:

```text
screen_features
screen_requirements
screen_test_cases
```

---

# 54. DOCUMENT FIELD CONFIGURATION

Do not hard-code every field directly into pages.

Create configurable field definitions:

```text
document_fields
---------------
id
document_type_id
field_key
label
field_type
section
required
read_only
inherited_from_entity
calculated
validation_rules
display_order
```

Supported field types:

```text
text
textarea
number
date
datetime
select
multiselect
user
team
entity-reference
rich-text
table
file
url
boolean
```

For complex tables, use structured child entities rather than JSON-only storage.

---

# 55. FORM ENGINE

The document form engine must support:

```text
inherited fields
conditional fields
repeatable rows
entity lookup
cross-document lookup
validation
autosave
draft recovery
versioning
approval
read-only locked fields
```

---

# 56. AUTOMATIC DOCUMENT PREFILL

When creating a document:

```text
Create Document
 ↓
Load Project Context
 ↓
Load Previous Approved Documents
 ↓
Load Dependencies
 ↓
Prefill inherited fields
 ↓
Load document-specific fields
```

The user should see exactly which data is inherited.

---

# 57. CROSS-DOCUMENT REFERENCES

Within forms, users should be able to select entities from related documents.

Example:

In SRS:

```text
Source BRD Requirement:
[BRD-REQ-001]
```

In Functional Specification:

```text
Source SRS Requirement:
[SRS-FR-005]
```

In Feature:

```text
Implemented Requirement:
[SRS-FR-005]
```

In Task:

```text
Implemented Feature:
FEATURE-004
```

---

# 58. PROJECT TRACEABILITY SCREEN

Add a new module:

```text
Project Traceability
```

User can search:

```text
Requirement
Feature
Task
Sprint
Test Case
Bug
Change Request
```

Selecting an entity displays its graph.

Example:

```text
BRD-REQ-001
 ↓
SRS-FR-004
 ↓
FEATURE-003
 ↓
SPRINT-02
 ↓
TASK-028
 ↓
Developer
 ↓
Submission
 ↓
TEST-019
 ↓
Passed
```

---

# 59. DOCUMENT MATRIX

Add a Project Documentation Matrix.

Columns:

```text
Document
Phase
Owner
Status
Version
Dependencies
Completion
Approval
Downstream Impact
Last Updated
```

Example statuses:

```text
Not Started
In Progress
Awaiting Approval
Approved
Blocked
Locked
```

The PM should be able to immediately identify documentation bottlenecks.

---

# 60. PROJECT CONTROL CENTER

Project dashboard should contain:

```text
Project Health
Lifecycle Phase
Overall Progress
Timeline
Milestones
Documentation Status
Requirement Coverage
Feature Progress
Sprint Status
Task Completion
Blocked Tasks
Risk Count
Change Requests
Defect Count
Test Progress
UAT Status
Deployment Status
```

---

# 61. DOCUMENTATION COMPLETION SHOULD NOT EQUAL PROJECT COMPLETION

A document being 100% filled does not mean the project is 100% complete.

For example:

```text
SRS completion = 100%
```

only means the SRS is complete.

Project progress must be calculated separately.

Do not propagate arbitrary document completion directly into project progress.

---

# 62. REQUIRED VALIDATION RULES

The CRM must prevent:

```text
Feature without project
Task without project
Task assigned to non-project member
Feature without valid project owner
Sprint task without sprint
Requirement without project
Test case without project
Document without project
Approval for a non-existent document version
Task verified without submission
Closed task without verification, where verification is required
Sprint closed while required closure conditions fail
```

---

# 63. PROJECT MEMBERSHIP VALIDATION

A user cannot receive a task simply because their global organization role allows it.

They must also be an active member of the project or be explicitly authorized by project policy.

Validation:

```text
organization membership
+
project membership
+
role permission
```

---

# 64. RBAC REDESIGN

Separate:

```text
SYSTEM ROLE
```

from:

```text
PROJECT ROLE
```

Example:

System Role:

```text
Employee
```

Project Role:

```text
Developer
```

Another employee:

```text
System Role:
Employee

Project Role:
QA Engineer
```

Another:

```text
System Role:
PM

Project Role:
Project Manager
```

---

# 65. PROJECT PERMISSIONS

Introduce explicit permissions.

Examples:

```text
project.create
project.read
project.update
project.close

document.create
document.edit
document.submit
document.approve
document.lock

requirement.create
requirement.update
requirement.approve

feature.create
feature.update

task.create
task.assign
task.accept
task.submit
task.verify
task.reopen

sprint.create
sprint.update
sprint.close

test.create
test.execute
test.verify

change_request.create
change_request.approve
```

Do not rely exclusively on role names in React.

---

# 66. SECURITY / RLS

The current broad RLS policies must be removed.

Do not use:

```sql
USING (true)
WITH CHECK (true)
```

for production project data.

Every table must implement organization/project-aware access.

At minimum:

```text
User
 ↓
organization_members
 ↓
organization_id
 ↓
project membership
 ↓
role
 ↓
permission
```

RLS should enforce database-level access, not only frontend filtering.

---

# 67. STORAGE SECURITY

Do not expose private project attachments publicly.

Current attachment storage policies must be replaced with private access.

Use:

```text
private storage bucket
+
signed URLs
+
project authorization
```

Only authorized project users should access private files.

---

# 68. AUDITABILITY

Every important mutation should create an audit event.

Required audit events include:

```text
Project Created
Project Assigned
Document Created
Document Edited
Document Submitted
Document Approved
Document Rejected
Requirement Created
Feature Created
Task Created
Task Assigned
Task Status Changed
Task Submitted
Task Verified
Task Reopened
Sprint Created
Sprint Closed
Change Approved
Test Executed
Bug Created
Document Exported
```

---

# 69. AUDIT LOG SHOULD NOT BE USED AS THE ONLY BUSINESS DATA

Audit logs answer:

```text
Who changed what and when?
```

They must not replace structured business tables.

Use:

```text
Entity table = current business state
Event table = historical activity
Audit table = governance/security record
```

---

# 70. CURRENT SCHEMA MIGRATION STRATEGY

Do not drop existing tables immediately.

Use:

```text
Phase 1
Add new tables/columns

Phase 2
Create migration scripts

Phase 3
Backfill data

Phase 4
Dual-read where necessary

Phase 5
Switch services to new model

Phase 6
Validate

Phase 7
Remove obsolete structures
```

Never destroy user/project data during refactoring.

---

# 71. DATE MIGRATION

Current project dates are string fields.

Before replacing them:

```text
Validate every existing date
Normalize formats
Convert to DATE/TIMESTAMP
Report invalid values
Back up original values
```

Create a migration report.

Do not silently convert ambiguous dates.

---

# 72. DOCUMENT JSON MIGRATION

Existing:

```text
project_documents.content
```

must be preserved.

Migration process:

```text
existing JSON
 ↓
field mapping
 ↓
structured entities
 ↓
validation
 ↓
relationship creation
```

Do not discard unknown JSON values.

Keep a legacy metadata section until migration is verified.

---

# 73. COMPATIBILITY LAYER

During migration, services may need to support:

```text
legacy_document_content
```

and:

```text
structured_document_data
```

Do not break currently working exports during migration.

Add automated tests before switching export sources.

---

# 74. FRONTEND SERVICE ARCHITECTURE

Refactor toward services such as:

```text
projectService
documentService
documentWorkflowService
documentRelationshipService
requirementService
featureService
milestoneService
riskService
taskService
taskWorkflowService
taskEventService
timeTrackingService
sprintService
testService
bugService
changeRequestService
approvalService
traceabilityService
exportService
auditService
```

Avoid putting business logic directly inside page components.

---

# 75. EVENT-DRIVEN WORKFLOW

The following must be treated as domain events:

```text
PROJECT_CREATED
DOCUMENT_APPROVED
REQUIREMENT_CREATED
FEATURE_CREATED
TASK_CREATED
TASK_VERIFIED
SPRINT_CREATED
SPRINT_CLOSED
TEST_EXECUTED
BUG_CREATED
CHANGE_REQUEST_APPROVED
PROJECT_CLOSED
```

Use these events to trigger automation.

---

# 76. EXAMPLE AUTOMATION

Event:

```text
DOCUMENT_APPROVED
```

Payload:

```text
{
  projectId,
  documentId,
  documentType,
  versionId,
  approvedBy
}
```

Workflow:

```text
Check document type
 ↓
Find workflow rules
 ↓
Evaluate conditions
 ↓
Create required entities/tasks
 ↓
Create workflow execution record
 ↓
Write audit event
```

---

# 77. EXAMPLE: SRS APPROVAL

When SRS is approved:

```text
SRS Approved
 ↓
Validate requirement records
 ↓
Create/update requirement registry
 ↓
Mark downstream Functional Specification as READY
 ↓
Create PM work item if required
 ↓
Audit
```

Do not immediately generate employee tasks unless a configured rule requires it.

---

# 78. EXAMPLE: FUNCTIONAL SPECIFICATION APPROVAL

When Functional Specification is approved:

```text
Read use cases
Read features
Read screens
Read acceptance criteria
 ↓
Validate references
 ↓
Create/update features
 ↓
Resolve assigned TL
 ↓
Create feature directives
 ↓
Notify TL
```

---

# 79. EXAMPLE: TL TASK CREATION

TL receives:

```text
FEATURE-003 Authentication
```

TL creates:

```text
TASK-001
Create authentication database schema

TASK-002
Implement login API

TASK-003
Implement frontend login

TASK-004
Implement session handling

TASK-005
Create automated tests
```

Each task inherits:

```text
Project
Feature
Requirements
Acceptance Criteria
Relevant Documents
```

---

# 80. SPRINT WORKFLOW

```text
TL/PM creates sprint
 ↓
Select features/tasks
 ↓
Commit story points
 ↓
Calculate capacity
 ↓
Sprint starts
 ↓
Task execution
 ↓
Submissions
 ↓
Verification
 ↓
Sprint closure
 ↓
Snapshot
 ↓
Sprint report
```

---

# 81. SPRINT CLOSURE CONDITIONS

A sprint should require configured closure rules.

Example:

```text
All required tasks are:
Verified
or
Explicitly carried forward
```

Any carry-forward task must record:

```text
reason
original sprint
new sprint
impact
approved_by
```

---

# 82. PROJECT CLOSURE

Project closure should validate:

```text
Required documents approved
Required features completed
Open critical blockers = 0
Critical bugs unresolved = 0
Required UAT completed
Deployment completed
Required handover documents complete
Final approval complete
```

Closure should create:

```text
project_closure_snapshot
```

---

# 83. PROJECT SNAPSHOT

Create:

```text
project_snapshots
-----------------
id
project_id
snapshot_type
snapshot_version
snapshot_data
created_by
created_at
```

Snapshot types:

```text
Baseline
Milestone
Sprint Closure
Release
Project Closure
```

This enables historical reporting.

---

# 84. REPORT GENERATION

Reports must support:

```text
Current State
Historical State
Planned vs Actual
```

Examples:

```text
Project Plan
Sprint Plan
Weekly Report
Team Productivity
Feature Report
Requirement Traceability
Test Report
Change Impact Report
Project Closure Report
```

---

# 85. PLANNED VS ACTUAL REPORTING

Every important report should differentiate:

```text
Planned
Forecast
Actual
Variance
```

Example:

```text
Planned End: 15 Sep
Forecast End: 17 Sep
Actual End: 19 Sep
Variance: +4 days
```

Never replace planned dates with actual dates.

---

# 86. DOCUMENT VERSIONING

Every modification to an approved document must create a version snapshot.

Required:

```text
document_versions
```

with:

```text
document_id
version_no
snapshot
changed_by
remarks
changed_at
```

Version comparison must be available.

---

# 87. VERSION NUMBERING

Use semantic document versions appropriate to your governance policy.

Minimum:

```text
1.0
1.1
2.0
```

Major changes:

```text
2.0
```

Minor controlled changes:

```text
1.1
```

Do not create versions merely because a user autosaved a form.

---

# 88. AUTOSAVE

Autosave must not automatically create a formal version.

Use:

```text
Draft state
```

then create formal version on:

```text
Submit
Approve
Publish
Manual checkpoint
```

---

# 89. NOTIFICATIONS

The workflow engine should notify:

```text
CTO
PM
PO
TL
Assignee
Reviewer
QA
```

only when action is required.

Examples:

```text
Document awaiting approval
Feature directive assigned
Task assigned
Task revision requested
Task verified
Sprint ending
Blocker reported
Change request awaiting approval
Test failed
UAT awaiting sign-off
```

---

# 90. DASHBOARD DATA MUST BE DERIVED

Dashboard metrics must use database queries/views/functions.

Do not maintain multiple manually updated counters.

Example:

```text
total_tasks
completed_tasks
verified_tasks
blocked_tasks
overdue_tasks
```

must be query-derived.

---

# 91. DATABASE VIEWS / RPCS

Create reusable database views or RPC functions for complex calculations such as:

```text
project_health
project_progress
sprint_metrics
feature_progress
requirement_coverage
employee_task_metrics
timeline_variance
documentation_status
```

Do not calculate large datasets repeatedly in the browser.

---

# 92. PERFORMANCE

Required indexes should cover:

```text
organization_id
project_id
document_id
document_type
requirement_id
feature_id
task_id
sprint_id
assigned_to
status
created_at
```

Use compound indexes where justified.

Avoid N+1 queries from the frontend.

---

# 93. DATA FETCHING

Project Workspace should fetch project data in controlled queries.

Do not load the entire organization database into React state.

Prefer:

```text
project
+
project members
+
active project documents
+
active sprint
+
relevant metrics
```

and lazy load:

```text
audit
large attachments
historical versions
large traceability graphs
```

---

# 94. DOCUMENT FORM UX

Every document page should have:

```text
Header
Document status
Version
Owner
Last updated
Dependencies
Approval status
Save state
```

Main body:

```text
Sections
Structured inputs
Linked entities
Inherited values
Calculated values
```

Side panel:

```text
Document Relationships
Dependencies
Tasks Generated
Approvals
Version History
Audit
```

---

# 95. DOCUMENT STATUS INDICATOR

Users must immediately understand:

```text
Draft
Ready for Review
Changes Requested
Approved
Locked
```

Do not represent status only with color.

Use text and icons for accessibility.

---

# 96. "GENERATE TASKS" UX

Do not make automatic task creation invisible.

When a workflow event produces tasks, show:

```text
Automation Result

3 Features created
8 Directives created
21 Tasks created
5 Notifications sent
```

Provide links to the generated entities.

---

# 97. TASK SOURCE DISPLAY

Every automatically generated task should display:

```text
Generated From:
Document: Functional Specification v1.2
Requirement: SRS-FR-008
Feature: FEATURE-004
Workflow: FUNCTIONAL_SPEC_APPROVED
```

This gives users confidence in automation.

---

# 98. TASK CREATION AUDIT

A generated task must record:

```text
generation_source
generation_event
generation_rule
source_document_id
source_version_id
source_requirement_id
source_feature_id
```

This can be stored directly or through relationship tables.

---

# 99. DOCUMENT → TASK VIEW

Each document should have:

```text
Generated Work
```

showing:

```text
Task
Feature
Assignee
Status
Progress
Due Date
Verification
```

Example:

```text
Functional Specification v1.3

Generated Tasks: 18

Verified: 12
In Progress: 4
Blocked: 1
Awaiting Review: 1
```

---

# 100. TASK → DOCUMENT VIEW

Every task should show:

```text
Source Documents
```

Example:

```text
SRS v1.2
Functional Specification v1.1
Technical Specification v1.0
```

This makes task context immediately accessible.

---

# 101. REQUIREMENT COVERAGE

Create a dashboard metric:

```text
Requirement Coverage
```

Example:

```text
100 requirements
92 linked to features
85 linked to tasks
70 verified
65 tested
60 accepted
```

This is much more useful than document completion percentages.

---

# 102. FEATURE HEALTH

For every feature display:

```text
Requirements
Tasks
Completed Tasks
Blocked Tasks
Actual Hours
Story Points
Sprint
Test Cases
Open Bugs
Progress
```

---

# 103. PROJECT HEALTH MODEL

Create a configurable health model based on:

```text
Schedule
Scope
Execution
Quality
Documentation
Risks
Blockers
Change Requests
```

Do not manually type "Healthy" into a dashboard.

---

# 104. ERROR HANDLING

All workflow actions must return structured errors.

Examples:

```text
DOCUMENT_DEPENDENCY_NOT_APPROVED
PROJECT_MEMBER_NOT_FOUND
INVALID_TASK_TRANSITION
TASK_NOT_SUBMITTED
APPROVAL_NOT_AUTHORIZED
SPRINT_CANNOT_CLOSE
REQUIRED_DOCUMENT_MISSING
DUPLICATE_WORKFLOW_EXECUTION
```

Show user-friendly frontend messages while logging technical details.

---

# 105. TRANSACTION REQUIREMENTS

Operations that modify multiple related records must use database transactions or secure server-side RPC/functions where possible.

Example:

```text
Approve Functional Specification
```

should atomically:

```text
update document status
+
create approval record
+
update document version
+
create features
+
create workflow execution
+
create directives
+
audit event
```

Do not leave the project in a half-updated state.

---

# 106. SERVER-SIDE AUTOMATION

Important workflow operations should not rely entirely on frontend JavaScript.

Critical actions should be executed through:

```text
Supabase RPC
or
secure backend/edge function
```

Examples:

```text
approve_document
generate_feature_directives
verify_task
close_sprint
create_project_snapshot
generate_export_snapshot
```

---

# 107. NEVER TRUST FRONTEND ROLE CHECKS

Frontend checks are for UX only.

Authorization must also be validated by:

```text
RLS
RPC authorization
server-side permission checks
```

---

# 108. DATA INTEGRITY CONSTRAINTS

Use foreign keys wherever possible.

Use unique constraints for:

```text
project_code per organization
document number per project
requirement code per project
feature code per project
task code per project
sprint code per project
test case code per project
bug code per project
change request code per project
```

---

# 109. SOFT DELETE

Do not hard-delete major project records casually.

For important entities use:

```text
deleted_at
deleted_by
is_deleted
```

or an equivalent controlled archival state.

Audit every deletion/archive.

---

# 110. MIGRATION BACKUP

Before migrations:

```text
Create database backup
Export schema
Export affected tables
Create migration log
```

Antigravity must not execute destructive migration scripts automatically without explicit project configuration.

---

# 111. TESTING STRATEGY

Create automated tests for:

```text
Project creation
Project assignment
Document creation
Document dependency
Document approval
Requirement creation
Requirement traceability
Feature creation
Task generation
Task assignment
Task status transitions
Time tracking
Submission
Verification
Sprint creation
Sprint closure
Snapshots
Exports
RLS
Permissions
Storage access
```

---

# 112. WORKFLOW TEST CASE

Example:

```text
1. CTO creates project.
2. CTO assigns PM.
3. PM opens Project Charter.
4. Project data is automatically populated.
5. PM completes Charter.
6. PM submits Charter.
7. Authorized approver approves Charter.
8. Project Plan becomes available.
9. PM completes BRD.
10. BRD approval unlocks SRS.
11. PM enters requirements.
12. SRS approval creates/updates requirement registry.
13. Functional Specification is completed.
14. Approval creates feature records.
15. Features are assigned to TLs.
16. TL creates technical task breakdown.
17. Tasks are assigned.
18. Employees execute tasks.
19. Time logs are recorded.
20. Employees submit evidence.
21. TL verifies.
22. Sprint metrics update.
23. Sprint is closed.
24. Snapshot is created.
25. Sprint Plan export is generated.
26. Export is compared with closure snapshot.
```

This test must pass end-to-end.

---

# 113. SPRINT ACCURACY ACCEPTANCE TEST

Create a sprint containing:

```text
5 tasks
```

Record:

```text
3 completed
1 blocked
1 carried forward
```

Use different actual work durations.

Close sprint.

Verify that exported Sprint Plan correctly displays:

```text
Committed Tasks = 5
Verified Tasks = 3
Blocked Tasks = 1
Carry Forward = 1
Actual Hours = sum of actual verified execution
```

Then alter a task after closure.

Verify that the old Sprint Plan export does not change.

This is mandatory.

---

# 114. DOCUMENT TRACEABILITY ACCEPTANCE TEST

Create:

```text
BRD-REQ-001
```

Link:

```text
SRS-FR-001
```

Link:

```text
FEATURE-001
```

Link:

```text
TASK-001
```

Complete and verify task.

Link:

```text
TEST-001
```

Pass test.

The traceability screen must show:

```text
BRD-REQ-001
 ↓
SRS-FR-001
 ↓
FEATURE-001
 ↓
TASK-001
 ↓
TEST-001
 ↓
Passed
```

---

# 115. DUPLICATE TASK TEST

Trigger the same document approval event twice.

Expected:

```text
First execution:
tasks created

Second execution:
no duplicate tasks created
```

The workflow execution system must enforce this.

---

# 116. REVISION TEST

Approve:

```text
SRS v1.0
```

Create:

```text
SRS v1.1
```

Change one requirement.

Verify:

```text
v1.0 remains immutable
v1.1 contains the change
traceability records identify current version
historical exports still use v1.0
```

---

# 117. PERMISSION TEST

Create two users:

```text
PM
Developer
```

Verify:

```text
PM can edit project documents assigned to them.
Developer cannot approve project documents.
Developer can access assigned execution tasks.
Developer cannot access unrelated projects.
```

---

# 118. RLS TEST

Attempt direct database access as a user from another organization.

Expected:

```text
No unauthorized project data
No unauthorized documents
No unauthorized tasks
No unauthorized attachments
```

---

# 119. EXPORT TEST

For every document type, verify:

```text
Project metadata
Document metadata
Version
Author
Approval
Relevant linked entities
Calculated data
Historical snapshot
Branding
Watermark
Page numbering
```

---

# 120. ANTIGRAVITY IMPLEMENTATION ORDER

Implement in this exact order.

## Phase 1 — Audit

Analyze:

```text
existing React code
services
components
database schema
RLS
storage policies
export functions
document service
task service
```

Create a dependency map before changing code.

---

## Phase 2 — Database foundation

Add:

```text
document_types
document_relationships
document_dependencies
document_approvals
requirements
requirement_relationships
requirement_features
requirement_tasks
project_milestones
project_risks
blockers
change_requests
sprints
sprint_tasks
sprint_snapshots
task_events
task_evidence
test_cases
test_executions
bugs
workflow_rules
workflow_executions
document_exports
project_snapshots
```

Add supporting indexes and constraints.

---

## Phase 3 — Security

Replace permissive RLS.

Implement:

```text
Organization Access
Project Membership Access
Role Permission Access
```

Make storage private for project artifacts.

---

## Phase 4 — Project root

Refactor Project Creation and Project Workspace.

Make Project the root context.

---

## Phase 5 — Document engine

Implement:

```text
document_types
document_fields
document_dependencies
document_relationships
document_approvals
document_versions
```

Implement inherited/master/calculated fields.

---

## Phase 6 — Requirements and features

Implement:

```text
Requirement Registry
Requirement Traceability
Feature Registry
Requirement → Feature
Feature → Documents
```

---

## Phase 7 — Workflow automation

Implement:

```text
Domain Events
Workflow Rules
Workflow Execution
Automatic Task/Feature generation
Idempotency
```

---

## Phase 8 — Task refactor

Preserve current working tasks but connect them to:

```text
Project
Requirement
Feature
Documents
Sprint
Events
Evidence
Verification
```

---

## Phase 9 — Sprint system

Implement:

```text
Sprint entity
Sprint tasks
Sprint metrics
Sprint snapshots
Sprint closure
Sprint exports
```

---

## Phase 10 — Testing / defects

Implement:

```text
Test Cases
Test Executions
Bug tracking
Traceability
```

---

## Phase 11 — Export engine

Refactor exports to use:

```text
structured data
+
snapshot
```

instead of arbitrary current JSON.

---

## Phase 12 — Project closure

Implement:

```text
UAT
Deployment
Handover
Closure validation
Project snapshot
Final export
```

---

# 121. LEGACY FEATURE PRESERVATION RULE

Do not remove working features merely because a new architecture exists.

Before replacing any service:

```text
Identify existing behavior
Write regression test
Implement replacement
Compare result
Switch traffic
Keep rollback path
```

---

# 122. CODE QUALITY RULES

Use:

```text
TypeScript strict mode
Typed service interfaces
Typed database entities
Centralized constants
Reusable validation
Reusable permission checks
Error boundaries
Loading states
Empty states
Optimistic UI only where safe
```

Do not introduce large amounts of duplicate business logic.

---

# 123. REACT COMPONENT RULES

Avoid pages containing:

```text
database queries
authorization logic
workflow logic
document generation logic
task generation logic
```

Move those concerns to services/hooks where appropriate.

Recommended pattern:

```text
Page
 ↓
Feature Hook
 ↓
Service
 ↓
Supabase/RPC
```

---

# 124. FORM VALIDATION

Validate at both:

```text
Frontend
Backend
```

Frontend provides immediate feedback.

Backend is authoritative.

---

# 125. DOCUMENT LOCKING

Once a document reaches:

```text
Approved
```

editing should require:

```text
Create Revision
```

not direct mutation.

---

# 126. AUTOMATIC DATA PREFILL EXAMPLE

When PM creates:

```text
Project Plan
```

automatically load:

```text
Project Name
Project Code
Client
Sponsor
PM
Start Date
Target End Date
Department
Priority
```

Then allow PM to author:

```text
Deliverables
Timeline Detail
Communication Plan
Risk Management Plan
Dependencies
```

Do not ask PM to duplicate project master data.

---

# 127. DOCUMENT INTERLINKING EXAMPLE

Project Charter:

```text
OBJ-001
Improve customer onboarding
```

BRD:

```text
BRD-REQ-001
Customer should register using email.
Source: OBJ-001
```

SRS:

```text
SRS-FR-001
System shall support email registration.
Source: BRD-REQ-001
```

Feature:

```text
FEATURE-001
User Registration
Source: SRS-FR-001
```

Task:

```text
TASK-001
Implement Registration API
Feature: FEATURE-001
Requirement: SRS-FR-001
```

Test:

```text
TC-001
Validate email registration
Requirement: SRS-FR-001
Feature: FEATURE-001
Task: TASK-001
```

This is the expected model.

---

# 128. SOURCE OF TRUTH HIERARCHY

Use this hierarchy:

```text
Organization
    ↓
Project Master
    ↓
Structured Project Entities
    ↓
Documents
    ↓
Workflow
    ↓
Execution Events
    ↓
Snapshots
    ↓
Exports
```

Exports never become the source of truth.

PDF/DOCX files are outputs.

---

# 129. FINAL ARCHITECTURE

Target architecture:

```text
                  CTO
                   │
                   ↓
              PROJECT MASTER
                   │
             ┌─────┴──────┐
             │            │
            PM/PO       TEAM
             │
             ↓
       PROJECT DOCUMENTS
             │
      ┌──────┼─────────┐
      ↓      ↓         ↓
     BRD     RISKS   PROJECT PLAN
      │
      ↓
     SRS
      │
      ↓
 FUNCTIONAL SPEC
      │
      ├───────────────┐
      ↓               ↓
 FEATURES          UX SCREENS
      │
      ↓
 TECHNICAL SPEC
      │
      ↓
 ARCHITECTURE
      │
      ↓
 REQUIREMENTS
      │
      ↓
 FEATURE REGISTRY
      │
      ↓
 PM DIRECTIVES
      │
      ↓
      TL
      │
 ┌────┼─────┐
 ↓    ↓     ↓
TASK TASK  TASK
 │    │     │
 ↓    ↓     ↓
EMPLOYEE EXECUTION
 │
 ├── TIME
 ├── EVIDENCE
 ├── SUBMISSION
 └── STATUS EVENTS
             │
             ↓
          TL VERIFY
             │
             ↓
        SPRINT ACTUALS
             │
       ┌─────┼──────┐
       ↓     ↓      ↓
     TESTS  BUGS   CHANGES
       │
       ↓
      UAT
       │
       ↓
   DEPLOYMENT
       │
       ↓
 PROJECT CLOSURE
       │
       ↓
 IMMUTABLE SNAPSHOT
       │
       ↓
 PDF / DOCX REPORT
```

---

# 130. FINAL ANTIGRAVITY INSTRUCTION

Treat the specifications above as the target architecture.

Do not interpret them as a request to redesign only the UI.

The required refactor is:

```text
DATABASE
+
DOMAIN MODEL
+
WORKFLOW ENGINE
+
RBAC
+
RLS
+
DOCUMENT ENGINE
+
TASK ENGINE
+
TRACEABILITY
+
SNAPSHOTS
+
EXPORT ENGINE
```

The primary objective is:

> **One project database must be capable of reconstructing the complete history of what was planned, what was documented, what was assigned, who executed it, how long it took, what evidence was submitted, who verified it, what changed, what was tested, and what was finally delivered.**

When any document is downloaded, the generated document must represent the correct project state for the requested version/snapshot.

Do not fabricate missing historical data.

Do not overwrite historical values with current values.

Do not duplicate authoritative fields unnecessarily.

Do not create duplicate tasks from repeated workflow events.

Do not bypass database authorization with frontend-only checks.

Do not expose private project files publicly.

Do not destroy legacy data during migration.

Every major refactor must include:

```text
Migration
Validation
Regression Test
Rollback Consideration
```

The finished implementation must provide complete end-to-end traceability:

```text
Requirement
→ Feature
→ Sprint
→ Task
→ Employee
→ Time
→ Evidence
→ Verification
→ Test
→ Bug / Change
→ Release
→ Project Closure
```

This is the acceptance definition for the refactored UNAI PM CRM.