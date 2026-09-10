-- =====================================================================
-- UNAI PM CRM — COMPLETE UNIFIED MASTER DATABASE SCHEMA
-- File: sql/UNIFIED_MASTER_SCHEMA.sql
-- Target: Supabase / PostgreSQL
-- Description: Complete single-file production schema containing all 
--              tables, extensions, storage buckets, RBAC functions, 
--              indexes, and Row Level Security (RLS) policies.
-- =====================================================================

-- =====================================================================
-- 0. EXTENSIONS & PREREQUISITES
-- =====================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =====================================================================
-- 1. ORGANIZATIONS TABLE (Company Profile & Governance)
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.organizations (
    id                   VARCHAR(100) PRIMARY KEY DEFAULT ('org-' || uuid_generate_v4()::text),
    name                 VARCHAR(255) NOT NULL,
    registration_no      VARCHAR(100),
    industry             VARCHAR(100),
    country              VARCHAR(100) DEFAULT 'India',
    company_email        VARCHAR(255),
    contact_number       VARCHAR(50),
    about_company        TEXT,
    employee_count       VARCHAR(50),
    logo_url             TEXT,
    custom_watermark_url TEXT,
    is_verified          BOOLEAN NOT NULL DEFAULT false,
    owner_id             TEXT,          -- User ID of current Owner (CEO/MD/CTO)
    onboarded_by         VARCHAR(100),  -- User ID who registered the company
    document_branding    JSONB DEFAULT '{
        "watermark": {
            "enabled": true,
            "type": "logo",
            "customType": "text",
            "text": "CONFIDENTIAL",
            "customImageUrl": null,
            "isFaded": true,
            "opacity": 15,
            "size": "md",
            "orientation": "diagonal"
        },
        "header": {
            "enabled": true,
            "showLogo": true,
            "alignment": "split",
            "layout": "inline",
            "isBold": true,
            "leftText": "",
            "rightText": "PM CRM Engineering Deliverable"
        },
        "footer": {
            "enabled": true,
            "copyrightText": "All Rights Reserved",
            "showPageNumber": true,
            "confidentialityNotice": "Strictly Confidential - Internal & Client Delivery Use Only"
        }
    }'::jsonb,
    created_at           TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at           TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================================
-- 2. ORGANIZATION MEMBERS TABLE (Personnel & RBAC Mapping)
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.organization_members (
    id                   VARCHAR(100) PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    organization_id      VARCHAR(100) NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    auth_user_id         VARCHAR(100) NOT NULL,
    email                VARCHAR(255) NOT NULL,
    full_name            VARCHAR(255) NOT NULL,
    role                 VARCHAR(50) NOT NULL DEFAULT 'Employee'
        CHECK (role IN ('CEO', 'MD', 'COO', 'CTO', 'CIO', 'PM', 'TL', 'Employee', 'HR Admin')),
    department           VARCHAR(100) DEFAULT 'Engineering',
    designation          VARCHAR(255) DEFAULT 'Software Engineer',
    avatar_url           TEXT,
    must_change_password BOOLEAN DEFAULT false,
    has_completed_setup  BOOLEAN DEFAULT false,
    is_active            BOOLEAN NOT NULL DEFAULT true,
    invited_by           VARCHAR(100),
    created_at           TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at           TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (organization_id, auth_user_id)
);

