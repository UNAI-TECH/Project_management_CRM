-- =====================================================================
-- UNAI PM CRM — Migration: Add CIO Role
-- File: sql/002_add_cio_role.sql
-- 
-- Purpose: Upgrades existing database to support CIO role alongside CTO.
-- Run this AFTER 001_master_schema.sql if your database was created
-- with the old schema that only had CTO.
-- 
-- Safe to run multiple times (idempotent with IF NOT EXISTS / OR REPLACE).
-- =====================================================================

-- =====================================================================
-- STEP 1: Add CIO as valid role in employees_cache
-- (No constraint changes needed since we use VARCHAR, but update docs)
-- =====================================================================
COMMENT ON COLUMN public.employees_cache.pm_crm_role IS 
    'Valid roles: CTO, CIO, PM, TL, Employee. CIO has identical privileges to CTO.';

COMMENT ON COLUMN public.organization_members.role IS 
    'Valid roles: CTO, CIO, PM, TL, Employee. CIO has identical privileges to CTO.';


-- =====================================================================
-- STEP 2: Drop old CTO-only policies and recreate with CTO+CIO
-- =====================================================================

-- Projects
DROP POLICY IF EXISTS "Projects - CTO full control" ON public.projects;
CREATE POLICY "Projects - CTO/CIO full control" ON public.projects
    FOR ALL TO authenticated
    USING (auth.uid()::text IN (
        SELECT employee_id FROM public.employees_cache 
        WHERE pm_crm_role IN ('CTO', 'CIO')
    ));

DROP POLICY IF EXISTS "Projects - Read assigned projects" ON public.projects;
CREATE POLICY "Projects - Read assigned projects" ON public.projects
    FOR SELECT TO authenticated
    USING (
        id IN (SELECT project_id FROM public.project_members WHERE employee_id = auth.uid()::text)
        OR auth.uid()::text IN (
            SELECT employee_id FROM public.employees_cache 
            WHERE pm_crm_role IN ('CTO', 'CIO')
        )
    );

-- Project Members
DROP POLICY IF EXISTS "Members - CTO full control" ON public.project_members;
CREATE POLICY "Members - CTO/CIO full control" ON public.project_members
    FOR ALL TO authenticated
    USING (auth.uid()::text IN (
        SELECT employee_id FROM public.employees_cache 
        WHERE pm_crm_role IN ('CTO', 'CIO')
    ));

DROP POLICY IF EXISTS "Members - Read access in project" ON public.project_members;
CREATE POLICY "Members - Read access in project" ON public.project_members
    FOR SELECT TO authenticated
    USING (
        project_id IN (SELECT project_id FROM public.project_members WHERE employee_id = auth.uid()::text)
        OR auth.uid()::text IN (
            SELECT employee_id FROM public.employees_cache 
            WHERE pm_crm_role IN ('CTO', 'CIO')
        )
    );

-- Documents
DROP POLICY IF EXISTS "Docs - CTO full control" ON public.project_documents;
CREATE POLICY "Docs - CTO/CIO full control" ON public.project_documents
    FOR ALL TO authenticated
    USING (auth.uid()::text IN (
        SELECT employee_id FROM public.employees_cache 
        WHERE pm_crm_role IN ('CTO', 'CIO')
    ));

DROP POLICY IF EXISTS "Docs - Select if member" ON public.project_documents;
CREATE POLICY "Docs - Select if member" ON public.project_documents
    FOR SELECT TO authenticated
    USING (
        project_id IN (SELECT project_id FROM public.project_members WHERE employee_id = auth.uid()::text)
        OR auth.uid()::text IN (
            SELECT employee_id FROM public.employees_cache 
            WHERE pm_crm_role IN ('CTO', 'CIO')
        )
    );

-- Tasks
DROP POLICY IF EXISTS "Tasks - CTO PM TL create and update" ON public.tasks;
CREATE POLICY "Tasks - CTO/CIO/PM/TL create and update" ON public.tasks
    FOR ALL TO authenticated
    USING (auth.uid()::text IN (
        SELECT employee_id FROM public.employees_cache 
        WHERE pm_crm_role IN ('CTO', 'CIO', 'PM', 'TL')
    ));

DROP POLICY IF EXISTS "Tasks - Read access" ON public.tasks;
CREATE POLICY "Tasks - Read access" ON public.tasks
    FOR SELECT TO authenticated
    USING (
        project_id IN (SELECT project_id FROM public.project_members WHERE employee_id = auth.uid()::text)
        OR auth.uid()::text IN (
            SELECT employee_id FROM public.employees_cache 
            WHERE pm_crm_role IN ('CTO', 'CIO')
        )
    );

-- Audit Log
DROP POLICY IF EXISTS "Audit - CTO read only" ON public.audit_log;
CREATE POLICY "Audit - CTO/CIO read only" ON public.audit_log
    FOR SELECT TO authenticated
    USING (auth.uid()::text IN (
        SELECT employee_id FROM public.employees_cache 
        WHERE pm_crm_role IN ('CTO', 'CIO')
    ));


-- =====================================================================
-- STEP 3: Add organizations and organization_members tables if missing
-- (For databases created before company onboarding feature)
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.organizations (
    id              VARCHAR(100) PRIMARY KEY DEFAULT ('org-' || uuid_generate_v4()::text),
    name            VARCHAR(255) NOT NULL,
    registration_no VARCHAR(100),
    industry        VARCHAR(100),
    country         VARCHAR(100) DEFAULT 'India',
    company_email   VARCHAR(255),
    logo_url        TEXT,
    is_verified     BOOLEAN NOT NULL DEFAULT false,
    onboarded_by    VARCHAR(100),
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.organization_members (
    id              VARCHAR(100) PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    organization_id VARCHAR(100) NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    auth_user_id    VARCHAR(100) NOT NULL,
    email           VARCHAR(255) NOT NULL,
    full_name       VARCHAR(255) NOT NULL,
    role            VARCHAR(50) NOT NULL DEFAULT 'Employee',
    department      VARCHAR(100) DEFAULT 'General',
    designation     VARCHAR(255) DEFAULT 'Staff',
    is_active       BOOLEAN NOT NULL DEFAULT true,
    invited_by      VARCHAR(100),
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (organization_id, auth_user_id)
);
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;

-- Add organization_id column to employees_cache if missing
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'employees_cache' AND column_name = 'organization_id'
    ) THEN
        ALTER TABLE public.employees_cache 
        ADD COLUMN organization_id VARCHAR(100) REFERENCES public.organizations(id);
    END IF;
END $$;


-- =====================================================================
-- STEP 4: Add indexes
-- =====================================================================
CREATE INDEX IF NOT EXISTS idx_org_members_org ON public.organization_members(organization_id);
CREATE INDEX IF NOT EXISTS idx_org_members_user ON public.organization_members(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_employees_org ON public.employees_cache(organization_id);
