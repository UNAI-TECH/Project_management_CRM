-- =====================================================================
-- UNAI PM CRM — SQL MIGRATION 013: RBAC ROW LEVEL SECURITY (RLS) HARDENING
-- Target: Supabase / PostgreSQL 15+
-- Description: Replaces permissive `USING (true)` policies with strict
--              role-scoped and organization-isolated RLS policies.
-- =====================================================================

-- 1. Helper function to check if user belongs to the target organization
CREATE OR REPLACE FUNCTION public.is_member_of_org(p_org_id VARCHAR, p_auth_uid UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE organization_id = p_org_id
      AND auth_user_id = p_auth_uid::text
      AND is_active = true
  );
$$;

-- 2. Helper function to check if user is a member of the project
CREATE OR REPLACE FUNCTION public.is_project_member(p_project_id VARCHAR, p_auth_uid UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.project_members pm
    JOIN public.organization_members om ON om.auth_user_id = p_auth_uid::text
    WHERE pm.project_id = p_project_id
      AND (pm.employee_id = om.id OR pm.employee_id = om.auth_user_id)
      AND om.is_active = true
  );
$$;

-- =====================================================================
-- 3. ORGANIZATIONS TABLE
-- =====================================================================
DROP POLICY IF EXISTS "Organizations - Full Access" ON public.organizations;
DROP POLICY IF EXISTS "Allow authenticated to view org" ON public.organizations;

CREATE POLICY "Organizations_Select" ON public.organizations
  FOR SELECT TO authenticated, anon
  USING (
    public.is_executive_admin(auth.uid())
    OR public.is_member_of_org(id, auth.uid())
  );

CREATE POLICY "Organizations_Update" ON public.organizations
  FOR UPDATE TO authenticated
  USING (public.is_executive_admin(auth.uid()))
  WITH CHECK (public.is_executive_admin(auth.uid()));

-- =====================================================================
-- 4. ORGANIZATION MEMBERS TABLE
-- =====================================================================
DROP POLICY IF EXISTS "OrgMembers - Full Access" ON public.organization_members;
DROP POLICY IF EXISTS "Allow authenticated to view org members" ON public.organization_members;
DROP POLICY IF EXISTS "Executives can manage org members" ON public.organization_members;

CREATE POLICY "OrgMembers_Select" ON public.organization_members
  FOR SELECT TO authenticated, anon
  USING (
    public.is_executive_admin(auth.uid())
    OR public.is_member_of_org(organization_id, auth.uid())
  );

CREATE POLICY "OrgMembers_Admin_Manage" ON public.organization_members
  FOR ALL TO authenticated
  USING (public.is_executive_admin(auth.uid()))
  WITH CHECK (public.is_executive_admin(auth.uid()));

-- =====================================================================
-- 5. PROJECTS TABLE
-- =====================================================================
DROP POLICY IF EXISTS "Projects - Full Access" ON public.projects;
DROP POLICY IF EXISTS "Read projects based on membership" ON public.projects;
DROP POLICY IF EXISTS "Executives and PMs can create and update projects" ON public.projects;

CREATE POLICY "Projects_Select" ON public.projects
  FOR SELECT TO authenticated, anon
  USING (
    public.is_executive_admin(auth.uid())
    OR pm_id = auth.uid()::text
    OR public.is_project_member(id, auth.uid())
    OR public.is_pm_or_higher(auth.uid())
  );

CREATE POLICY "Projects_Insert" ON public.projects
  FOR INSERT TO authenticated
  WITH CHECK (public.is_pm_or_higher(auth.uid()));

CREATE POLICY "Projects_Update" ON public.projects
  FOR UPDATE TO authenticated
  USING (
    public.is_executive_admin(auth.uid())
    OR pm_id = auth.uid()::text
  )
  WITH CHECK (
    public.is_executive_admin(auth.uid())
    OR pm_id = auth.uid()::text
  );

CREATE POLICY "Projects_Delete" ON public.projects
  FOR DELETE TO authenticated
  USING (public.is_executive_admin(auth.uid()));

-- =====================================================================
-- 6. TASKS TABLE
-- =====================================================================
DROP POLICY IF EXISTS "Tasks - Full Access" ON public.tasks;
DROP POLICY IF EXISTS "View tasks policy" ON public.tasks;
DROP POLICY IF EXISTS "TLs and above can manage tasks" ON public.tasks;

CREATE POLICY "Tasks_Select" ON public.tasks
  FOR SELECT TO authenticated, anon
  USING (
    public.is_executive_admin(auth.uid())
    OR public.is_pm_or_higher(auth.uid())
    OR public.is_tl_or_higher(auth.uid())
    OR assigned_to = auth.uid()::text
    OR assigned_by = auth.uid()::text
  );

CREATE POLICY "Tasks_Insert" ON public.tasks
  FOR INSERT TO authenticated
  WITH CHECK (public.is_tl_or_higher(auth.uid()));

CREATE POLICY "Tasks_Update" ON public.tasks
  FOR UPDATE TO authenticated
  USING (
    public.is_tl_or_higher(auth.uid())
    OR assigned_to = auth.uid()::text
  )
  WITH CHECK (
    public.is_tl_or_higher(auth.uid())
    OR assigned_to = auth.uid()::text
  );

CREATE POLICY "Tasks_Delete" ON public.tasks
  FOR DELETE TO authenticated
  USING (public.is_executive_admin(auth.uid()));

-- =====================================================================
-- 7. AUDIT LOG TABLE (Immutable Ledger - Insert & Executive View)
-- =====================================================================
DROP POLICY IF EXISTS "AuditLog - Full Access" ON public.audit_log;

CREATE POLICY "AuditLog_Select" ON public.audit_log
  FOR SELECT TO authenticated
  USING (public.is_executive_admin(auth.uid()));

CREATE POLICY "AuditLog_Insert" ON public.audit_log
  FOR INSERT TO authenticated, anon
  WITH CHECK (true);