-- =====================================================================
-- 3. EMPLOYEES CACHE TABLE (Cross-System Synchronization)
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.employees_cache (
    employee_id          VARCHAR(100) PRIMARY KEY,
    name                 VARCHAR(255) NOT NULL,
    email                VARCHAR(255) UNIQUE NOT NULL,
    pm_crm_role          VARCHAR(50) NOT NULL DEFAULT 'Employee'
        CHECK (pm_crm_role IN ('CEO', 'MD', 'COO', 'CTO', 'CIO', 'PM', 'TL', 'Employee', 'HR Admin')),
    department           VARCHAR(100),
    designation          VARCHAR(100),
    avatar_url           TEXT,
    must_change_password BOOLEAN DEFAULT false,
    has_completed_setup  BOOLEAN DEFAULT false,
    is_active            BOOLEAN NOT NULL DEFAULT true,
    organization_id      VARCHAR(100) REFERENCES public.organizations(id),
    last_synced_at       TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================================
-- 4. PROJECTS TABLE
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.projects (
    id              VARCHAR(100) PRIMARY KEY,
    project_code    VARCHAR(50) NOT NULL,
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
    pm_id           VARCHAR(100),
    description     TEXT,
    lifecycle_phase VARCHAR(50) NOT NULL DEFAULT 'Initiate',
    organization_id VARCHAR(100) NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    created_by      VARCHAR(100),
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (organization_id, project_code)
);

-- =====================================================================
-- 5. PROJECT MEMBERS TABLE (Project Roster & Reporting Lines)
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.project_members (
    id              VARCHAR(100) PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    project_id      VARCHAR(100) NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    employee_id     VARCHAR(100) NOT NULL,
    project_role    VARCHAR(50) NOT NULL DEFAULT 'Employee',
    reports_to      VARCHAR(100),
    assigned_by     VARCHAR(100),
    assigned_at     TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    organization_id VARCHAR(100) NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    UNIQUE (project_id, employee_id)
);

-- =====================================================================
-- 6. PROJECT FEATURES TABLE (Functional Feature Registry)
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.project_features (
    id                VARCHAR(100) PRIMARY KEY,
    project_id        VARCHAR(100) NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    name              VARCHAR(255) NOT NULL,
    description       TEXT,
    technology        VARCHAR(255),
    source_doc_ids    TEXT[] DEFAULT '{}'::TEXT[],
    source_doc_names  TEXT[] DEFAULT '{}'::TEXT[],
    sequence_order    INTEGER NOT NULL DEFAULT 1,
    status            VARCHAR(50) NOT NULL DEFAULT 'Pending',
    progress          INTEGER DEFAULT 0,
    assigned_tl_id    VARCHAR(100),
    assigned_tl_name  VARCHAR(255),
    is_blocked        BOOLEAN DEFAULT true,
    linked_functions  TEXT[] DEFAULT '{}'::TEXT[],
    linked_apis       TEXT[] DEFAULT '{}'::TEXT[],
    linked_screens    TEXT[] DEFAULT '{}'::TEXT[],
    estimated_hours   NUMERIC(8,2),
    actual_hours      NUMERIC(8,2) DEFAULT 0,
    start_date        VARCHAR(50),
    due_date          VARCHAR(50),
    organization_id   VARCHAR(100) NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    created_at        TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at        TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================================
-- 7. PROJECT DOCUMENTS TABLE (16 Digitized Word Lifecycle Templates)
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.project_documents (
    id              VARCHAR(100) PRIMARY KEY,
    project_id      VARCHAR(100) NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    doc_type        INTEGER NOT NULL,   -- 0 through 15
    doc_number      VARCHAR(30) NOT NULL,
    name            VARCHAR(255) NOT NULL,
    phase           VARCHAR(50) NOT NULL,
    version         VARCHAR(30) NOT NULL DEFAULT '1.0',
    status          VARCHAR(50) NOT NULL DEFAULT 'Draft',
    completion      INTEGER DEFAULT 0,
    owner_id        VARCHAR(100),
    owner_name      VARCHAR(255),
    content         JSONB NOT NULL DEFAULT '{}'::jsonb,
    files           JSONB NOT NULL DEFAULT '[]'::jsonb,
    organization_id VARCHAR(100) NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================================
-- 8. DOCUMENT VERSIONS TABLE (Immutable Version History Snapshot)
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.document_versions (
    id              VARCHAR(100) PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    document_id     VARCHAR(100) NOT NULL REFERENCES public.project_documents(id) ON DELETE CASCADE,
    version_no      VARCHAR(30) NOT NULL,
    snapshot        JSONB NOT NULL,
    changed_by      VARCHAR(100),
    changed_by_name VARCHAR(255),
    remarks         TEXT,
    changed_at      TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================================
-- 9. TASKS TABLE (Feature Work Directives & Subtasks)
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.tasks (
    id                      VARCHAR(100) PRIMARY KEY,
    project_id              VARCHAR(100) NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    feature_id              VARCHAR(100) REFERENCES public.project_features(id) ON DELETE SET NULL,
    parent_task_id          VARCHAR(100) REFERENCES public.tasks(id) ON DELETE SET NULL,
    doc_id                  VARCHAR(100) REFERENCES public.project_documents(id) ON DELETE SET NULL,
    title                   VARCHAR(255) NOT NULL,
    description             TEXT,
    task_type               VARCHAR(30) DEFAULT 'feature_task',
    sequence_order          INTEGER DEFAULT 0,
    is_blocked              BOOLEAN DEFAULT false,
    assigned_by             VARCHAR(100),
    assigned_by_name        VARCHAR(255),
    assigned_by_role        VARCHAR(50),
    assigned_to             VARCHAR(100),
    assigned_to_name        VARCHAR(255),
    assigned_to_role        VARCHAR(50),
    assigned_to_designation VARCHAR(100),
    status                  VARCHAR(50) NOT NULL DEFAULT 'Open',
    priority                VARCHAR(30) NOT NULL DEFAULT 'Medium',
    due_date                VARCHAR(50),
    estimated_hours         NUMERIC(8,2),
    actual_hours            NUMERIC(8,2) DEFAULT 0,
    progress                INTEGER DEFAULT 0,
    started_at              TIMESTAMP WITH TIME ZONE,
    completed_at            TIMESTAMP WITH TIME ZONE,
    organization_id         VARCHAR(100) NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    created_at              TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at              TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================================
-- 10. TASK TIME LOGS TABLE (Micro-Level Timer & Breaks)
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.task_time_logs (
    id              VARCHAR(100) PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    task_id         VARCHAR(100) NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
    employee_id     VARCHAR(100),
    employee_name   VARCHAR(255),
    action          VARCHAR(30) NOT NULL,  -- begin, end, break_start, break_end, pause, resume
    timestamp       TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    notes           TEXT
);

-- =====================================================================
-- 11. TASK REFERENCE FILES TABLE
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.task_reference_files (
    id          VARCHAR(100) PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    task_id     VARCHAR(100) NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
    name        VARCHAR(255) NOT NULL,
    type        VARCHAR(30) NOT NULL,       -- image, file, url
    url         TEXT NOT NULL,
    size        VARCHAR(50),
    uploaded_by VARCHAR(100),
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================================
-- 12. TASK SUBMISSIONS TABLE
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.task_submissions (
    id                  VARCHAR(100) PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    task_id             VARCHAR(100) NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
    submitted_by        VARCHAR(100),
    submitted_by_name   VARCHAR(255),
    notes               TEXT,
    file_urls           TEXT[] DEFAULT '{}'::TEXT[],
    reference_urls      TEXT[] DEFAULT '{}'::TEXT[],
    submitted_at        TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================================
-- 13. TASK STATUS LOG TABLE (Supervisor Feedback & Review History)
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.task_status_log (
    id              VARCHAR(100) PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    task_id         VARCHAR(100) NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
    from_status     VARCHAR(50) NOT NULL,
    to_status       VARCHAR(50) NOT NULL,
    changed_by      VARCHAR(100),
    changed_by_name VARCHAR(255),
    remarks         TEXT,
    changed_at      TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================================
-- 14. AUDIT LOG TABLE (Immutable Platform Mutation Ledger)
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.audit_log (
    id              VARCHAR(100) PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    timestamp       TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    actor_id        VARCHAR(100),
    actor_name      VARCHAR(255) NOT NULL,
    actor_role      VARCHAR(50) NOT NULL,
    action          VARCHAR(100) NOT NULL,
    entity_type     VARCHAR(50) NOT NULL,
    entity_id       VARCHAR(100),
    project_id      VARCHAR(100) REFERENCES public.projects(id) ON DELETE SET NULL,
    details         TEXT,
    metadata        JSONB DEFAULT '{}'::jsonb,
    organization_id VARCHAR(100) NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE
);

-- =====================================================================
-- 15. PERFORMANCE INDEXES
-- =====================================================================
CREATE INDEX IF NOT EXISTS idx_org_members_auth ON public.organization_members(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_org_members_org ON public.organization_members(organization_id);
CREATE INDEX IF NOT EXISTS idx_projects_org ON public.projects(organization_id);
CREATE INDEX IF NOT EXISTS idx_features_project ON public.project_features(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_project ON public.tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_feature ON public.tasks(feature_id);
CREATE INDEX IF NOT EXISTS idx_tasks_parent ON public.tasks(parent_task_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assignee ON public.tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON public.tasks(status);
CREATE INDEX IF NOT EXISTS idx_timelogs_task ON public.task_time_logs(task_id);
CREATE INDEX IF NOT EXISTS idx_timelogs_employee ON public.task_time_logs(employee_id);
CREATE INDEX IF NOT EXISTS idx_docs_project ON public.project_documents(project_id);
CREATE INDEX IF NOT EXISTS idx_doc_versions_doc ON public.document_versions(document_id);
CREATE INDEX IF NOT EXISTS idx_audit_org ON public.audit_log(organization_id);
CREATE INDEX IF NOT EXISTS idx_audit_actor ON public.audit_log(actor_id);

-- =====================================================================
-- 16. SECURITY HELPER FUNCTIONS (RBAC)
-- =====================================================================
CREATE OR REPLACE FUNCTION public.get_user_crm_role(user_id UUID)
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT role FROM public.organization_members
  WHERE auth_user_id = user_id::text AND is_active = true
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.is_executive_admin(user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE auth_user_id = user_id::text 
      AND is_active = true
      AND role IN ('CEO', 'MD', 'COO', 'CTO', 'CIO', 'HR Admin')
  );
$$;

CREATE OR REPLACE FUNCTION public.is_pm_or_higher(user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE auth_user_id = user_id::text 
      AND is_active = true
      AND role IN ('CEO', 'MD', 'COO', 'CTO', 'CIO', 'PM', 'HR Admin')
  );
$$;

CREATE OR REPLACE FUNCTION public.is_tl_or_higher(user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE auth_user_id = user_id::text 
      AND is_active = true
      AND role IN ('CEO', 'MD', 'COO', 'CTO', 'CIO', 'PM', 'TL', 'HR Admin')
  );
$$;

-- =====================================================================
-- 17. ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================================
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employees_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_features ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_time_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_reference_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_status_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- Core RLS policies allowing authenticated users & app services full data access
CREATE POLICY "Organizations - Full Access" ON public.organizations
    FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);

CREATE POLICY "OrgMembers - Full Access" ON public.organization_members
    FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);

CREATE POLICY "EmployeesCache - Full Access" ON public.employees_cache
    FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);

CREATE POLICY "Projects - Full Access" ON public.projects
    FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);

CREATE POLICY "ProjectMembers - Full Access" ON public.project_members
    FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);

CREATE POLICY "ProjectFeatures - Full Access" ON public.project_features
    FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);

CREATE POLICY "ProjectDocuments - Full Access" ON public.project_documents
    FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);

CREATE POLICY "DocumentVersions - Full Access" ON public.document_versions
    FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);

CREATE POLICY "Tasks - Full Access" ON public.tasks
    FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);

CREATE POLICY "TaskTimeLogs - Full Access" ON public.task_time_logs
    FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);

CREATE POLICY "TaskReferenceFiles - Full Access" ON public.task_reference_files
    FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);

