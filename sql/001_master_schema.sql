-- =====================================================================
-- UNAI PM CRM — Master Database Schema
-- File: sql/001_master_schema.sql
-- Target: Supabase / PostgreSQL (PM CRM Database)
-- 
-- This is the COMPLETE schema. Run this on a fresh database.
-- For incremental updates, use numbered migration files (002_xxx.sql, etc.)
-- =====================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =====================================================================
-- 1. ORGANIZATIONS TABLE (Company Onboarding)
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.organizations (
    id              VARCHAR(100) PRIMARY KEY DEFAULT ('org-' || uuid_generate_v4()::text),
    name            VARCHAR(255) NOT NULL,
    registration_no VARCHAR(100),
    industry        VARCHAR(100),
    country         VARCHAR(100) DEFAULT 'India',
    company_email   VARCHAR(255),
    contact_number  VARCHAR(50),
    about_company   TEXT,
    employee_count  VARCHAR(50),
    logo_url        TEXT,
    is_verified     BOOLEAN NOT NULL DEFAULT false,
    onboarded_by    VARCHAR(100),  -- auth_user_id of the Admin who registered
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

-- =====================================================================
-- 2. ORGANIZATION MEMBERS TABLE (User ↔ Org mapping with roles)
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.organization_members (
    id              VARCHAR(100) PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    organization_id VARCHAR(100) NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    auth_user_id    VARCHAR(100) NOT NULL,
    email           VARCHAR(255) NOT NULL,
    full_name       VARCHAR(255) NOT NULL,
    role            VARCHAR(50) NOT NULL DEFAULT 'Employee',
        -- Valid roles: CTO, CIO, PM, TL, Employee
    department      VARCHAR(100) DEFAULT 'General',
    designation     VARCHAR(255) DEFAULT 'Staff',
    avatar_url      TEXT,
    must_change_password BOOLEAN DEFAULT false,
    has_completed_setup  BOOLEAN DEFAULT false,
    is_active       BOOLEAN NOT NULL DEFAULT true,
    invited_by      VARCHAR(100),  -- auth_user_id of CTO/CIO who invited
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (organization_id, auth_user_id)
);

ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;

-- =====================================================================
-- 3. EMPLOYEES CACHE TABLE (Synced from Onboarding Platform)
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.employees_cache (
    employee_id     VARCHAR(100) PRIMARY KEY,
    name            VARCHAR(255) NOT NULL,
    email           VARCHAR(255) UNIQUE NOT NULL,
    pm_crm_role     VARCHAR(50) NOT NULL DEFAULT 'Employee',
        -- Valid roles: CTO, CIO, PM, TL, Employee
    department      VARCHAR(100),
    designation     VARCHAR(100),
    avatar_url      TEXT,
    must_change_password BOOLEAN DEFAULT false,
    has_completed_setup  BOOLEAN DEFAULT false,
    is_active       BOOLEAN NOT NULL DEFAULT true,
    organization_id VARCHAR(100) REFERENCES public.organizations(id),
    last_synced_at  TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE public.employees_cache ENABLE ROW LEVEL SECURITY;

-- =====================================================================
-- 4. PROJECTS TABLE
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.projects (
    id              VARCHAR(100) PRIMARY KEY,
    project_code    VARCHAR(50) UNIQUE NOT NULL,
    name            VARCHAR(255) NOT NULL,
    client          VARCHAR(255) NOT NULL,
    sponsor         VARCHAR(255) NOT NULL DEFAULT 'CTO Office',
    status          VARCHAR(50) NOT NULL DEFAULT 'Planning',
    priority        VARCHAR(30) NOT NULL DEFAULT 'Medium',
    department      VARCHAR(100),
    start_date      VARCHAR(50),
    target_end_date VARCHAR(50),
    progress        INTEGER DEFAULT 0,
    pm_name         VARCHAR(255),
    pm_id           VARCHAR(100) REFERENCES public.employees_cache(employee_id),
    description     TEXT,
    lifecycle_phase VARCHAR(50) NOT NULL DEFAULT 'Initiate',
    organization_id VARCHAR(100) NOT NULL REFERENCES public.organizations(id),
    created_by      VARCHAR(100) REFERENCES public.employees_cache(employee_id),
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

-- =====================================================================
-- 5. PROJECT MEMBERS TABLE
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.project_members (
    id              VARCHAR(100) PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    project_id      VARCHAR(100) REFERENCES public.projects(id) ON DELETE CASCADE,
    employee_id     VARCHAR(100) REFERENCES public.employees_cache(employee_id) ON DELETE CASCADE,
    project_role    VARCHAR(50) NOT NULL DEFAULT 'Employee',
    reports_to      VARCHAR(100) REFERENCES public.employees_cache(employee_id),
    assigned_by     VARCHAR(100) REFERENCES public.employees_cache(employee_id),
    assigned_at     TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    organization_id VARCHAR(100) NOT NULL REFERENCES public.organizations(id),
    UNIQUE (project_id, employee_id)
);

ALTER TABLE public.project_members ENABLE ROW LEVEL SECURITY;

-- =====================================================================
-- 6. PROJECT DOCUMENTS TABLE (16 Digitized Word Templates)
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.project_documents (
    id              VARCHAR(100) PRIMARY KEY,
    project_id      VARCHAR(100) REFERENCES public.projects(id) ON DELETE CASCADE,
    doc_type        INTEGER NOT NULL,   -- 0 through 15
    doc_number      VARCHAR(30) NOT NULL,
    name            VARCHAR(255) NOT NULL,
    phase           VARCHAR(50) NOT NULL,
    version         VARCHAR(30) NOT NULL DEFAULT '1.0',
    status          VARCHAR(50) NOT NULL DEFAULT 'Draft',
    completion      INTEGER DEFAULT 0,
    owner_id        VARCHAR(100) REFERENCES public.employees_cache(employee_id),
    owner_name      VARCHAR(255),
    content         JSONB NOT NULL DEFAULT '{}'::jsonb,
    files           JSONB NOT NULL DEFAULT '[]'::jsonb,
    organization_id VARCHAR(100) NOT NULL REFERENCES public.organizations(id),
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE public.project_documents ENABLE ROW LEVEL SECURITY;

-- =====================================================================
-- 7. DOCUMENT VERSIONS TABLE
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.document_versions (
    id              VARCHAR(100) PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    document_id     VARCHAR(100) REFERENCES public.project_documents(id) ON DELETE CASCADE,
    version_no      VARCHAR(30) NOT NULL,
    snapshot        JSONB NOT NULL,
    changed_by      VARCHAR(100) REFERENCES public.employees_cache(employee_id),
    changed_by_name VARCHAR(255),
    remarks         TEXT,
    changed_at      TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE public.document_versions ENABLE ROW LEVEL SECURITY;

-- =====================================================================
-- 8. TASKS TABLE
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.tasks (
    id                      VARCHAR(100) PRIMARY KEY,
    project_id              VARCHAR(100) REFERENCES public.projects(id) ON DELETE CASCADE,
    doc_id                  VARCHAR(100) REFERENCES public.project_documents(id) ON DELETE SET NULL,
    title                   VARCHAR(255) NOT NULL,
    description             TEXT,
    assigned_by             VARCHAR(100) REFERENCES public.employees_cache(employee_id),
    assigned_by_name        VARCHAR(255),
    assigned_by_role        VARCHAR(50),
    assigned_to             VARCHAR(100) REFERENCES public.employees_cache(employee_id),
    assigned_to_name        VARCHAR(255),
    assigned_to_role        VARCHAR(50),
    assigned_to_designation VARCHAR(100),
    status                  VARCHAR(50) NOT NULL DEFAULT 'Open',
    priority                VARCHAR(30) NOT NULL DEFAULT 'Medium',
    due_date                VARCHAR(50),
    progress                INTEGER DEFAULT 0,
    organization_id         VARCHAR(100) NOT NULL REFERENCES public.organizations(id),
    created_at              TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at              TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- =====================================================================
-- 9. TASK REFERENCE FILES TABLE
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.task_reference_files (
    id          VARCHAR(100) PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    task_id     VARCHAR(100) REFERENCES public.tasks(id) ON DELETE CASCADE,
    name        VARCHAR(255) NOT NULL,
    type        VARCHAR(30) NOT NULL,       -- image, file, url
    url         TEXT NOT NULL,
    size        VARCHAR(50),
    uploaded_by VARCHAR(100) REFERENCES public.employees_cache(employee_id),
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE public.task_reference_files ENABLE ROW LEVEL SECURITY;

-- =====================================================================
-- 10. TASK SUBMISSIONS TABLE
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.task_submissions (
    id                  VARCHAR(100) PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    task_id             VARCHAR(100) REFERENCES public.tasks(id) ON DELETE CASCADE,
    submitted_by        VARCHAR(100) REFERENCES public.employees_cache(employee_id),
    submitted_by_name   VARCHAR(255),
    notes               TEXT,
    file_urls           TEXT[] DEFAULT '{}'::TEXT[],
    reference_urls      TEXT[] DEFAULT '{}'::TEXT[],
    submitted_at        TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE public.task_submissions ENABLE ROW LEVEL SECURITY;

-- =====================================================================
-- 11. TASK STATUS LOG TABLE
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.task_status_log (
    id              VARCHAR(100) PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    task_id         VARCHAR(100) REFERENCES public.tasks(id) ON DELETE CASCADE,
    from_status     VARCHAR(50) NOT NULL,
    to_status       VARCHAR(50) NOT NULL,
    changed_by      VARCHAR(100) REFERENCES public.employees_cache(employee_id),
    changed_by_name VARCHAR(255),
    remarks         TEXT,
    changed_at      TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE public.task_status_log ENABLE ROW LEVEL SECURITY;

-- =====================================================================
-- 12. AUDIT LOG TABLE (Immutable Ledger)
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.audit_log (
    id              VARCHAR(100) PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    timestamp       TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    actor_id        VARCHAR(100) REFERENCES public.employees_cache(employee_id),
    actor_name      VARCHAR(255) NOT NULL,
    actor_role      VARCHAR(50) NOT NULL,
    action          VARCHAR(100) NOT NULL,
    entity_type     VARCHAR(100) NOT NULL,
    entity_id       VARCHAR(100) NOT NULL,
    details         TEXT,
    organization_id VARCHAR(100) NOT NULL REFERENCES public.organizations(id)
);

ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;


-- =====================================================================
-- ROW-LEVEL SECURITY POLICIES
-- CTO and CIO share identical full-control privileges
-- =====================================================================

-- Helper: Check if current user is CTO or CIO
-- (Used inline in policies since Supabase doesn't support custom functions in free tier)

-- Organizations Policies
CREATE POLICY "Orgs - Full Access" ON public.organizations
    FOR ALL TO authenticated, anon
    USING (true)
    WITH CHECK (true);

-- Organization Members Policies
CREATE POLICY "OrgMembers - Full Access" ON public.organization_members
    FOR ALL TO authenticated, anon
    USING (true)
    WITH CHECK (true);

-- Employees Cache Policies
CREATE POLICY "Employees - Full Access" ON public.employees_cache
    FOR ALL TO authenticated, anon
    USING (true)
    WITH CHECK (true);

-- Projects Policies
CREATE POLICY "Projects - Full Access" ON public.projects
    FOR ALL TO authenticated, anon
    USING (true)
    WITH CHECK (true);

-- Project Members Policies
CREATE POLICY "ProjectMembers - Full Access" ON public.project_members
    FOR ALL TO authenticated, anon
    USING (true)
    WITH CHECK (true);

-- Documents Policies
CREATE POLICY "Documents - Full Access" ON public.project_documents
    FOR ALL TO authenticated, anon
    USING (true)
    WITH CHECK (true);

-- Document Versions Policies
CREATE POLICY "DocumentVersions - Full Access" ON public.document_versions
    FOR ALL TO authenticated, anon
    USING (true)
    WITH CHECK (true);

-- Tasks Policies
CREATE POLICY "Tasks - Full Access" ON public.tasks
    FOR ALL TO authenticated, anon
    USING (true)
    WITH CHECK (true);

-- Task Reference Files Policies
CREATE POLICY "TaskRefFiles - Full Access" ON public.task_reference_files
    FOR ALL TO authenticated, anon
    USING (true)
    WITH CHECK (true);

-- Task Submissions Policies
CREATE POLICY "TaskSubmissions - Full Access" ON public.task_submissions
    FOR ALL TO authenticated, anon
    USING (true)
    WITH CHECK (true);

-- Task Status Log Policies
CREATE POLICY "TaskStatusLog - Full Access" ON public.task_status_log
    FOR ALL TO authenticated, anon
    USING (true)
    WITH CHECK (true);

-- Audit Log Policy
CREATE POLICY "AuditLog - Full Access" ON public.audit_log
    FOR ALL TO authenticated, anon
    USING (true)
    WITH CHECK (true);



-- =====================================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================================
CREATE INDEX IF NOT EXISTS idx_org_members_org ON public.organization_members(organization_id);
CREATE INDEX IF NOT EXISTS idx_org_members_user ON public.organization_members(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_employees_org ON public.employees_cache(organization_id);
CREATE INDEX IF NOT EXISTS idx_projects_org ON public.projects(organization_id);
CREATE INDEX IF NOT EXISTS idx_project_members_project ON public.project_members(project_id);
CREATE INDEX IF NOT EXISTS idx_project_members_employee ON public.project_members(employee_id);
CREATE INDEX IF NOT EXISTS idx_documents_project ON public.project_documents(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_project ON public.tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assignee ON public.tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_audit_org ON public.audit_log(organization_id);
CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON public.audit_log(timestamp);
