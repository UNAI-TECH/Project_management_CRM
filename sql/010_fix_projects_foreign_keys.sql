-- =====================================================================
-- Migration 010: Fix Projects & Documents Foreign Key Constraints
-- Description: Drops rigid foreign key references to legacy employees_cache
--              to allow auth_user_id and organization_members IDs in projects,
--              project_documents, tasks, project_members, and audit_log tables.
-- =====================================================================

-- 1. Drop constraints on projects table
ALTER TABLE public.projects 
    DROP CONSTRAINT IF EXISTS projects_pm_id_fkey,
    DROP CONSTRAINT IF EXISTS projects_created_by_fkey;

-- 2. Drop constraints on project_documents table
ALTER TABLE public.project_documents
    DROP CONSTRAINT IF EXISTS project_documents_owner_id_fkey;

-- 3. Drop constraints on document_versions table
ALTER TABLE public.document_versions
    DROP CONSTRAINT IF EXISTS document_versions_changed_by_fkey;

-- 4. Drop constraints on tasks table
ALTER TABLE public.tasks
    DROP CONSTRAINT IF EXISTS tasks_assigned_by_fkey,
    DROP CONSTRAINT IF EXISTS tasks_assigned_to_fkey,
    DROP CONSTRAINT IF EXISTS tasks_organization_id_fkey;

-- 5. Drop constraints on project_members table
ALTER TABLE public.project_members
    DROP CONSTRAINT IF EXISTS project_members_employee_id_fkey,
    DROP CONSTRAINT IF EXISTS project_members_reports_to_fkey,
    DROP CONSTRAINT IF EXISTS project_members_assigned_by_fkey,
    DROP CONSTRAINT IF EXISTS project_members_organization_id_fkey;

-- 6. Drop constraints on audit_log table
ALTER TABLE public.audit_log
    DROP CONSTRAINT IF EXISTS audit_log_actor_id_fkey,
    DROP CONSTRAINT IF EXISTS audit_log_organization_id_fkey;

-- Ensure columns are nullable so null or string values work smoothly
ALTER TABLE public.projects ALTER COLUMN pm_id DROP NOT NULL;
ALTER TABLE public.projects ALTER COLUMN created_by DROP NOT NULL;
ALTER TABLE public.project_documents ALTER COLUMN owner_id DROP NOT NULL;
ALTER TABLE public.tasks ALTER COLUMN organization_id DROP NOT NULL;
ALTER TABLE public.tasks ALTER COLUMN assigned_by DROP NOT NULL;
ALTER TABLE public.tasks ALTER COLUMN assigned_to DROP NOT NULL;
ALTER TABLE public.project_members ALTER COLUMN employee_id DROP NOT NULL;
ALTER TABLE public.project_members ALTER COLUMN assigned_by DROP NOT NULL;
ALTER TABLE public.project_members ALTER COLUMN organization_id DROP NOT NULL;
ALTER TABLE public.audit_log ALTER COLUMN actor_id DROP NOT NULL;
ALTER TABLE public.audit_log ALTER COLUMN organization_id DROP NOT NULL;
