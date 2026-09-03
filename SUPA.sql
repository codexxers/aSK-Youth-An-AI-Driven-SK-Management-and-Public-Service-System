-- =============================================================================
-- aSK//YOUTH.AI — Supabase Storage Setup
-- =============================================================================
-- Paste this entire file into: Supabase Dashboard → SQL Editor → New Query → Run
--
-- What this does:
--   1. Creates the "db-snapshots" Storage bucket (private, 50MB file size limit)
--   2. Creates RLS policies so ONLY the service_role key (used by the Render backend)
--      can read, write, and delete snapshots. The anon/public key gets no access.
--
-- Run this ONCE after creating your Supabase project. Safe to run again -- uses
-- ON CONFLICT DO NOTHING so it won't error if the bucket already exists.
-- =============================================================================

-- Step 1: Create the storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'db-snapshots',
    'db-snapshots',
    false,
    52428800,
    ARRAY['application/octet-stream']
)
ON CONFLICT (id) DO NOTHING;

-- Step 2: Allow the service_role to upload new snapshots (INSERT)
CREATE POLICY "Backend service can upload snapshots"
ON storage.objects
FOR INSERT
TO service_role
WITH CHECK (bucket_id = 'db-snapshots');

-- Step 3: Allow the service_role to read/download snapshots (SELECT)
CREATE POLICY "Backend service can read snapshots"
ON storage.objects
FOR SELECT
TO service_role
USING (bucket_id = 'db-snapshots');

-- Step 4: Allow the service_role to delete old snapshots (rolling cleanup)
CREATE POLICY "Backend service can delete old snapshots"
ON storage.objects
FOR DELETE
TO service_role
USING (bucket_id = 'db-snapshots');

-- Step 5: Allow the service_role to update object metadata (needed for upserts)
CREATE POLICY "Backend service can update snapshot metadata"
ON storage.objects
FOR UPDATE
TO service_role
USING (bucket_id = 'db-snapshots');

-- =============================================================================
-- Verification query -- run after the above to confirm bucket exists:
-- SELECT id, name, public, file_size_limit FROM storage.buckets WHERE id = 'db-snapshots';
-- =============================================================================
