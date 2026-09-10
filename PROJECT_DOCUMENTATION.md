# UNAI Project Management CRM — Complete System Documentation & Architecture Manual

---

## 1. Executive Summary & Overview

The **UNAI Project Management CRM** is an enterprise-grade engineering governance and project execution system. It provides end-to-end lifecycle tracking across 6 distinct phases (**Initiate**, **Plan**, **Requirements**, **Design**, **Execution**, and **Handover & Support**), integrating **16 digitized corporate document templates**, **feature-based task delegation**, **micro-level start/pause/break time tracking**, **supervisor verification workflows**, and **verifiable PDF / DOCX portfolio exports**.
   
---

## 2. System Architecture & Tech Stack

```
                               ┌──────────────────────────────────────────────────────────┐
                               │                    Electron Desktop /                    │
                               │                    React 18 + Vite SPA                   │
                               └────────────────────────────┬─────────────────────────────┘
                                                            │
                                  ┌─────────────────────────┴─────────────────────────┐
                                  │                                                   │
                       ┌──────────▼──────────┐                             ┌──────────▼──────────┐
                       │  AuthContext.tsx    │                             │  DataContext.tsx    │
                       │  (Executive RBAC &  │                             │  (Real-time State & │
                       │   Company Profile)  │                             │   Supabase Sync)    │
                       └──────────┬──────────┘                             └──────────┬──────────┘
                                  │                                                   │
       ┌──────────────────────────┴───────────────────────────────────────────────────┴──────────────────────────┐
       │                                         Service Layer                                                    │
       │  ┌──────────────────────┬──────────────────────┬──────────────────────┬───────────────────────────────┐  │
       │  │  onboardingAuth.ts   │  documentService.ts  │  taskService.ts      │  timeTrackingService.ts       │  │
       │  ├──────────────────────┼──────────────────────┼──────────────────────┼───────────────────────────────┤  │
       │  │  teamService.ts      │  exportService.ts    │  dashboardService.ts │  supabaseClient.ts            │  │
       │  └──────────────────────┴──────────────────────┴──────────────────────┴───────────────────────────────┘  │
       └──────────────────────────────────────────────┬───────────────────────────────────────────────────────────┘
                                                      │
                                   ┌──────────────────▼──────────────────┐
                                   │       Supabase Backend (PostgreSQL) │
                                   │  - 14 Relational Tables             │
                                   │  - 4 Storage Buckets                │
                                   │  - Security Definer RBAC Functions  │
                                   │  - Non-recursive RLS Policies       │
                                   └─────────────────────────────────────┘
```

- **Frontend Core**: React 18, TypeScript, Tailwind CSS, Lucide Icons, Canvas Confetti.
- **Desktop Runtime**: Electron 30 with native file save and print APIs.
- **Backend & Database**: Supabase PostgreSQL 15 with Row Level Security (RLS) and Storage.
- **Document Rendering**: `docx` (Microsoft Word generator) and print CSS engine with dynamic company watermark overlay.

---

## 3. Role-Based Access Control (RBAC) Governance

The platform enforces strict role-based access tiers:

| Tier | Role(s) | Platform Access Scope | Key Permissions |
| :--- | :--- | :--- | :--- |
| **Super Admin / Executive** | **CEO, MD, COO, CTO, CIO, HR Admin** | Full Company & Cross-Project Access | • Create & delete projects<br>• Invite, reassign & terminate staff<br>• Configure company branding & watermarks<br>• Approve architectural & budget docs<br>• Transfer company ownership |
| **Project Management** | **PM (Project Manager)** | Assigned Project Scope & Planning | • Author project plans & charters<br>• Create feature tasks & break down deliverables<br>• Delegate tasks to Technical Leads<br>• Review and verify submitted work |
| **Engineering Lead** | **TL (Technical Lead)** | Sprint Scope & Task Delegation | • Break down feature directives into subtasks<br>• Assign subtasks to developers & interns<br>• Perform code review & approve submissions<br>• Reopen tasks with revision feedback |
| **Execution Tier** | **Employee, Intern, Dev** | Individual Assigned Scope | • View assigned directives and subtasks<br>• Run time tracker (Start, Pause, Break, Resume)<br>• Submit deliverable notes, file attachments & URLs<br>• Download individual portfolio report |

---

## 4. The 16 Digitized Project Lifecycle Templates

The CRM digitizes and version-controls 16 standard enterprise engineering documents across 6 lifecycle phases:

```
┌───────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                       6 LIFECYCLE PHASES & 16 TEMPLATES                                   │
├──────────────┬──────────────────┬─────────────────┬──────────────────┬─────────────────┬──────────────────┤
│ 1. INITIATE  │ 2. PLAN          │ 3. REQUIREMENTS │ 4. DESIGN        │ 5. EXECUTION    │ 6. HANDOVER      │
├──────────────┼──────────────────┼─────────────────┼──────────────────┼─────────────────┼──────────────────┤
│ • Master     │ • Project Plan   │ • Software Req  │ • Functional     │ • Sprint Plan   │ • User Acceptance│
│   Record     │ • Team Matrix &  │   Spec (SRS)    │   Specification  │ • Code Review   │   Test (UAT)     │
│ • Project    │   Roles          │ • Business Req  │ • Technical Spec │   Checklist     │ • Deployment Run │
│   Charter    │ • Risk & Quality │   Doc (BRD)     │ • Architecture   │ • Incident Log  │   Book           │
│              │   Strategy       │                 │   Design Doc     │ • Change Req Log│ • Project Sign-off│
└──────────────┴──────────────────┴─────────────────┴──────────────────┴─────────────────┴──────────────────┘
```

1. **Phase 1: Initiate**
   - `0. Master Record`: Core enterprise metadata, repository URLs, hosting credentials, and tech stack.
   - `1. Project Charter`: Business case, project objectives, executive sponsors, budget, and scope boundaries.
2. **Phase 2: Plan**
   - `2. Project Management Plan`: Milestones, critical path, delivery timeline, and work breakdown structure (WBS).
   - `3. Team & Resource Allocation`: Personnel roster, billable rates, weekly hours capacity, and reporting lines.
   - `4. Risk & Quality Strategy`: Risk impact matrix, mitigation plans, QA test methodology, and SLA definitions.
3. **Phase 3: Requirements**
   - `5. Software Requirements Spec (SRS)`: Functional modules, input/output specifications, non-functional requirements.
   - `6. Business Requirement Doc (BRD)`: Commercial requirements, stakeholder workflows, user personas.
4. **Phase 4: Design**
   - `7. Functional Specification`: Detailed screen-by-screen UX flow, form validation rules, and business logic.
   - `8. Technical Specification`: Database schema diagrams, REST/GraphQL API specifications, message queues.
   - `9. Architecture Design Document`: High-level system architecture, microservices, security model, scalability.
5. **Phase 5: Execution**
   - `10. Sprint Execution Plan`: Sprint goals, assigned story points, velocity metrics, and daily standup items.
   - `11. Code Review & QA Checklist`: Automated test pass criteria, static analysis rules, security audit sign-offs.
   - `12. Incident & Bug Tracking Log`: Severity 1-4 defect tracking, root-cause analysis (RCA), resolution timings.
   - `13. Change Request (CR) Log`: Scope change approvals, impact analysis on delivery schedule and costs.
6. **Phase 6: Handover & Support**
   - `14. User Acceptance Test (UAT)`: Client test scenarios, acceptance criteria, test sign-offs.
   - `15. Deployment & Release Runbook`: Production deployment steps, rollback procedures, health check endpoints.
   - `16. Project Closure & Handover`: Final handover certificate, warranty terms, client formal sign-off.

---

## 5. Feature Breakdown, Task Delegation & Time Tracking

### Feature Registry & Directives
- **Features (`project_features`)**: High-level modules derived from the Functional Spec & Technical Spec (e.g. `User Authentication`, `Billing Engine`, `Analytics Dashboard`).
- **Directives & Subtasks (`tasks`)**: Created by PM / TL with `parent_task_id`, `estimated_hours`, and sequence order.

### Micro-Level Time Tracker & Downtime System
Each assigned employee tracks their task execution through an interactive timer widget:
- **`Begin Task`**: Changes status to `In Progress`, records start timestamp in `task_time_logs`.
- **`Pause / Break`**: Triggers break modal (`Tea/Coffee Break`, `Meal Break`, `Meeting`, `Technical Blocker`). Tracks downtime in `totalBreakMinutes`.
- **`Resume`**: Resumes work timer and calculates net productivity time.
- **`Submit Deliverable`**: Prompts the developer for completion notes and proof-of-work URLs, then moves the task to `Submitted` (awaiting supervisor review).

### Supervisor Verification & Reopening Loop
1. **Technical Lead Review**: The supervisor opens the submitted task, inspects the deliverable notes and time logged.
2. **Approval**: Clicking `Verify & Approve` transitions task to `Verified`, awarding story points and updating progress.
3. **Rejection / Reopen**: Clicking `Request Revisions / Reopen` sets task back to `In Progress` with supervisor feedback remarks logged in `task_status_log`.

---

## 6. Document Branding, Watermarking & PDF Portfolio Export

The CRM includes a customizable print & export engine:
- **Watermarking**: Renders diagonal/faded text (`CONFIDENTIAL`, `DRAFT`, `FINAL`) or custom company watermark image across every page with configurable opacity.
- **Letterhead**: Integrates company logo, legal registration number, header alignment, and confidentiality notices.
- **Member Portfolio Export (`exportMemberPortfolioPdf`)**:
  - Employee photo & designation.
  - KPI summary (Net Work Logged, Break Delays, Completed Tasks, Story Points).
  - Itemized Task Table (Direct & Delegated).
  - Documents Authored & Filled Table.
  - Deliverable Submissions & Supervisor Review Log.
  - Audit Trail & Signature Blocks.

---

