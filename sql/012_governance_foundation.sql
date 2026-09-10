-- =====================================================================
-- UNAI PM CRM — GOVERNANCE FOUNDATION MIGRATION
-- File: sql/012_governance_foundation.sql
-- Target: Supabase / PostgreSQL
-- Description: Adds ~30 new tables for documentation-driven project
--              governance, alters existing tables, adds indexes and RLS.
--              Follows spec sections 10-83 + 108-109.
-- =====================================================================
-- IMPORTANT: Run this AFTER all previous migrations (001–011).
-- This migration is ADDITIVE — it does NOT drop or rename existing columns.
-- =====================================================================

-- =====================================================================
-- A. ALTER EXISTING TABLES — Add new columns per spec
-- =====================================================================

-- A1. Projects — Add missing governance fields (§5)
ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS budget NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS technology TEXT,
  ADD COLUMN IF NOT EXISTS business_objective TEXT,
  ADD COLUMN IF NOT EXISTS project_type VARCHAR(50) DEFAULT 'Software',
  ADD COLUMN IF NOT EXISTS po_id VARCHAR(100),
  ADD COLUMN IF NOT EXISTS po_name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS actual_start_date DATE,
  ADD COLUMN IF NOT EXISTS actual_end_date DATE,
  ADD COLUMN IF NOT EXISTS closed_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS closed_by VARCHAR(100),
  ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS deleted_by VARCHAR(100);

-- A2. Project Features — Add governance fields (§16)
ALTER TABLE public.project_features
  ADD COLUMN IF NOT EXISTS feature_code VARCHAR(50),
  ADD COLUMN IF NOT EXISTS business_value TEXT,
  ADD COLUMN IF NOT EXISTS planned_start DATE,
  ADD COLUMN IF NOT EXISTS planned_end DATE,
  ADD COLUMN IF NOT EXISTS actual_start DATE,
  ADD COLUMN IF NOT EXISTS actual_end DATE,
  ADD COLUMN IF NOT EXISTS story_points INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;

-- A3. Tasks — Add ownership model + governance fields (§25, §26)
ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS task_code VARCHAR(50),
  ADD COLUMN IF NOT EXISTS directive_owner VARCHAR(100),
  ADD COLUMN IF NOT EXISTS directive_owner_name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS assigned_tl VARCHAR(100),
  ADD COLUMN IF NOT EXISTS assigned_tl_name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS reviewer VARCHAR(100),
  ADD COLUMN IF NOT EXISTS reviewer_name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS verified_by VARCHAR(100),
  ADD COLUMN IF NOT EXISTS verified_by_name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS verified_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS sprint_id VARCHAR(100),
  ADD COLUMN IF NOT EXISTS requirement_id VARCHAR(100),
  ADD COLUMN IF NOT EXISTS acceptance_criteria TEXT,
  ADD COLUMN IF NOT EXISTS story_points INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS planned_start DATE,
  ADD COLUMN IF NOT EXISTS planned_end DATE,
  ADD COLUMN IF NOT EXISTS generation_source VARCHAR(100),
  ADD COLUMN IF NOT EXISTS generation_event VARCHAR(100),
  ADD COLUMN IF NOT EXISTS generation_rule_id VARCHAR(100),
  ADD COLUMN IF NOT EXISTS source_document_id VARCHAR(100),
  ADD COLUMN IF NOT EXISTS source_version_id VARCHAR(100),
  ADD COLUMN IF NOT EXISTS source_requirement_id VARCHAR(100),
  ADD COLUMN IF NOT EXISTS source_feature_id VARCHAR(100),
  ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;

-- A4. Project Documents — Add structured references (§10)
ALTER TABLE public.project_documents
  ADD COLUMN IF NOT EXISTS document_type_id VARCHAR(100),
  ADD COLUMN IF NOT EXISTS current_version_id VARCHAR(100),
  ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;


-- =====================================================================
-- B. DOCUMENT GOVERNANCE TABLES (§10–§13, §54)
-- =====================================================================

