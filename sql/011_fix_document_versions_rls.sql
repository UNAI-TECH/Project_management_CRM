-- =====================================================================
-- Migration 011: Enable RLS Policy for document_versions Table
-- Description: Creates full access RLS policies for authenticated and anon
--              roles on public.document_versions table so version history
--              snapshots can be saved without 403 Forbidden errors.
-- =====================================================================

-- 1. Ensure table exists with correct schema
CREATE TABLE IF NOT EXISTS public.document_versions (
    id              VARCHAR(100) PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    document_id     VARCHAR(100) REFERENCES public.project_documents(id) ON DELETE CASCADE,
    version_no      VARCHAR(30) NOT NULL,
    snapshot        JSONB NOT NULL,
    changed_by      VARCHAR(100),
    changed_by_name VARCHAR(255),
    remarks         TEXT,
    changed_at      TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Ensure foreign key constraint is dropped if it existed
ALTER TABLE public.document_versions
    DROP CONSTRAINT IF EXISTS document_versions_changed_by_fkey;

-- 3. Ensure RLS is enabled
ALTER TABLE public.document_versions ENABLE ROW LEVEL SECURITY;

-- 4. Drop any previous conflicting policy
DROP POLICY IF EXISTS "DocumentVersions - Full Access" ON public.document_versions;
DROP POLICY IF EXISTS "document_versions_policy" ON public.document_versions;

-- 5. Create Full Access policy for authenticated & anon clients
CREATE POLICY "DocumentVersions - Full Access" ON public.document_versions
    FOR ALL TO authenticated, anon
    USING (true)
    WITH CHECK (true);