## 7. Master Database Schema (`UNIFIED_MASTER_SCHEMA.sql`)

All 14 relational tables, storage buckets, and security functions are consolidated in [`sql/UNIFIED_MASTER_SCHEMA.sql`](file:///c:/Users/kamal/OneDrive/Desktop/HR%20DOCS/PM/Project_management_CRM/sql/UNIFIED_MASTER_SCHEMA.sql).

### Table Dependency Order:
1. `organizations`: Core company profiles and document branding JSONB.
2. `organization_members`: Personnel credentials, user roles, and access tiers.
3. `employees_cache`: Cross-platform cached employee profiles.
4. `projects`: Project codes, lifecycle phases, clients, sponsors, and progress.
5. `project_members`: Project assignment rosters and reporting hierarchy.
6. `project_features`: Functional module registry with source document links.
7. `project_documents`: 16 digitized lifecycle templates with JSONB content and attachments.
8. `document_versions`: Immutable document snapshot history.
9. `tasks`: Feature directives, subtasks, estimated/actual hours, and blockers.
10. `task_time_logs`: Micro-level start, pause, break, and resume timer actions.
11. `task_reference_files`: Attached reference specifications, wireframes, and mockups.
12. `task_submissions`: Deliverable notes, completion URLs, and evidence attachments.
13. `task_status_log`: Supervisor feedback audit trail and verification remarks.
14. `audit_log`: Immutable platform mutation ledger.

---

## 8. Deployment & Setup Guide

### 1. Database Setup (Supabase)
1. Log in to your [Supabase Dashboard](https://app.supabase.com).
2. Open the **SQL Editor**.
3. Copy and paste the entire contents of [`sql/UNIFIED_MASTER_SCHEMA.sql`](file:///c:/Users/kamal/OneDrive/Desktop/HR%20DOCS/PM/Project_management_CRM/sql/UNIFIED_MASTER_SCHEMA.sql).
4. Click **Run**. The script will create all 14 tables, 4 storage buckets (`templates`, `watermarks`, `avatars`, `task_attachments`), indexes, and RLS policies.

### 2. Environment Configuration
Create a `.env` file in the project root:
```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-public-key
```

### 3. Local Development
```bash
# Install dependencies
npm install

# Run Vite dev server in browser
npm run dev

# Or launch as Desktop Electron App
npm run electron:dev
```

### 4. Production Build
```bash
# Build web bundle
npm run build

# Package Electron executable for Windows
npm run electron:build
```

---

## 9. Documentation-Driven Project Governance Architecture

Per the Refactoring Specification, the CRM integrates full lifecycle governance:

```
PROJECT -> GOVERNANCE -> DOCUMENTATION -> REQUIREMENTS -> FEATURES -> DIRECTIVES -> TASKS -> EXECUTION -> EVIDENCE -> VERIFICATION -> ACTUAL PROJECT DATA -> EXPORTS / REPORTS
```

### New Foundation Tables (`sql/012_governance_foundation.sql`)
1. **Document Governance**: `document_types`, `document_relationships`, `document_type_dependencies`, `document_approvals`, `document_fields`, `document_exports`.
2. **Requirements & Traceability**: `requirements`, `requirement_relationships`, `requirement_features`, `requirement_tasks`, `feature_tasks`.
3. **Project Governance**: `project_milestones`, `project_risks`, `blockers`, `change_requests`, `change_request_requirements`, `change_request_features`, `change_request_tasks`.
4. **Sprints**: `sprints`, `sprint_tasks`, `sprint_snapshots`.
5. **Workflow & Task Automation**: `workflow_rules`, `workflow_executions`, `task_events`, `task_evidence`.
6. **Quality & Defects**: `test_cases`, `task_test_cases`, `test_executions`, `bugs`, `bug_tasks`, `bug_requirements`, `bug_test_cases`, `bug_sprints`.
7. **Snapshots & RBAC**: `project_snapshots`, `role_permissions`, `architecture_components`, `project_screens`.

### Governance Services:
- `documentWorkflowService.ts`: State machine transitions, dependency checks, approval recording, revision branching (§8, §12, §13).
- `documentRelationshipService.ts`: Relational document dependency mapping (§11).
- `requirementService.ts`: First-class requirement records, BRD->SRS traceability, feature/task linking, coverage metrics (§14, §15, §17, §30, §101).
- `sprintService.ts`: Sprints, sprint tasks, velocity & capacity calculation, sprint closure snapshots (§22, §23, §46, §81).
- `workflowEngine.ts`: Idempotent domain event processor (`DOCUMENT_APPROVED`, `PROJECT_CREATED`, `TASK_VERIFIED`, etc.) (§27, §28, §29, §75).
- `taskEventService.ts`: Immutable task event history and state transition validation (§35, §36).
- `testService.ts`: Test cases, task test mapping, and historical test executions (§32, §33).
- `bugService.ts`: Defect management linked to requirements, features, tasks, and sprints (§34).
- `projectClosureService.ts`: Closure condition verification and immutable project snapshots (§82, §83).

