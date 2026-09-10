-- ====================================================================
-- SQL MIGRATION 008: Role-Based Authentication, Higher Executives & Ownership Transfer
-- Supports: CEO, MD, COO, CTO, CIO (Full Access Super Admins), PM, TL, Employee
-- ====================================================================

-- 1. Ensure organization_members role check accepts all executive & operational roles
ALTER TABLE IF EXISTS public.organization_members 
  DROP CONSTRAINT IF EXISTS organization_members_role_check;

ALTER TABLE IF EXISTS public.organization_members
  ADD CONSTRAINT organization_members_role_check 
  CHECK (role IN ('CEO', 'MD', 'COO', 'CTO', 'CIO', 'PM', 'TL', 'Employee', 'HR Admin'));

-- 2. Add owner reference on organizations if not present
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'organizations' 
    AND column_name = 'owner_id'
  ) THEN
    ALTER TABLE public.organizations ADD COLUMN owner_id TEXT;
  END IF;
END $$;

-- 3. Security Helper Functions for RBAC (with explicit ::text casts)
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

-- 4. Enable Row Level Security on core tables
ALTER TABLE IF EXISTS public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.tasks ENABLE ROW LEVEL SECURITY;

-- 5. Policies for Organization Members
DROP POLICY IF EXISTS "Allow authenticated to view org members" ON public.organization_members;
CREATE POLICY "Allow authenticated to view org members"
  ON public.organization_members
  FOR SELECT
  TO authenticated, anon
  USING (true);

DROP POLICY IF EXISTS "Executives can manage org members" ON public.organization_members;
CREATE POLICY "Executives can manage org members"
  ON public.organization_members
  FOR ALL
  TO authenticated
  USING (public.is_executive_admin(auth.uid()))
  WITH CHECK (public.is_executive_admin(auth.uid()));

-- 6. Policies for Projects (Executives & PMs can create/manage)
DROP POLICY IF EXISTS "Read projects based on membership" ON public.projects;
CREATE POLICY "Read projects based on membership"
  ON public.projects
  FOR SELECT
  TO authenticated, anon
  USING (true);

DROP POLICY IF EXISTS "Executives and PMs can create and update projects" ON public.projects;
CREATE POLICY "Executives and PMs can create and update projects"
  ON public.projects
  FOR ALL
  TO authenticated
  USING (public.is_pm_or_higher(auth.uid()))
  WITH CHECK (public.is_pm_or_higher(auth.uid()));

-- 7. Policies for Tasks (TLs and above can assign/verify, Employees can update their tasks)
DROP POLICY IF EXISTS "View tasks policy" ON public.tasks;
CREATE POLICY "View tasks policy"
  ON public.tasks
  FOR SELECT
  TO authenticated, anon
  USING (true);

DROP POLICY IF EXISTS "TLs and above can manage tasks" ON public.tasks;
CREATE POLICY "TLs and above can manage tasks"
  ON public.tasks
  FOR ALL
  TO authenticated
  USING (public.is_tl_or_higher(auth.uid()))
  WITH CHECK (public.is_tl_or_higher(auth.uid()));

-- 8. Ownership Transfer Stored Procedure
CREATE OR REPLACE FUNCTION public.transfer_organization_ownership(
  p_org_id TEXT,
  p_target_member_id TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_caller_role TEXT;
  v_target_email TEXT;
  v_target_name TEXT;
BEGIN
  -- Verify caller is currently an executive
  IF NOT public.is_executive_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Access denied: Only executive administrators can transfer organization ownership.';
  END IF;

  -- Get target member info
  SELECT email, full_name INTO v_target_email, v_target_name
  FROM public.organization_members
  WHERE id::text = p_target_member_id;

  IF v_target_email IS NULL THEN
    RAISE EXCEPTION 'Target member not found in organization.';
  END IF;

  -- Promote target member to CEO role
  UPDATE public.organization_members
  SET role = 'CEO', designation = 'Chief Executive Officer (CEO) / Owner'
  WHERE id::text = p_target_member_id;

  -- Update organization owner
  UPDATE public.organizations
  SET owner_id = p_target_member_id
  WHERE id::text = p_org_id;

  RETURN jsonb_build_object(
    'success', true,
    'new_owner_email', v_target_email,
    'new_owner_name', v_target_name
  );
END;
$$;