CREATE POLICY "TaskSubmissions - Full Access" ON public.task_submissions
    FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);

CREATE POLICY "TaskStatusLog - Full Access" ON public.task_status_log
    FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);

CREATE POLICY "AuditLog - Full Access" ON public.audit_log
    FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);

-- =====================================================================
-- 18. STORAGE BUCKETS & POLICIES
-- =====================================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
(
    'templates',
    'templates',
    true,
    10485760,
    ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml', 'image/webp', 'application/pdf']
),
(
    'watermarks',
    'watermarks',
    true,
    10485760,
    ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml', 'image/webp']
),
(
    'avatars',
    'avatars',
    true,
    5242880,
    ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/webp']
),
(
    'task_attachments',
    'task_attachments',
    true,
    20971520,
    ARRAY['image/png', 'image/jpeg', 'image/jpg', 'application/pdf', 'application/zip', 'text/plain']
)
ON CONFLICT (id) DO NOTHING;

-- Storage object policies
DO $$
BEGIN
    DROP POLICY IF EXISTS "Public Read Templates" ON storage.objects;
    DROP POLICY IF EXISTS "Public Upload Templates" ON storage.objects;
    DROP POLICY IF EXISTS "Public Read Watermarks" ON storage.objects;
    DROP POLICY IF EXISTS "Public Upload Watermarks" ON storage.objects;
    DROP POLICY IF EXISTS "Public Read Avatars" ON storage.objects;
    DROP POLICY IF EXISTS "Public Upload Avatars" ON storage.objects;
    DROP POLICY IF EXISTS "Public Read Attachments" ON storage.objects;
    DROP POLICY IF EXISTS "Public Upload Attachments" ON storage.objects;
