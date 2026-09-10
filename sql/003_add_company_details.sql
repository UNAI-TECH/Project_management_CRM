-- =====================================================================
-- UNAI PM CRM — Company Details, Storage & Single Supabase RLS Fixes
-- File: sql/003_add_company_details.sql
-- Target: Supabase / PostgreSQL (PM CRM Database)
-- =====================================================================

-- 1. Add company details columns to organizations table
ALTER TABLE public.organizations
ADD COLUMN IF NOT EXISTS contact_number VARCHAR(50),
ADD COLUMN IF NOT EXISTS about_company TEXT,
ADD COLUMN IF NOT EXISTS employee_count VARCHAR(50);

-- 2. Create Storage Bucket for Company Logos (Supabase Storage)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'logos',
    'logos',
    true,
    5242880, -- 5MB limit
    ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE SET
    public = true,
    file_size_limit = 5242880,
    allowed_mime_types = ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml', 'image/webp', 'image/gif'];

-- 3. Storage Policies for 'logos' bucket
DROP POLICY IF EXISTS "Public can view logos" ON storage.objects;
CREATE POLICY "Public can view logos"
ON storage.objects FOR SELECT
USING (bucket_id = 'logos');

DROP POLICY IF EXISTS "Anyone can upload company logos" ON storage.objects;
CREATE POLICY "Anyone can upload company logos"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'logos');

DROP POLICY IF EXISTS "Authenticated users can update logos" ON storage.objects;
CREATE POLICY "Authenticated users can update logos"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'logos');

-- 4. RLS POLICIES FOR SINGLE SUPABASE ONBOARDING
-- Allow organization creation during onboarding
DROP POLICY IF EXISTS "Orgs - Insert onboarding" ON public.organizations;
CREATE POLICY "Orgs - Insert onboarding" ON public.organizations
    FOR INSERT TO authenticated, anon
    WITH CHECK (true);

DROP POLICY IF EXISTS "Orgs - Read access" ON public.organizations;
CREATE POLICY "Orgs - Read access" ON public.organizations
    FOR SELECT TO authenticated, anon
    USING (true);

DROP POLICY IF EXISTS "Orgs - Update access" ON public.organizations;
CREATE POLICY "Orgs - Update access" ON public.organizations
    FOR UPDATE TO authenticated
    USING (true);

-- Allow organization members creation during onboarding & invitations
DROP POLICY IF EXISTS "OrgMembers - Insert onboarding" ON public.organization_members;
CREATE POLICY "OrgMembers - Insert onboarding" ON public.organization_members
    FOR INSERT TO authenticated, anon
    WITH CHECK (true);

DROP POLICY IF EXISTS "OrgMembers - Read access" ON public.organization_members;
CREATE POLICY "OrgMembers - Read access" ON public.organization_members
    FOR SELECT TO authenticated, anon
    USING (true);

DROP POLICY IF EXISTS "OrgMembers - Update access" ON public.organization_members;
CREATE POLICY "OrgMembers - Update access" ON public.organization_members
    FOR UPDATE TO authenticated
    USING (true);

-- Allow employees_cache creation and syncing
DROP POLICY IF EXISTS "Employees - Insert onboarding" ON public.employees_cache;
CREATE POLICY "Employees - Insert onboarding" ON public.employees_cache
    FOR INSERT TO authenticated, anon
    WITH CHECK (true);

DROP POLICY IF EXISTS "Employees - Read all" ON public.employees_cache;
CREATE POLICY "Employees - Read all" ON public.employees_cache
    FOR SELECT TO authenticated, anon
    USING (true);

DROP POLICY IF EXISTS "Employees - Update all" ON public.employees_cache;
CREATE POLICY "Employees - Update all" ON public.employees_cache
    FOR UPDATE TO authenticated
    USING (true);

-- Allow projects, documents, tasks creation
DROP POLICY IF EXISTS "Projects - Insert" ON public.projects;
CREATE POLICY "Projects - Insert" ON public.projects
    FOR INSERT TO authenticated, anon
    WITH CHECK (true);

DROP POLICY IF EXISTS "Projects - Read all" ON public.projects;
CREATE POLICY "Projects - Read all" ON public.projects
    FOR SELECT TO authenticated, anon
    USING (true);

DROP POLICY IF EXISTS "Projects - Update all" ON public.projects;
CREATE POLICY "Projects - Update all" ON public.projects
    FOR UPDATE TO authenticated
    USING (true);

DROP POLICY IF EXISTS "Docs - Insert" ON public.project_documents;
CREATE POLICY "Docs - Insert" ON public.project_documents
    FOR INSERT TO authenticated, anon
    WITH CHECK (true);

DROP POLICY IF EXISTS "Docs - Read all" ON public.project_documents;
CREATE POLICY "Docs - Read all" ON public.project_documents
    FOR SELECT TO authenticated, anon
    USING (true);

DROP POLICY IF EXISTS "Docs - Update all" ON public.project_documents;
CREATE POLICY "Docs - Update all" ON public.project_documents
    FOR UPDATE TO authenticated
    USING (true);

DROP POLICY IF EXISTS "Tasks - Insert" ON public.tasks;
CREATE POLICY "Tasks - Insert" ON public.tasks
    FOR INSERT TO authenticated, anon
    WITH CHECK (true);

DROP POLICY IF EXISTS "Tasks - Read all" ON public.tasks;
CREATE POLICY "Tasks - Read all" ON public.tasks
    FOR SELECT TO authenticated, anon
    USING (true);

DROP POLICY IF EXISTS "Tasks - Update all" ON public.tasks;
CREATE POLICY "Tasks - Update all" ON public.tasks
    FOR UPDATE TO authenticated
    USING (true);
