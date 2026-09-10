-- =====================================================================
-- UNAI PM CRM — Document Template Branding & Letterhead Migration
-- File: sql/006_add_document_branding_templates.sql
-- Target: Supabase / PostgreSQL (PM CRM Database)
-- =====================================================================

-- 1. Add document_branding JSONB and custom_watermark_url columns to organizations
ALTER TABLE public.organizations
ADD COLUMN IF NOT EXISTS document_branding JSONB DEFAULT '{
    "watermark": {
        "enabled": true,
        "type": "logo",
        "customType": "text",
        "text": "CONFIDENTIAL",
        "customImageUrl": null,
        "isFaded": true,
        "opacity": 15,
        "size": "md",
        "orientation": "diagonal"
    },
    "header": {
        "enabled": true,
        "showLogo": true,
        "alignment": "split",
        "layout": "inline",
        "isBold": true,
        "leftText": "",
        "rightText": "PM CRM Engineering Deliverable"
    },
    "footer": {
        "enabled": true,
        "copyrightText": "All Rights Reserved",
        "showPageNumber": true,
        "confidentialityNotice": "Strictly Confidential - Internal & Client Delivery Use Only"
    }
}'::jsonb;

ALTER TABLE public.organizations
ADD COLUMN IF NOT EXISTS custom_watermark_url TEXT;

-- 2. Create Storage Buckets for Document Templates and Watermarks
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
(
    'templates',
    'templates',
    true,
    10485760, -- 10MB limit
    ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml', 'image/webp', 'application/pdf']
),
(
    'watermarks',
    'watermarks',
    true,
    10485760, -- 10MB limit
    ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- 3. Storage Policies for templates and watermarks buckets
DO $$
BEGIN
    DROP POLICY IF EXISTS "Public Read Templates" ON storage.objects;
    DROP POLICY IF EXISTS "Authenticated and Anon Upload Templates" ON storage.objects;
    DROP POLICY IF EXISTS "Authenticated and Anon Update Templates" ON storage.objects;
    DROP POLICY IF EXISTS "Public Read Watermarks" ON storage.objects;
    DROP POLICY IF EXISTS "Authenticated and Anon Upload Watermarks" ON storage.objects;
    DROP POLICY IF EXISTS "Authenticated and Anon Update Watermarks" ON storage.objects;
END $$;

-- Templates policies
CREATE POLICY "Public Read Templates"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'templates');

CREATE POLICY "Authenticated and Anon Upload Templates"
ON storage.objects FOR INSERT
TO authenticated, anon
WITH CHECK (bucket_id = 'templates');

CREATE POLICY "Authenticated and Anon Update Templates"
ON storage.objects FOR UPDATE
TO authenticated, anon
USING (bucket_id = 'templates')
WITH CHECK (bucket_id = 'templates');

-- Watermarks policies
CREATE POLICY "Public Read Watermarks"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'watermarks');

CREATE POLICY "Authenticated and Anon Upload Watermarks"
ON storage.objects FOR INSERT
TO authenticated, anon
WITH CHECK (bucket_id = 'watermarks');

CREATE POLICY "Authenticated and Anon Update Watermarks"
ON storage.objects FOR UPDATE
TO authenticated, anon
USING (bucket_id = 'watermarks')
WITH CHECK (bucket_id = 'watermarks');