END $$;

CREATE POLICY "Public Read Templates" ON storage.objects FOR SELECT TO public USING (bucket_id = 'templates');
CREATE POLICY "Public Upload Templates" ON storage.objects FOR ALL TO public, authenticated, anon USING (bucket_id = 'templates') WITH CHECK (bucket_id = 'templates');

CREATE POLICY "Public Read Watermarks" ON storage.objects FOR SELECT TO public USING (bucket_id = 'watermarks');
CREATE POLICY "Public Upload Watermarks" ON storage.objects FOR ALL TO public, authenticated, anon USING (bucket_id = 'watermarks') WITH CHECK (bucket_id = 'watermarks');

CREATE POLICY "Public Read Avatars" ON storage.objects FOR SELECT TO public USING (bucket_id = 'avatars');
CREATE POLICY "Public Upload Avatars" ON storage.objects FOR ALL TO public, authenticated, anon USING (bucket_id = 'avatars') WITH CHECK (bucket_id = 'avatars');

CREATE POLICY "Public Read Attachments" ON storage.objects FOR SELECT TO public USING (bucket_id = 'task_attachments');
CREATE POLICY "Public Upload Attachments" ON storage.objects FOR ALL TO public, authenticated, anon USING (bucket_id = 'task_attachments') WITH CHECK (bucket_id = 'task_attachments');
