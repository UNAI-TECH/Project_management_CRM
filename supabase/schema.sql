-- =====================================================================
-- UNAI PM CRM Database Schema Setup & RLS Migration Script
-- Target: Supabase / Postgres Database Engine
-- Matches Project Documentation Section 6.2 Table Specs
-- =====================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. EMPLOYEES CACHE TABLE
CREATE TABLE IF NOT EXISTS public.employees_cache (
    employee_id VARCHAR(100) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    pm_crm_role VARCHAR(50) NOT NULL DEFAULT 'Employee',
    department VARCHAR(100),
    designation VARCHAR(100),
    is_active BOOLEAN NOT NULL DEFAULT true,
    last_synced_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Enable RLS on Employees Cache
ALTER TABLE public.employees_cache ENABLE ROW LEVEL SECURITY;

-- 2. PROJECTS TABLE
CREATE TABLE IF NOT EXISTS public.projects (
    id VARCHAR(100) PRIMARY KEY,
    project_code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    client VARCHAR(255) NOT NULL,
    sponsor VARCHAR(255) NOT NULL DEFAULT 'CTO Office',
    status VARCHAR(50) NOT NULL DEFAULT 'Planning',
    priority VARCHAR(30) NOT NULL DEFAULT 'Medium',
    department VARCHAR(100),
    start_date VARCHAR(50),
    target_end_date VARCHAR(50),
    progress INTEGER DEFAULT 0,
    pm_name VARCHAR(255),
    pm_id VARCHAR(100) REFERENCES public.employees_cache(employee_id),
    description TEXT,
    lifecycle_phase VARCHAR(50) NOT NULL DEFAULT 'Initiate',
    organization_id VARCHAR(100) NOT NULL DEFAULT 'org-unai',
    created_by VARCHAR(100) REFERENCES public.employees_cache(employee_id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Enable RLS on Projects
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

-- 3. PROJECT MEMBERS TABLE
CREATE TABLE IF NOT EXISTS public.project_members (
    id VARCHAR(100) PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    project_id VARCHAR(100) REFERENCES public.projects(id) ON DELETE CASCADE,
    employee_id VARCHAR(100) REFERENCES public.employees_cache(employee_id) ON DELETE CASCADE,
    project_role VARCHAR(50) NOT NULL DEFAULT 'Employee',
    reports_to VARCHAR(100) REFERENCES public.employees_cache(employee_id),
    assigned_by VARCHAR(100) REFERENCES public.employees_cache(employee_id),
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    organization_id VARCHAR(100) NOT NULL DEFAULT 'org-unai',
    UNIQUE (project_id, employee_id)
);

-- Enable RLS on Project Members
ALTER TABLE public.project_members ENABLE ROW LEVEL SECURITY;

-- 4. PROJECT DOCUMENTS TABLE (The 16 Digitized Word templates)
CREATE TABLE IF NOT EXISTS public.project_documents (
    id VARCHAR(100) PRIMARY KEY,
    project_id VARCHAR(100) REFERENCES public.projects(id) ON DELETE CASCADE,
    doc_type INTEGER NOT NULL, -- 0 (Master Record) through 15 (Maintenance Plan)
    doc_number VARCHAR(30) NOT NULL,
    name VARCHAR(255) NOT NULL,
    phase VARCHAR(50) NOT NULL,
    version VARCHAR(30) NOT NULL DEFAULT '1.0',
    status VARCHAR(50) NOT NULL DEFAULT 'Draft',
    completion INTEGER DEFAULT 0,
    owner_id VARCHAR(100) REFERENCES public.employees_cache(employee_id),
    owner_name VARCHAR(255),
    content JSONB NOT NULL DEFAULT '{}'::jsonb,
    files JSONB NOT NULL DEFAULT '[]'::jsonb,
    organization_id VARCHAR(100) NOT NULL DEFAULT 'org-unai',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Enable RLS on Project Documents
ALTER TABLE public.project_documents ENABLE ROW LEVEL SECURITY;

-- 5. DOCUMENT VERSIONS TABLE
CREATE TABLE IF NOT EXISTS public.document_versions (
    id VARCHAR(100) PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    document_id VARCHAR(100) REFERENCES public.project_documents(id) ON DELETE CASCADE,
    version_no VARCHAR(30) NOT NULL,
    snapshot JSONB NOT NULL,
    changed_by VARCHAR(100) REFERENCES public.employees_cache(employee_id),
    changed_by_name VARCHAR(255),
    remarks TEXT,
    changed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Enable RLS on Document Versions
ALTER TABLE public.document_versions ENABLE ROW LEVEL SECURITY;

-- 6. TASKS TABLE
CREATE TABLE IF NOT EXISTS public.tasks (
    id VARCHAR(100) PRIMARY KEY,
    project_id VARCHAR(100) REFERENCES public.projects(id) ON DELETE CASCADE,
    doc_id VARCHAR(100) REFERENCES public.project_documents(id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    assigned_by VARCHAR(100) REFERENCES public.employees_cache(employee_id),
    assigned_by_name VARCHAR(255),
    assigned_by_role VARCHAR(50),
    assigned_to VARCHAR(100) REFERENCES public.employees_cache(employee_id),
    assigned_to_name VARCHAR(255),
    assigned_to_role VARCHAR(50),
    assigned_to_designation VARCHAR(100),
    status VARCHAR(50) NOT NULL DEFAULT 'Open', -- Open, Submitted, Verified, Reopened
    priority VARCHAR(30) NOT NULL DEFAULT 'Medium',
    due_date VARCHAR(50),
    progress INTEGER DEFAULT 0,
    organization_id VARCHAR(100) NOT NULL DEFAULT 'org-unai',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Enable RLS on Tasks
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- 7. TASK REFERENCE FILES TABLE
CREATE TABLE IF NOT EXISTS public.task_reference_files (
    id VARCHAR(100) PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    task_id VARCHAR(100) REFERENCES public.tasks(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(30) NOT NULL, -- image, file, url
    url TEXT NOT NULL,
    size VARCHAR(50),
    uploaded_by VARCHAR(100) REFERENCES public.employees_cache(employee_id),
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Enable RLS on Task Reference Files
ALTER TABLE public.task_reference_files ENABLE ROW LEVEL SECURITY;

-- 8. TASK SUBMISSIONS TABLE
CREATE TABLE IF NOT EXISTS public.task_submissions (
    id VARCHAR(100) PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    task_id VARCHAR(100) REFERENCES public.tasks(id) ON DELETE CASCADE,
    submitted_by VARCHAR(100) REFERENCES public.employees_cache(employee_id),
    submitted_by_name VARCHAR(255),
    notes TEXT,
    file_urls TEXT[] DEFAULT '{}'::TEXT[],
    reference_urls TEXT[] DEFAULT '{}'::TEXT[],
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Enable RLS on Task Submissions
ALTER TABLE public.task_submissions ENABLE ROW LEVEL SECURITY;

-- 9. TASK STATUS LOG TABLE
CREATE TABLE IF NOT EXISTS public.task_status_log (
    id VARCHAR(100) PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    task_id VARCHAR(100) REFERENCES public.tasks(id) ON DELETE CASCADE,
    from_status VARCHAR(50) NOT NULL,
    to_status VARCHAR(50) NOT NULL,
    changed_by VARCHAR(100) REFERENCES public.employees_cache(employee_id),
    changed_by_name VARCHAR(255),
    remarks TEXT,
    changed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Enable RLS on Task Status Log
ALTER TABLE public.task_status_log ENABLE ROW LEVEL SECURITY;

-- 10. AUDIT LOG TABLE (Immutable ledger)
CREATE TABLE IF NOT EXISTS public.audit_log (
    id VARCHAR(100) PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    actor_id VARCHAR(100) REFERENCES public.employees_cache(employee_id),
    actor_name VARCHAR(255) NOT NULL,
    actor_role VARCHAR(50) NOT NULL,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(100) NOT NULL,
    entity_id VARCHAR(100) NOT NULL,
    details TEXT,
    organization_id VARCHAR(100) NOT NULL DEFAULT 'org-unai'
);

-- Enable RLS on Audit Log
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;


-- =====================================================================
-- ROW-LEVEL SECURITY POLICIES SPECIFICATIONS (Section 3.2 Matrix)
-- =====================================================================

-- Projects Policies
CREATE POLICY "Projects - CTO full control" ON public.projects
    FOR ALL TO authenticated
    USING (auth.uid()::text IN (SELECT employee_id FROM public.employees_cache WHERE pm_crm_role = 'CTO'));

CREATE POLICY "Projects - Read assigned projects" ON public.projects
    FOR SELECT TO authenticated
    USING (id IN (SELECT project_id FROM public.project_members WHERE employee_id = auth.uid()::text) 
       OR auth.uid()::text IN (SELECT employee_id FROM public.employees_cache WHERE pm_crm_role = 'CTO'));

-- Project Members Policies
CREATE POLICY "Members - CTO full control" ON public.project_members
    FOR ALL TO authenticated
    USING (auth.uid()::text IN (SELECT employee_id FROM public.employees_cache WHERE pm_crm_role = 'CTO'));

CREATE POLICY "Members - Read access in project" ON public.project_members
    FOR SELECT TO authenticated
    USING (project_id IN (SELECT project_id FROM public.project_members WHERE employee_id = auth.uid()::text)
       OR auth.uid()::text IN (SELECT employee_id FROM public.employees_cache WHERE pm_crm_role = 'CTO'));

-- Documents Policies
CREATE POLICY "Docs - CTO full control" ON public.project_documents
    FOR ALL TO authenticated
    USING (auth.uid()::text IN (SELECT employee_id FROM public.employees_cache WHERE pm_crm_role = 'CTO'));

CREATE POLICY "Docs - Update sections if member" ON public.project_documents
    FOR UPDATE TO authenticated
    USING (project_id IN (SELECT project_id FROM public.project_members WHERE employee_id = auth.uid()::text));

CREATE POLICY "Docs - Select if member" ON public.project_documents
    FOR SELECT TO authenticated
    USING (project_id IN (SELECT project_id FROM public.project_members WHERE employee_id = auth.uid()::text)
       OR auth.uid()::text IN (SELECT employee_id FROM public.employees_cache WHERE pm_crm_role = 'CTO'));

-- Tasks Policies
CREATE POLICY "Tasks - Read access" ON public.tasks
    FOR SELECT TO authenticated
    USING (project_id IN (SELECT project_id FROM public.project_members WHERE employee_id = auth.uid()::text)
       OR auth.uid()::text IN (SELECT employee_id FROM public.employees_cache WHERE pm_crm_role = 'CTO'));

CREATE POLICY "Tasks - CTO PM TL create and update" ON public.tasks
    FOR ALL TO authenticated
    USING (auth.uid()::text IN (SELECT employee_id FROM public.employees_cache WHERE pm_crm_role IN ('CTO', 'PM', 'TL')));

CREATE POLICY "Tasks - Employees update status/submissions" ON public.tasks
    FOR UPDATE TO authenticated
    USING (assigned_to = auth.uid()::text);

-- Audit Log Policy (CTO view only, system writes only)
CREATE POLICY "Audit - CTO read only" ON public.audit_log
    FOR SELECT TO authenticated
    USING (auth.uid()::text IN (SELECT employee_id FROM public.employees_cache WHERE pm_crm_role = 'CTO'));

CREATE POLICY "Audit - System insertions" ON public.audit_log
    FOR INSERT TO authenticated
    WITH CHECK (true);
