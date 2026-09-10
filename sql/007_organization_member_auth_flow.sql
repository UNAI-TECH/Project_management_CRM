-- =====================================================================
-- UNAI PM CRM — Organization Member Authentication & First-Time Flow Migration
-- File: sql/007_organization_member_auth_flow.sql
-- Target: Supabase / PostgreSQL (PM CRM Database)
-- =====================================================================

-- 1. Ensure public/anon can verify if an email belongs to an organization member
DROP POLICY IF EXISTS "Allow anon email verification on organization_members" ON public.organization_members;
CREATE POLICY "Allow anon email verification on organization_members"
ON public.organization_members
FOR SELECT
TO anon, authenticated
USING (is_active = true);

-- 2. Allow anon to activate/link auth_user_id and setup status on first-time setup
DROP POLICY IF EXISTS "Allow member activation on organization_members" ON public.organization_members;
CREATE POLICY "Allow member activation on organization_members"
ON public.organization_members
FOR UPDATE
TO anon, authenticated
USING (true)
WITH CHECK (true);

-- 3. Ensure employees_cache is accessible for lookup
DROP POLICY IF EXISTS "Allow anon select on employees_cache" ON public.employees_cache;
CREATE POLICY "Allow anon select on employees_cache"
ON public.employees_cache
FOR SELECT
TO anon, authenticated
USING (is_active = true);

DROP POLICY IF EXISTS "Allow anon update on employees_cache" ON public.employees_cache;
CREATE POLICY "Allow anon update on employees_cache"
ON public.employees_cache
FOR UPDATE
TO anon, authenticated
USING (true)
WITH CHECK (true);