-- B1. Document Types — Database-driven template registry (§10)
CREATE TABLE IF NOT EXISTS public.document_types (
    id              VARCHAR(100) PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    code            VARCHAR(50) NOT NULL UNIQUE,
    name            VARCHAR(255) NOT NULL,
    phase           VARCHAR(50) NOT NULL,
    description     TEXT,
    sequence_order  INTEGER NOT NULL DEFAULT 0,
    is_required     BOOLEAN DEFAULT false,
    requires_approval BOOLEAN DEFAULT true,
    template_version VARCHAR(30) DEFAULT '1.0',
    legacy_template_id INTEGER,
    organization_id VARCHAR(100) REFERENCES public.organizations(id) ON DELETE CASCADE,
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- B2. Document Relationships (§11)
CREATE TABLE IF NOT EXISTS public.document_relationships (
    id                  VARCHAR(100) PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    project_id          VARCHAR(100) NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    source_document_id  VARCHAR(100) NOT NULL REFERENCES public.project_documents(id) ON DELETE CASCADE,
    target_document_id  VARCHAR(100) NOT NULL REFERENCES public.project_documents(id) ON DELETE CASCADE,
    relationship_type   VARCHAR(50) NOT NULL CHECK (relationship_type IN (
        'depends_on', 'derived_from', 'supports', 'supersedes', 'references', 'requires'
    )),
    created_by          VARCHAR(100),
    created_at          TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (source_document_id, target_document_id, relationship_type)
);

-- B3. Document Dependencies — Type-level dependency rules (§12)
CREATE TABLE IF NOT EXISTS public.document_type_dependencies (
    id                          VARCHAR(100) PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    document_type_id            VARCHAR(100) NOT NULL REFERENCES public.document_types(id) ON DELETE CASCADE,
    depends_on_document_type_id VARCHAR(100) NOT NULL REFERENCES public.document_types(id) ON DELETE CASCADE,
    required_status             VARCHAR(50) NOT NULL DEFAULT 'Approved',
    dependency_rule             VARCHAR(100) DEFAULT 'must_be_approved',
    UNIQUE (document_type_id, depends_on_document_type_id)
);

-- B4. Document Approvals (§13)
CREATE TABLE IF NOT EXISTS public.document_approvals (
    id              VARCHAR(100) PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    document_id     VARCHAR(100) NOT NULL REFERENCES public.project_documents(id) ON DELETE CASCADE,
    version_id      VARCHAR(100) REFERENCES public.document_versions(id) ON DELETE SET NULL,
    approver_id     VARCHAR(100) NOT NULL,
    approver_name   VARCHAR(255),
    approver_role   VARCHAR(50),
    decision        VARCHAR(50) NOT NULL CHECK (decision IN ('Approved', 'Rejected', 'Changes Requested')),
    comments        TEXT,
    approved_at     TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- B5. Document Fields — Configurable field definitions (§54)
CREATE TABLE IF NOT EXISTS public.document_fields (
    id                      VARCHAR(100) PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    document_type_id        VARCHAR(100) NOT NULL REFERENCES public.document_types(id) ON DELETE CASCADE,
    field_key               VARCHAR(100) NOT NULL,
    label                   VARCHAR(255) NOT NULL,
    field_type              VARCHAR(50) NOT NULL CHECK (field_type IN (
        'text', 'textarea', 'number', 'date', 'datetime', 'select', 'multiselect',
        'user', 'team', 'entity-reference', 'rich-text', 'table', 'file', 'url', 'boolean'
    )),
    section                 VARCHAR(100),
    required                BOOLEAN DEFAULT false,
    read_only               BOOLEAN DEFAULT false,
    inherited_from_entity   VARCHAR(100),
    calculated              BOOLEAN DEFAULT false,
    validation_rules        JSONB DEFAULT '{}'::jsonb,
    display_order           INTEGER DEFAULT 0,
    UNIQUE (document_type_id, field_key)
);

-- B6. Document Exports — Export audit trail (§45)
CREATE TABLE IF NOT EXISTS public.document_exports (
    id              VARCHAR(100) PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    project_id      VARCHAR(100) NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    document_id     VARCHAR(100) NOT NULL REFERENCES public.project_documents(id) ON DELETE CASCADE,
    version_id      VARCHAR(100) REFERENCES public.document_versions(id) ON DELETE SET NULL,
    export_type     VARCHAR(30) NOT NULL CHECK (export_type IN ('PDF', 'DOCX', 'Print')),
    snapshot_id     VARCHAR(100),
    generated_by    VARCHAR(100),
    generated_by_name VARCHAR(255),
    generated_at    TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    file_path       TEXT,
    file_url        TEXT,
    checksum        VARCHAR(128),
    metadata        JSONB DEFAULT '{}'::jsonb,
    organization_id VARCHAR(100) NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE
);


-- =====================================================================
-- C. REQUIREMENTS & TRACEABILITY TABLES (§14–§17, §30–§31)
-- =====================================================================

-- C1. Requirements — First-class entities with permanent IDs (§14)
CREATE TABLE IF NOT EXISTS public.requirements (
    id                  VARCHAR(100) PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    project_id          VARCHAR(100) NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    document_id         VARCHAR(100) REFERENCES public.project_documents(id) ON DELETE SET NULL,
    requirement_code    VARCHAR(50) NOT NULL,
    requirement_type    VARCHAR(50) NOT NULL CHECK (requirement_type IN (
        'Business', 'Functional', 'Non-Functional', 'Technical', 'UX', 'Security', 'Compliance'
    )),
    title               VARCHAR(500) NOT NULL,
    description         TEXT,
    priority            VARCHAR(30) DEFAULT 'Medium',
    source              TEXT,
    acceptance_criteria TEXT,
    status              VARCHAR(50) NOT NULL DEFAULT 'Draft' CHECK (status IN (
        'Draft', 'Active', 'Approved', 'Deprecated', 'Rejected'
    )),
    version             VARCHAR(30) DEFAULT '1.0',
    created_by          VARCHAR(100),
    created_by_name     VARCHAR(255),
    approved_by         VARCHAR(100),
    approved_by_name    VARCHAR(255),
    approved_at         TIMESTAMP WITH TIME ZONE,
    organization_id     VARCHAR(100) NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    is_deleted          BOOLEAN DEFAULT false,
    created_at          TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (project_id, requirement_code)
);

-- C2. Requirement Relationships — BRD->SRS tracing (§15)
CREATE TABLE IF NOT EXISTS public.requirement_relationships (
    id                      VARCHAR(100) PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    source_requirement_id   VARCHAR(100) NOT NULL REFERENCES public.requirements(id) ON DELETE CASCADE,
    target_requirement_id   VARCHAR(100) NOT NULL REFERENCES public.requirements(id) ON DELETE CASCADE,
    relationship_type       VARCHAR(50) NOT NULL DEFAULT 'derived_from',
    created_at              TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (source_requirement_id, target_requirement_id, relationship_type)
);

-- C3. Requirement -> Feature junction (§17)
CREATE TABLE IF NOT EXISTS public.requirement_features (
    id                  VARCHAR(100) PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    requirement_id      VARCHAR(100) NOT NULL REFERENCES public.requirements(id) ON DELETE CASCADE,
    feature_id          VARCHAR(100) NOT NULL REFERENCES public.project_features(id) ON DELETE CASCADE,
    relationship_type   VARCHAR(50) DEFAULT 'implements',
    created_at          TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (requirement_id, feature_id)
);

-- C4. Requirement -> Task traceability (§30)
CREATE TABLE IF NOT EXISTS public.requirement_tasks (
    id                  VARCHAR(100) PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    requirement_id      VARCHAR(100) NOT NULL REFERENCES public.requirements(id) ON DELETE CASCADE,
    task_id             VARCHAR(100) NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
    relationship_type   VARCHAR(50) DEFAULT 'implements',
    created_at          TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (requirement_id, task_id)
);

-- C5. Feature -> Task traceability (§31)
CREATE TABLE IF NOT EXISTS public.feature_tasks (
    id                  VARCHAR(100) PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    feature_id          VARCHAR(100) NOT NULL REFERENCES public.project_features(id) ON DELETE CASCADE,
    task_id             VARCHAR(100) NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
    relationship_type   VARCHAR(50) DEFAULT 'implements',
    created_at          TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (feature_id, task_id)
);


-- =====================================================================
-- D. PROJECT GOVERNANCE TABLES (§18–§21)
-- =====================================================================

-- D1. Project Milestones (§18)
CREATE TABLE IF NOT EXISTS public.project_milestones (
    id              VARCHAR(100) PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    project_id      VARCHAR(100) NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    milestone_code  VARCHAR(50) NOT NULL,
    name            VARCHAR(255) NOT NULL,
    description     TEXT,
    planned_start   DATE,
    planned_end     DATE,
    actual_start    DATE,
    actual_end      DATE,
    owner_id        VARCHAR(100),
    owner_name      VARCHAR(255),
    status          VARCHAR(50) NOT NULL DEFAULT 'Pending' CHECK (status IN (
        'Pending', 'In Progress', 'Completed', 'Delayed', 'At Risk', 'Cancelled'
    )),
    progress        INTEGER DEFAULT 0,
    organization_id VARCHAR(100) NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    is_deleted      BOOLEAN DEFAULT false,
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (project_id, milestone_code)
);

-- D2. Project Risks (§19)
CREATE TABLE IF NOT EXISTS public.project_risks (
    id              VARCHAR(100) PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    project_id      VARCHAR(100) NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    risk_code       VARCHAR(50) NOT NULL,
    title           VARCHAR(255) NOT NULL,
    description     TEXT,
    likelihood      VARCHAR(30) CHECK (likelihood IN ('Very Low', 'Low', 'Medium', 'High', 'Very High')),
    impact          VARCHAR(30) CHECK (impact IN ('Very Low', 'Low', 'Medium', 'High', 'Very High')),
    severity        VARCHAR(30) CHECK (severity IN ('Low', 'Medium', 'High', 'Critical')),
    mitigation      TEXT,
    owner_id        VARCHAR(100),
    owner_name      VARCHAR(255),
    status          VARCHAR(50) NOT NULL DEFAULT 'Open' CHECK (status IN (
        'Open', 'Mitigated', 'Resolved', 'Accepted', 'Closed'
    )),
    identified_at   TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    resolved_at     TIMESTAMP WITH TIME ZONE,
    organization_id VARCHAR(100) NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    is_deleted      BOOLEAN DEFAULT false,
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (project_id, risk_code)
);

-- D3. Blockers (§20)
CREATE TABLE IF NOT EXISTS public.blockers (
    id              VARCHAR(100) PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    project_id      VARCHAR(100) NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    feature_id      VARCHAR(100) REFERENCES public.project_features(id) ON DELETE SET NULL,
    task_id         VARCHAR(100) REFERENCES public.tasks(id) ON DELETE SET NULL,
    reported_by     VARCHAR(100),
    reported_by_name VARCHAR(255),
    owner_id        VARCHAR(100),
    owner_name      VARCHAR(255),
    severity        VARCHAR(30) DEFAULT 'Medium' CHECK (severity IN ('Low', 'Medium', 'High', 'Critical')),
    reason          TEXT NOT NULL,
    impact          TEXT,
    status          VARCHAR(50) NOT NULL DEFAULT 'Open' CHECK (status IN (
        'Open', 'In Progress', 'Resolved', 'Closed'
    )),
    started_at      TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    resolved_at     TIMESTAMP WITH TIME ZONE,
    resolution      TEXT,
    organization_id VARCHAR(100) NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    is_deleted      BOOLEAN DEFAULT false,
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- D4. Change Requests (§21)
CREATE TABLE IF NOT EXISTS public.change_requests (
    id                  VARCHAR(100) PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    project_id          VARCHAR(100) NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    change_code         VARCHAR(50) NOT NULL,
    title               VARCHAR(255) NOT NULL,
    description         TEXT,
    reason              TEXT,
    requested_by        VARCHAR(100),
    requested_by_name   VARCHAR(255),
    impact_scope        TEXT,
    impact_schedule     TEXT,
    impact_cost         TEXT,
    impact_resources    TEXT,
    status              VARCHAR(50) NOT NULL DEFAULT 'Pending' CHECK (status IN (
        'Pending', 'Under Review', 'Approved', 'Rejected', 'Implemented', 'Closed'
    )),
    approved_by         VARCHAR(100),
    approved_by_name    VARCHAR(255),
    approved_at         TIMESTAMP WITH TIME ZONE,
    organization_id     VARCHAR(100) NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    is_deleted          BOOLEAN DEFAULT false,
    created_at          TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (project_id, change_code)
);

-- D4b. Change Request Junction Tables
CREATE TABLE IF NOT EXISTS public.change_request_requirements (
    id                  VARCHAR(100) PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    change_request_id   VARCHAR(100) NOT NULL REFERENCES public.change_requests(id) ON DELETE CASCADE,
    requirement_id      VARCHAR(100) NOT NULL REFERENCES public.requirements(id) ON DELETE CASCADE,
    created_at          TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (change_request_id, requirement_id)
);

CREATE TABLE IF NOT EXISTS public.change_request_features (
    id                  VARCHAR(100) PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    change_request_id   VARCHAR(100) NOT NULL REFERENCES public.change_requests(id) ON DELETE CASCADE,
    feature_id          VARCHAR(100) NOT NULL REFERENCES public.project_features(id) ON DELETE CASCADE,
    created_at          TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (change_request_id, feature_id)
);

CREATE TABLE IF NOT EXISTS public.change_request_tasks (
    id                  VARCHAR(100) PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    change_request_id   VARCHAR(100) NOT NULL REFERENCES public.change_requests(id) ON DELETE CASCADE,
    task_id             VARCHAR(100) NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
    created_at          TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (change_request_id, task_id)
);


-- =====================================================================
-- E. SPRINT SYSTEM TABLES (§22–§23)
-- =====================================================================

-- E1. Sprints — First-class entity (§22)
CREATE TABLE IF NOT EXISTS public.sprints (
    id                      VARCHAR(100) PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    project_id              VARCHAR(100) NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    sprint_code             VARCHAR(50) NOT NULL,
    sprint_number           INTEGER NOT NULL,
    goal                    TEXT,
    planned_start           DATE,
    planned_end             DATE,
    actual_start            DATE,
    actual_end              DATE,
    scrum_master_id         VARCHAR(100),
    scrum_master_name       VARCHAR(255),
    committed_story_points  INTEGER DEFAULT 0,
    completed_story_points  INTEGER DEFAULT 0,
    planned_capacity_hours  NUMERIC(8,2) DEFAULT 0,
    actual_hours            NUMERIC(8,2) DEFAULT 0,
    status                  VARCHAR(50) NOT NULL DEFAULT 'Planning' CHECK (status IN (
        'Planning', 'Active', 'Completed', 'Cancelled'
    )),
    closed_at               TIMESTAMP WITH TIME ZONE,
    closed_by               VARCHAR(100),
    organization_id         VARCHAR(100) NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    is_deleted              BOOLEAN DEFAULT false,
    created_at              TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at              TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (project_id, sprint_code)
);

-- E2. Sprint Tasks — Sprint <-> Task association (§22)
CREATE TABLE IF NOT EXISTS public.sprint_tasks (
    id              VARCHAR(100) PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    sprint_id       VARCHAR(100) NOT NULL REFERENCES public.sprints(id) ON DELETE CASCADE,
    task_id         VARCHAR(100) NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
    committed_at    TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    removed_at      TIMESTAMP WITH TIME ZONE,
    removed_reason  TEXT,
    carry_forward_sprint_id VARCHAR(100) REFERENCES public.sprints(id) ON DELETE SET NULL,
    carry_forward_reason    TEXT,
    carry_forward_approved_by VARCHAR(100),
    UNIQUE (sprint_id, task_id)
);

-- E3. Sprint Snapshots — Immutable closure data (§23)
CREATE TABLE IF NOT EXISTS public.sprint_snapshots (
    id              VARCHAR(100) PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    sprint_id       VARCHAR(100) NOT NULL REFERENCES public.sprints(id) ON DELETE CASCADE,
    snapshot_type   VARCHAR(50) NOT NULL CHECK (snapshot_type IN (
        'Planning', 'Mid-Sprint', 'Closure'
    )),
    snapshot_version VARCHAR(30) DEFAULT '1.0',
    snapshot_data   JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_by      VARCHAR(100),
    created_by_name VARCHAR(255),
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);


-- =====================================================================
-- F. WORKFLOW ENGINE TABLES (§28–§29)
-- =====================================================================

-- F1. Workflow Rules — Configurable automation (§28)
CREATE TABLE IF NOT EXISTS public.workflow_rules (
    id                  VARCHAR(100) PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    project_id          VARCHAR(100) REFERENCES public.projects(id) ON DELETE CASCADE,
    document_type_id    VARCHAR(100) REFERENCES public.document_types(id) ON DELETE SET NULL,
    event_type          VARCHAR(100) NOT NULL,
    action_type         VARCHAR(100) NOT NULL,
    target_role         VARCHAR(50),
    task_template       JSONB DEFAULT '{}'::jsonb,
    sequence_order      INTEGER DEFAULT 0,
    is_active           BOOLEAN DEFAULT true,
    conditions          JSONB DEFAULT '{}'::jsonb,
    organization_id     VARCHAR(100) REFERENCES public.organizations(id) ON DELETE CASCADE,
    created_at          TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- F2. Workflow Executions — Idempotency tracking (§29)
CREATE TABLE IF NOT EXISTS public.workflow_executions (
    id                  VARCHAR(100) PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    event_type          VARCHAR(100) NOT NULL,
    source_entity_type  VARCHAR(50) NOT NULL,
    source_entity_id    VARCHAR(100) NOT NULL,
    workflow_rule_id    VARCHAR(100) REFERENCES public.workflow_rules(id) ON DELETE SET NULL,
    execution_key       VARCHAR(255) NOT NULL UNIQUE,
    status              VARCHAR(50) NOT NULL DEFAULT 'Completed' CHECK (status IN (
        'Pending', 'Completed', 'Failed', 'Skipped'
    )),
    result_metadata     JSONB DEFAULT '{}'::jsonb,
    created_at          TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);


-- =====================================================================
-- G. TASK EVENT & EVIDENCE TABLES (§36, §38)
-- =====================================================================

-- G1. Task Events — Immutable event log (§36)
CREATE TABLE IF NOT EXISTS public.task_events (
    id              VARCHAR(100) PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    task_id         VARCHAR(100) NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
    project_id      VARCHAR(100) NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    event_type      VARCHAR(50) NOT NULL CHECK (event_type IN (
        'CREATED', 'ASSIGNED', 'ACCEPTED', 'STARTED', 'PAUSED', 'RESUMED',
        'BLOCKED', 'UNBLOCKED', 'SUBMITTED', 'REVISION_REQUESTED',
        'RESUBMITTED', 'VERIFIED', 'CLOSED', 'CANCELLED', 'REOPENED'
    )),
    from_status     VARCHAR(50),
    to_status       VARCHAR(50),
    actor_id        VARCHAR(100),
    actor_name      VARCHAR(255),
    metadata        JSONB DEFAULT '{}'::jsonb,
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- G2. Task Evidence — Structured evidence records (§38)
CREATE TABLE IF NOT EXISTS public.task_evidence (
    id              VARCHAR(100) PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    task_id         VARCHAR(100) NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
    submission_id   VARCHAR(100) REFERENCES public.task_submissions(id) ON DELETE SET NULL,
    evidence_type   VARCHAR(50) NOT NULL CHECK (evidence_type IN (
        'Repository', 'Pull Request', 'Screenshot', 'Video', 'Document',
        'Deployment', 'API', 'Test Result', 'Design', 'Other'
    )),
    title           VARCHAR(255),
    description     TEXT,
    url             TEXT,
    storage_path    TEXT,
    uploaded_by     VARCHAR(100),
    uploaded_by_name VARCHAR(255),
    organization_id VARCHAR(100) NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);


-- =====================================================================
-- H. TESTING & DEFECT TABLES (§32–§34)
-- =====================================================================

-- H1. Test Cases (§32)
CREATE TABLE IF NOT EXISTS public.test_cases (
    id              VARCHAR(100) PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    project_id      VARCHAR(100) NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    test_case_code  VARCHAR(50) NOT NULL,
    requirement_id  VARCHAR(100) REFERENCES public.requirements(id) ON DELETE SET NULL,
    feature_id      VARCHAR(100) REFERENCES public.project_features(id) ON DELETE SET NULL,
    module          VARCHAR(255),
    description     TEXT NOT NULL,
    preconditions   TEXT,
    steps           JSONB DEFAULT '[]'::jsonb,
    expected_result TEXT,
    priority        VARCHAR(30) DEFAULT 'Medium',
    status          VARCHAR(50) NOT NULL DEFAULT 'Not Run' CHECK (status IN (
        'Not Run', 'Passed', 'Failed', 'Blocked', 'Skipped'
    )),
    created_by      VARCHAR(100),
    created_by_name VARCHAR(255),
    organization_id VARCHAR(100) NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    is_deleted      BOOLEAN DEFAULT false,
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (project_id, test_case_code)
);

-- H1b. Task <-> Test Case junction (§32)
CREATE TABLE IF NOT EXISTS public.task_test_cases (
    id              VARCHAR(100) PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    task_id         VARCHAR(100) NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
    test_case_id    VARCHAR(100) NOT NULL REFERENCES public.test_cases(id) ON DELETE CASCADE,
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (task_id, test_case_id)
);

-- H2. Test Executions (§33)
CREATE TABLE IF NOT EXISTS public.test_executions (
    id              VARCHAR(100) PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    test_case_id    VARCHAR(100) NOT NULL REFERENCES public.test_cases(id) ON DELETE CASCADE,
    executed_by     VARCHAR(100),
    executed_by_name VARCHAR(255),
    executed_at     TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    environment     VARCHAR(100),
    actual_result   TEXT,
    status          VARCHAR(50) NOT NULL CHECK (status IN (
        'Not Run', 'Passed', 'Failed', 'Blocked', 'Skipped'
    )),
    remarks         TEXT,
    evidence        JSONB DEFAULT '[]'::jsonb
);

-- H3. Bugs / Defects (§34)
CREATE TABLE IF NOT EXISTS public.bugs (
    id              VARCHAR(100) PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    project_id      VARCHAR(100) NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    bug_code        VARCHAR(50) NOT NULL,
    title           VARCHAR(255) NOT NULL,
    description     TEXT,
    severity        VARCHAR(30) CHECK (severity IN ('Low', 'Medium', 'High', 'Critical')),
    priority        VARCHAR(30) DEFAULT 'Medium',
    reported_by     VARCHAR(100),
    reported_by_name VARCHAR(255),
    assigned_to     VARCHAR(100),
    assigned_to_name VARCHAR(255),
    feature_id      VARCHAR(100) REFERENCES public.project_features(id) ON DELETE SET NULL,
    requirement_id  VARCHAR(100) REFERENCES public.requirements(id) ON DELETE SET NULL,
    test_case_id    VARCHAR(100) REFERENCES public.test_cases(id) ON DELETE SET NULL,
    status          VARCHAR(50) NOT NULL DEFAULT 'Open' CHECK (status IN (
        'Open', 'In Progress', 'Resolved', 'Verified', 'Closed', 'Reopened', 'Deferred'
    )),
    root_cause      TEXT,
    resolution      TEXT,
    reported_at     TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    resolved_at     TIMESTAMP WITH TIME ZONE,
    verified_at     TIMESTAMP WITH TIME ZONE,
    organization_id VARCHAR(100) NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    is_deleted      BOOLEAN DEFAULT false,
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (project_id, bug_code)
);

-- H3b. Bug Junction Tables
CREATE TABLE IF NOT EXISTS public.bug_tasks (
    id      VARCHAR(100) PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    bug_id  VARCHAR(100) NOT NULL REFERENCES public.bugs(id) ON DELETE CASCADE,
    task_id VARCHAR(100) NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (bug_id, task_id)
);

CREATE TABLE IF NOT EXISTS public.bug_requirements (
    id              VARCHAR(100) PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    bug_id          VARCHAR(100) NOT NULL REFERENCES public.bugs(id) ON DELETE CASCADE,
    requirement_id  VARCHAR(100) NOT NULL REFERENCES public.requirements(id) ON DELETE CASCADE,
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (bug_id, requirement_id)
);

CREATE TABLE IF NOT EXISTS public.bug_test_cases (
    id              VARCHAR(100) PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    bug_id          VARCHAR(100) NOT NULL REFERENCES public.bugs(id) ON DELETE CASCADE,
    test_case_id    VARCHAR(100) NOT NULL REFERENCES public.test_cases(id) ON DELETE CASCADE,
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (bug_id, test_case_id)
);

CREATE TABLE IF NOT EXISTS public.bug_sprints (
    id          VARCHAR(100) PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    bug_id      VARCHAR(100) NOT NULL REFERENCES public.bugs(id) ON DELETE CASCADE,
    sprint_id   VARCHAR(100) NOT NULL REFERENCES public.sprints(id) ON DELETE CASCADE,
    created_at  TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (bug_id, sprint_id)
);


-- =====================================================================
-- I. OPTIONAL / P3 TABLES (§51–§53)
-- =====================================================================

-- I1. API Endpoints (§51, optional)
CREATE TABLE IF NOT EXISTS public.api_endpoints (
    id              VARCHAR(100) PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    project_id      VARCHAR(100) NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    feature_id      VARCHAR(100) REFERENCES public.project_features(id) ON DELETE SET NULL,
    method          VARCHAR(10) NOT NULL CHECK (method IN ('GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS')),
    path            VARCHAR(500) NOT NULL,
    description     TEXT,
    request_schema  JSONB DEFAULT '{}'::jsonb,
    response_schema JSONB DEFAULT '{}'::jsonb,
    authentication  VARCHAR(100),
    status          VARCHAR(50) DEFAULT 'Planned',
    organization_id VARCHAR(100) NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- I2. Architecture Components (§52)
CREATE TABLE IF NOT EXISTS public.architecture_components (
    id                          VARCHAR(100) PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    project_id                  VARCHAR(100) NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    architecture_document_id    VARCHAR(100) REFERENCES public.project_documents(id) ON DELETE SET NULL,
    component_code              VARCHAR(50) NOT NULL,
    name                        VARCHAR(255) NOT NULL,
    description                 TEXT,
    technology                  VARCHAR(255),
    owner_id                    VARCHAR(100),
    owner_name                  VARCHAR(255),
    status                      VARCHAR(50) DEFAULT 'Planned',
    organization_id             VARCHAR(100) NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    created_at                  TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at                  TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (project_id, component_code)
);

-- I3. Project Screens (§53)
CREATE TABLE IF NOT EXISTS public.project_screens (
    id              VARCHAR(100) PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    project_id      VARCHAR(100) NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    screen_code     VARCHAR(50) NOT NULL,
    name            VARCHAR(255) NOT NULL,
    description     TEXT,
    route           VARCHAR(255),
    reference_url   TEXT,
    status          VARCHAR(50) DEFAULT 'Planned',
    organization_id VARCHAR(100) NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (project_id, screen_code)
);

-- I3b. Screen Junction Tables
CREATE TABLE IF NOT EXISTS public.screen_features (
    id          VARCHAR(100) PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    screen_id   VARCHAR(100) NOT NULL REFERENCES public.project_screens(id) ON DELETE CASCADE,
    feature_id  VARCHAR(100) NOT NULL REFERENCES public.project_features(id) ON DELETE CASCADE,
    created_at  TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (screen_id, feature_id)
);

CREATE TABLE IF NOT EXISTS public.screen_requirements (
    id              VARCHAR(100) PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    screen_id       VARCHAR(100) NOT NULL REFERENCES public.project_screens(id) ON DELETE CASCADE,
    requirement_id  VARCHAR(100) NOT NULL REFERENCES public.requirements(id) ON DELETE CASCADE,
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (screen_id, requirement_id)
);

CREATE TABLE IF NOT EXISTS public.screen_test_cases (
    id              VARCHAR(100) PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    screen_id       VARCHAR(100) NOT NULL REFERENCES public.project_screens(id) ON DELETE CASCADE,
    test_case_id    VARCHAR(100) NOT NULL REFERENCES public.test_cases(id) ON DELETE CASCADE,
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (screen_id, test_case_id)
);


-- =====================================================================
-- J. PROJECT SNAPSHOTS (§83)
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.project_snapshots (
    id              VARCHAR(100) PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    project_id      VARCHAR(100) NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    snapshot_type   VARCHAR(50) NOT NULL CHECK (snapshot_type IN (
        'Baseline', 'Milestone', 'Sprint Closure', 'Release', 'Project Closure'
    )),
    snapshot_version VARCHAR(30) DEFAULT '1.0',
    snapshot_data   JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_by      VARCHAR(100),
    created_by_name VARCHAR(255),
    organization_id VARCHAR(100) NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);


-- =====================================================================
-- K. RBAC PERMISSIONS (§64–§65)
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.role_permissions (
    id              VARCHAR(100) PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    role            VARCHAR(50) NOT NULL,
    permission      VARCHAR(100) NOT NULL,
    scope           VARCHAR(50) DEFAULT 'project',
    organization_id VARCHAR(100) REFERENCES public.organizations(id) ON DELETE CASCADE,
    is_active       BOOLEAN DEFAULT true,
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Seed default permissions
INSERT INTO public.role_permissions (id, role, permission, scope) VALUES
  -- CTO
  (uuid_generate_v4()::text, 'CTO', 'project.create', 'system'),
  (uuid_generate_v4()::text, 'CTO', 'project.read', 'system'),
  (uuid_generate_v4()::text, 'CTO', 'project.update', 'system'),
  (uuid_generate_v4()::text, 'CTO', 'project.close', 'system'),
  (uuid_generate_v4()::text, 'CTO', 'document.create', 'project'),
  (uuid_generate_v4()::text, 'CTO', 'document.edit', 'project'),
  (uuid_generate_v4()::text, 'CTO', 'document.submit', 'project'),
  (uuid_generate_v4()::text, 'CTO', 'document.approve', 'project'),
  (uuid_generate_v4()::text, 'CTO', 'document.lock', 'project'),
  (uuid_generate_v4()::text, 'CTO', 'requirement.create', 'project'),
  (uuid_generate_v4()::text, 'CTO', 'requirement.update', 'project'),
  (uuid_generate_v4()::text, 'CTO', 'requirement.approve', 'project'),
  (uuid_generate_v4()::text, 'CTO', 'feature.create', 'project'),
  (uuid_generate_v4()::text, 'CTO', 'feature.update', 'project'),
  (uuid_generate_v4()::text, 'CTO', 'task.create', 'project'),
  (uuid_generate_v4()::text, 'CTO', 'task.assign', 'project'),
  (uuid_generate_v4()::text, 'CTO', 'task.verify', 'project'),
  (uuid_generate_v4()::text, 'CTO', 'sprint.create', 'project'),
  (uuid_generate_v4()::text, 'CTO', 'sprint.update', 'project'),
  (uuid_generate_v4()::text, 'CTO', 'sprint.close', 'project'),
  (uuid_generate_v4()::text, 'CTO', 'test.create', 'project'),
  (uuid_generate_v4()::text, 'CTO', 'test.execute', 'project'),
  (uuid_generate_v4()::text, 'CTO', 'change_request.create', 'project'),
  (uuid_generate_v4()::text, 'CTO', 'change_request.approve', 'project'),
  -- PM
  (uuid_generate_v4()::text, 'PM', 'project.read', 'project'),
  (uuid_generate_v4()::text, 'PM', 'project.update', 'project'),
  (uuid_generate_v4()::text, 'PM', 'document.create', 'project'),
  (uuid_generate_v4()::text, 'PM', 'document.edit', 'project'),
  (uuid_generate_v4()::text, 'PM', 'document.submit', 'project'),
  (uuid_generate_v4()::text, 'PM', 'document.approve', 'project'),
  (uuid_generate_v4()::text, 'PM', 'requirement.create', 'project'),
  (uuid_generate_v4()::text, 'PM', 'requirement.update', 'project'),
  (uuid_generate_v4()::text, 'PM', 'feature.create', 'project'),
  (uuid_generate_v4()::text, 'PM', 'feature.update', 'project'),
  (uuid_generate_v4()::text, 'PM', 'task.create', 'project'),
  (uuid_generate_v4()::text, 'PM', 'task.assign', 'project'),
  (uuid_generate_v4()::text, 'PM', 'sprint.create', 'project'),
  (uuid_generate_v4()::text, 'PM', 'sprint.update', 'project'),
  (uuid_generate_v4()::text, 'PM', 'sprint.close', 'project'),
  (uuid_generate_v4()::text, 'PM', 'change_request.create', 'project'),
  -- TL
  (uuid_generate_v4()::text, 'TL', 'project.read', 'project'),
  (uuid_generate_v4()::text, 'TL', 'task.create', 'project'),
  (uuid_generate_v4()::text, 'TL', 'task.assign', 'project'),
  (uuid_generate_v4()::text, 'TL', 'task.verify', 'project'),
  (uuid_generate_v4()::text, 'TL', 'task.reopen', 'project'),
  (uuid_generate_v4()::text, 'TL', 'test.create', 'project'),
  (uuid_generate_v4()::text, 'TL', 'test.execute', 'project'),
  (uuid_generate_v4()::text, 'TL', 'sprint.update', 'project'),
  -- Employee
  (uuid_generate_v4()::text, 'Employee', 'project.read', 'project'),
  (uuid_generate_v4()::text, 'Employee', 'task.accept', 'project'),
  (uuid_generate_v4()::text, 'Employee', 'task.submit', 'project'),
  (uuid_generate_v4()::text, 'Employee', 'test.execute', 'project')
ON CONFLICT DO NOTHING;


-- =====================================================================
-- L. PERFORMANCE INDEXES FOR NEW TABLES
-- =====================================================================

CREATE INDEX IF NOT EXISTS idx_doc_types_code ON public.document_types(code);
CREATE INDEX IF NOT EXISTS idx_doc_types_org ON public.document_types(organization_id);
CREATE INDEX IF NOT EXISTS idx_doc_relationships_project ON public.document_relationships(project_id);
CREATE INDEX IF NOT EXISTS idx_doc_relationships_source ON public.document_relationships(source_document_id);
CREATE INDEX IF NOT EXISTS idx_doc_relationships_target ON public.document_relationships(target_document_id);
CREATE INDEX IF NOT EXISTS idx_doc_approvals_doc ON public.document_approvals(document_id);
CREATE INDEX IF NOT EXISTS idx_doc_approvals_approver ON public.document_approvals(approver_id);
CREATE INDEX IF NOT EXISTS idx_doc_exports_project ON public.document_exports(project_id);
CREATE INDEX IF NOT EXISTS idx_doc_exports_doc ON public.document_exports(document_id);
CREATE INDEX IF NOT EXISTS idx_requirements_project ON public.requirements(project_id);
CREATE INDEX IF NOT EXISTS idx_requirements_doc ON public.requirements(document_id);
CREATE INDEX IF NOT EXISTS idx_requirements_code ON public.requirements(requirement_code);
CREATE INDEX IF NOT EXISTS idx_requirements_type ON public.requirements(requirement_type);
CREATE INDEX IF NOT EXISTS idx_requirements_status ON public.requirements(status);
CREATE INDEX IF NOT EXISTS idx_req_relationships_source ON public.requirement_relationships(source_requirement_id);
CREATE INDEX IF NOT EXISTS idx_req_relationships_target ON public.requirement_relationships(target_requirement_id);
CREATE INDEX IF NOT EXISTS idx_req_features_req ON public.requirement_features(requirement_id);
CREATE INDEX IF NOT EXISTS idx_req_features_feature ON public.requirement_features(feature_id);
CREATE INDEX IF NOT EXISTS idx_req_tasks_req ON public.requirement_tasks(requirement_id);
CREATE INDEX IF NOT EXISTS idx_req_tasks_task ON public.requirement_tasks(task_id);
CREATE INDEX IF NOT EXISTS idx_feature_tasks_feature ON public.feature_tasks(feature_id);
CREATE INDEX IF NOT EXISTS idx_feature_tasks_task ON public.feature_tasks(task_id);
CREATE INDEX IF NOT EXISTS idx_milestones_project ON public.project_milestones(project_id);
CREATE INDEX IF NOT EXISTS idx_milestones_status ON public.project_milestones(status);
CREATE INDEX IF NOT EXISTS idx_risks_project ON public.project_risks(project_id);
CREATE INDEX IF NOT EXISTS idx_risks_status ON public.project_risks(status);
CREATE INDEX IF NOT EXISTS idx_blockers_project ON public.blockers(project_id);
CREATE INDEX IF NOT EXISTS idx_blockers_task ON public.blockers(task_id);
CREATE INDEX IF NOT EXISTS idx_blockers_status ON public.blockers(status);
CREATE INDEX IF NOT EXISTS idx_change_requests_project ON public.change_requests(project_id);
CREATE INDEX IF NOT EXISTS idx_change_requests_status ON public.change_requests(status);
CREATE INDEX IF NOT EXISTS idx_sprints_project ON public.sprints(project_id);
CREATE INDEX IF NOT EXISTS idx_sprints_status ON public.sprints(status);
CREATE INDEX IF NOT EXISTS idx_sprint_tasks_sprint ON public.sprint_tasks(sprint_id);
CREATE INDEX IF NOT EXISTS idx_sprint_tasks_task ON public.sprint_tasks(task_id);
CREATE INDEX IF NOT EXISTS idx_sprint_snapshots_sprint ON public.sprint_snapshots(sprint_id);
CREATE INDEX IF NOT EXISTS idx_workflow_rules_event ON public.workflow_rules(event_type);
CREATE INDEX IF NOT EXISTS idx_workflow_rules_project ON public.workflow_rules(project_id);
CREATE INDEX IF NOT EXISTS idx_workflow_executions_key ON public.workflow_executions(execution_key);
CREATE INDEX IF NOT EXISTS idx_workflow_executions_source ON public.workflow_executions(source_entity_type, source_entity_id);
CREATE INDEX IF NOT EXISTS idx_task_events_task ON public.task_events(task_id);
CREATE INDEX IF NOT EXISTS idx_task_events_project ON public.task_events(project_id);
CREATE INDEX IF NOT EXISTS idx_task_events_type ON public.task_events(event_type);
CREATE INDEX IF NOT EXISTS idx_task_events_created ON public.task_events(created_at);
CREATE INDEX IF NOT EXISTS idx_task_evidence_task ON public.task_evidence(task_id);
CREATE INDEX IF NOT EXISTS idx_test_cases_project ON public.test_cases(project_id);
CREATE INDEX IF NOT EXISTS idx_test_cases_req ON public.test_cases(requirement_id);
CREATE INDEX IF NOT EXISTS idx_test_cases_feature ON public.test_cases(feature_id);
CREATE INDEX IF NOT EXISTS idx_test_cases_status ON public.test_cases(status);
CREATE INDEX IF NOT EXISTS idx_test_executions_case ON public.test_executions(test_case_id);
CREATE INDEX IF NOT EXISTS idx_bugs_project ON public.bugs(project_id);
CREATE INDEX IF NOT EXISTS idx_bugs_status ON public.bugs(status);
CREATE INDEX IF NOT EXISTS idx_bugs_feature ON public.bugs(feature_id);
CREATE INDEX IF NOT EXISTS idx_bugs_assigned ON public.bugs(assigned_to);
CREATE INDEX IF NOT EXISTS idx_project_snapshots_project ON public.project_snapshots(project_id);
CREATE INDEX IF NOT EXISTS idx_project_snapshots_type ON public.project_snapshots(snapshot_type);
CREATE INDEX IF NOT EXISTS idx_role_perms_role ON public.role_permissions(role);
CREATE INDEX IF NOT EXISTS idx_role_perms_permission ON public.role_permissions(permission);
CREATE INDEX IF NOT EXISTS idx_tasks_sprint ON public.tasks(sprint_id);
CREATE INDEX IF NOT EXISTS idx_tasks_requirement ON public.tasks(requirement_id);
CREATE INDEX IF NOT EXISTS idx_tasks_directive_owner ON public.tasks(directive_owner);


-- =====================================================================
-- M. ENABLE RLS ON ALL NEW TABLES
-- =====================================================================

ALTER TABLE public.document_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_type_dependencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_exports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.requirements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.requirement_relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.requirement_features ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.requirement_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feature_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_risks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blockers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.change_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.change_request_requirements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.change_request_features ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.change_request_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sprints ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sprint_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sprint_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.test_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_test_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.test_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bugs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bug_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bug_requirements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bug_test_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bug_sprints ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_endpoints ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.architecture_components ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_screens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.screen_features ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.screen_requirements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.screen_test_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;

-- Temporary permissive policies (to be replaced in Phase 3 with org-scoped)
DO $$
DECLARE
    tbl TEXT;
BEGIN
    FOR tbl IN SELECT unnest(ARRAY[
        'document_types', 'document_relationships', 'document_type_dependencies',
        'document_approvals', 'document_fields', 'document_exports',
        'requirements', 'requirement_relationships', 'requirement_features',
        'requirement_tasks', 'feature_tasks',
        'project_milestones', 'project_risks', 'blockers',
        'change_requests', 'change_request_requirements', 'change_request_features', 'change_request_tasks',
        'sprints', 'sprint_tasks', 'sprint_snapshots',
        'workflow_rules', 'workflow_executions',
        'task_events', 'task_evidence',
        'test_cases', 'task_test_cases', 'test_executions',
        'bugs', 'bug_tasks', 'bug_requirements', 'bug_test_cases', 'bug_sprints',
        'api_endpoints', 'architecture_components',
        'project_screens', 'screen_features', 'screen_requirements', 'screen_test_cases',
        'project_snapshots', 'role_permissions'
    ])
    LOOP
        EXECUTE format(
            'DROP POLICY IF EXISTS "Temp Full Access" ON public.%I; ' ||
            'CREATE POLICY "Temp Full Access" ON public.%I FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);',
            tbl, tbl
        );
    END LOOP;
END $$;


-- =====================================================================
-- N. HELPER RPC FUNCTIONS (§91, §106)
-- =====================================================================

-- N1. Check if user has specific permission
CREATE OR REPLACE FUNCTION public.has_permission(
    p_user_id UUID,
    p_permission TEXT,
    p_project_id TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
    v_role TEXT;
    v_has_perm BOOLEAN;
BEGIN
    SELECT role INTO v_role
    FROM public.organization_members
    WHERE auth_user_id = p_user_id::text AND is_active = true
    LIMIT 1;

    IF v_role IS NULL THEN
        RETURN false;
    END IF;

    SELECT EXISTS (
        SELECT 1 FROM public.role_permissions
        WHERE role = v_role
          AND permission = p_permission
          AND is_active = true
    ) INTO v_has_perm;

    IF v_has_perm AND p_project_id IS NOT NULL THEN
        SELECT EXISTS (
            SELECT 1 FROM public.project_members pm
            JOIN public.organization_members om ON om.id = pm.employee_id
            WHERE om.auth_user_id = p_user_id::text
              AND pm.project_id = p_project_id
        ) INTO v_has_perm;
    END IF;

    RETURN v_has_perm;
END;
$$;

-- N2. Validate task status transition (§35)
CREATE OR REPLACE FUNCTION public.validate_task_transition(
    p_from_status TEXT,
    p_to_status TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
    RETURN CASE
        WHEN p_from_status = 'Open' AND p_to_status IN ('Assigned', 'Cancelled') THEN true
        WHEN p_from_status = 'Assigned' AND p_to_status IN ('Accepted', 'Cancelled') THEN true
        WHEN p_from_status = 'Accepted' AND p_to_status IN ('In Progress', 'Cancelled') THEN true
        WHEN p_from_status = 'In Progress' AND p_to_status IN ('Blocked', 'Submitted', 'Cancelled') THEN true
        WHEN p_from_status = 'Blocked' AND p_to_status IN ('In Progress') THEN true
        WHEN p_from_status = 'Submitted' AND p_to_status IN ('Verified', 'Changes Requested') THEN true
        WHEN p_from_status = 'Changes Requested' AND p_to_status IN ('In Progress') THEN true
        WHEN p_from_status = 'Resubmitted' AND p_to_status IN ('Verified', 'Changes Requested') THEN true
        WHEN p_from_status = 'Verified' AND p_to_status IN ('Closed', 'Reopened') THEN true
        WHEN p_from_status = 'Reopened' AND p_to_status IN ('In Progress') THEN true
        ELSE false
    END;
END;
$$;

-- N3. Validate document status transition (§8)
CREATE OR REPLACE FUNCTION public.validate_document_transition(
    p_from_status TEXT,
    p_to_status TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
    RETURN CASE
        WHEN p_from_status = 'Not Started' AND p_to_status IN ('Draft') THEN true
        WHEN p_from_status = 'Draft' AND p_to_status IN ('In Progress') THEN true
        WHEN p_from_status = 'In Progress' AND p_to_status IN ('Ready for Review') THEN true
        WHEN p_from_status = 'Ready for Review' AND p_to_status IN ('Under Review') THEN true
        WHEN p_from_status = 'Under Review' AND p_to_status IN ('Approved', 'Changes Requested') THEN true
        WHEN p_from_status = 'Changes Requested' AND p_to_status IN ('In Progress') THEN true
        WHEN p_from_status = 'Approved' AND p_to_status IN ('Locked', 'Superseded') THEN true
        WHEN p_from_status = 'Locked' AND p_to_status IN ('Archived') THEN true
        ELSE false
    END;
END;
$$;

-- N4. Generate next sequential code
CREATE OR REPLACE FUNCTION public.generate_sequential_code(
    p_prefix TEXT,
    p_project_id TEXT,
    p_table_name TEXT,
    p_code_column TEXT
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_max_num INTEGER;
    v_next_code TEXT;
BEGIN
    EXECUTE format(
        'SELECT COALESCE(MAX(CAST(SUBSTRING(%I FROM ''[0-9]+$'') AS INTEGER)), 0) FROM public.%I WHERE project_id = $1',
        p_code_column, p_table_name
    ) INTO v_max_num USING p_project_id;

    v_next_code := p_prefix || '-' || LPAD((v_max_num + 1)::TEXT, 3, '0');
    RETURN v_next_code;
END;
$$;

-- =====================================================================
-- END OF MIGRATION
-- =====================================================================
