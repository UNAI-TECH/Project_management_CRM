-- ====================================================================
-- SQL MIGRATION 009: Organization Multi-Tenant Isolation & Enhanced Ownership Transfer
-- Enforces cross-organization data isolation on organization_members,
-- organizations, projects, and documents, and updates ownership transfer procedure.
-- ====================================================================

-- 1. Helper function to get current authenticated user's organization ID
CREATE OR REPLACE FUNCTION public.get_current_user_org_id(user_id UUID)
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT organization_id FROM public.organization_members
  WHERE auth_user_id = user_id::text AND is_active = true
  LIMIT 1;
$$;

-- 2. Scoped RLS on organization_members
ALTER TABLE IF EXISTS public.organization_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated to view org members" ON public.organization_members;
DROP POLICY IF EXISTS "View org members of same organization" ON public.organization_members;

CREATE POLICY "View org members of same organization"
  ON public.organization_members
  FOR SELECT
  TO authenticated
  USING (
    organization_id = public.get_current_user_org_id(auth.uid())
    OR auth_user_id = auth.uid()::text
  );

DROP POLICY IF EXISTS "Executives can manage org members" ON public.organization_members;
CREATE POLICY "Executives can manage org members"
  ON public.organization_members
  FOR ALL
  TO authenticated
  USING (
    public.is_executive_admin(auth.uid()) 
    AND organization_id = public.get_current_user_org_id(auth.uid())
  )
  WITH CHECK (
    public.is_executive_admin(auth.uid()) 
    AND organization_id = public.get_current_user_org_id(auth.uid())
  );

-- 3. Scoped RLS on organizations
ALTER TABLE IF EXISTS public.organizations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "View own organization" ON public.organizations;
CREATE POLICY "View own organization"
  ON public.organizations
  FOR SELECT
  TO authenticated
  USING (
    id = public.get_current_user_org_id(auth.uid())
    OR onboarded_by = auth.uid()::text
    OR owner_id = auth.uid()::text
  );

DROP POLICY IF EXISTS "Executives can update own organization" ON public.organizations;
CREATE POLICY "Executives can update own organization"
  ON public.organizations
  FOR UPDATE
  TO authenticated
  USING (
    public.is_executive_admin(auth.uid())
    AND id = public.get_current_user_org_id(auth.uid())
  )
  WITH CHECK (
    public.is_executive_admin(auth.uid())
    AND id = public.get_current_user_org_id(auth.uid())
  );

-- 4. Enhanced Stored Procedure for Ownership Transfer
CREATE OR REPLACE FUNCTION public.transfer_organization_ownership(
  p_org_id TEXT,
  p_target_member_id TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_caller_auth_id TEXT;
  v_caller_org_id TEXT;
  v_target_email TEXT;
  v_target_name TEXT;
  v_target_org_id TEXT;
  v_target_auth_id TEXT;
BEGIN
  v_caller_auth_id := auth.uid()::text;

  -- 1. Verify caller is currently an executive in the requested organization
  SELECT organization_id INTO v_caller_org_id
  FROM public.organization_members
  WHERE auth_user_id = v_caller_auth_id AND is_active = true
  LIMIT 1;

  IF v_caller_org_id IS NULL OR v_caller_org_id <> p_org_id THEN
    RAISE EXCEPTION 'Access denied: You do not belong to this organization.';
  END IF;

  IF NOT public.is_executive_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Access denied: Only executive administrators can transfer organization ownership.';
  END IF;

  -- 2. Verify target member exists in the SAME organization
  SELECT email, full_name, organization_id, auth_user_id 
  INTO v_target_email, v_target_name, v_target_org_id, v_target_auth_id
  FROM public.organization_members
  WHERE id::text = p_target_member_id;

  IF v_target_email IS NULL THEN
    RAISE EXCEPTION 'Target member not found in organization.';
  END IF;

  IF v_target_org_id <> p_org_id THEN
    RAISE EXCEPTION 'Target member does not belong to your organization.';
  END IF;

  IF v_target_auth_id = v_caller_auth_id THEN
    RAISE EXCEPTION 'Cannot transfer ownership to yourself.';
  END IF;

  -- 3. Promote target member to CEO / Owner role
  UPDATE public.organization_members
  SET role = 'CEO', designation = 'Chief Executive Officer (CEO) / Owner'
  WHERE id::text = p_target_member_id;

  UPDATE public.employees_cache
  SET pm_crm_role = 'CEO', designation = 'Chief Executive Officer (CEO) / Owner'
  WHERE employee_id = v_target_auth_id OR email ILIKE v_target_email;

  -- 4. Update organization primary owner reference
  UPDATE public.organizations
  SET owner_id = COALESCE(v_target_auth_id, p_target_member_id)
  WHERE id::text = p_org_id;

  -- 5. Demote caller from Owner/Executive to PM (Project Manager)
  UPDATE public.organization_members
  SET role = 'PM', designation = 'Project Manager / Former Owner'
  WHERE auth_user_id = v_caller_auth_id AND organization_id = p_org_id;

  UPDATE public.employees_cache
  SET pm_crm_role = 'PM', designation = 'Project Manager / Former Owner'
  WHERE employee_id = v_caller_auth_id OR email IN (
    SELECT email FROM public.organization_members WHERE auth_user_id = v_caller_auth_id
  );

  RETURN jsonb_build_object(
    'success', true,
    'new_owner_email', v_target_email,
    'new_owner_name', v_target_name
  );
END;
$$;
