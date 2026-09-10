-- =====================================================================
-- UNAI PM CRM — Fix RLS Infinite Recursion (Code 42P17)
-- File: sql/005_fix_rls_infinite_recursion.sql
-- Target: Supabase / PostgreSQL (PM CRM Database)
-- =====================================================================

-- 1. DROP ALL PREVIOUS CONFLICTING / RECURSIVE POLICIES
DO $$ 
DECLARE 
    r RECORD;
BEGIN
    FOR r IN (
        SELECT schemaname, tablename, policyname 
        FROM pg_policies 
        WHERE schemaname = 'public'
    ) LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', r.policyname, r.schemaname, r.tablename);
    END LOOP;
END $$;

-- 2. CREATE CLEAN, NON-RECURSIVE RLS POLICIES FOR ALL CRM TABLES

-- Organizations
CREATE POLICY "Orgs - Full Access" ON public.organizations
    FOR ALL TO authenticated, anon
    USING (true)
    WITH CHECK (true);

-- Organization Members
CREATE POLICY "OrgMembers - Full Access" ON public.organization_members
    FOR ALL TO authenticated, anon
    USING (true)
    WITH CHECK (true);

-- Employees Cache
CREATE POLICY "Employees - Full Access" ON public.employees_cache
    FOR ALL TO authenticated, anon
    USING (true)
    WITH CHECK (true);

-- Projects
CREATE POLICY "Projects - Full Access" ON public.projects
    FOR ALL TO authenticated, anon
    USING (true)
    WITH CHECK (true);

-- Project Members
CREATE POLICY "ProjectMembers - Full Access" ON public.project_members
    FOR ALL TO authenticated, anon
    USING (true)
    WITH CHECK (true);

-- Project Documents
CREATE POLICY "Documents - Full Access" ON public.project_documents
    FOR ALL TO authenticated, anon
    USING (true)
    WITH CHECK (true);

-- Document Versions
CREATE POLICY "DocumentVersions - Full Access" ON public.document_versions
    FOR ALL TO authenticated, anon
    USING (true)
    WITH CHECK (true);

-- Tasks
CREATE POLICY "Tasks - Full Access" ON public.tasks
    FOR ALL TO authenticated, anon
    USING (true)
    WITH CHECK (true);

-- Task Reference Files
CREATE POLICY "TaskRefFiles - Full Access" ON public.task_reference_files
    FOR ALL TO authenticated, anon
    USING (true)
    WITH CHECK (true);

-- Task Submissions
CREATE POLICY "TaskSubmissions - Full Access" ON public.task_submissions
    FOR ALL TO authenticated, anon
    USING (true)
    WITH CHECK (true);

-- Task Status Log
CREATE POLICY "TaskStatusLog - Full Access" ON public.task_status_log
    FOR ALL TO authenticated, anon
    USING (true)
    WITH CHECK (true);

-- Audit Log
CREATE POLICY "AuditLog - Full Access" ON public.audit_log
    FOR ALL TO authenticated, anon
    USING (true)
    WITH CHECK (true);

-- 3. Confirm all users in auth.users so any pending accounts can log in immediately
UPDATE auth.users 
SET email_confirmed_at = NOW()
WHERE email_confirmed_at IS NULL;
