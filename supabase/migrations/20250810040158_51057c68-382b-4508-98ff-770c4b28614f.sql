-- Create public avatars bucket if not exists and add RLS policies safely
-- Bucket creation/update
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM storage.buckets WHERE id = 'avatars'
  ) THEN
    INSERT INTO storage.buckets (id, name, public)
    VALUES ('avatars', 'avatars', true);
  ELSE
    -- Ensure it's public
    UPDATE storage.buckets SET public = true WHERE id = 'avatars';
  END IF;
END $$;

-- Public read access policy (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Public read access for avatars'
  ) THEN
    CREATE POLICY "Public read access for avatars"
    ON storage.objects
    FOR SELECT
    USING (bucket_id = 'avatars');
  END IF;
END $$;

-- Allow anonymous uploads into avatars bucket (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Anon can upload to avatars'
  ) THEN
    CREATE POLICY "Anon can upload to avatars"
    ON storage.objects
    FOR INSERT
    TO anon
    WITH CHECK (bucket_id = 'avatars');
  END IF;
END $$;

-- Optionally allow updates by anon if needed for overwriting (kept disabled by default)
-- DO $$
-- BEGIN
--   IF NOT EXISTS (
--     SELECT 1 FROM pg_policies
--     WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Anon can update avatars'
--   ) THEN
--     CREATE POLICY "Anon can update avatars" ON storage.objects FOR UPDATE TO anon USING (bucket_id = 'avatars') WITH CHECK (bucket_id = 'avatars');
--   END IF;
-- END $$;