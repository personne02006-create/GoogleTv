/*
# Admin video publishing (no YouTube required)

1. Modified tables
- `public.videos`
  - `youtube_id` becomes nullable so admin-published video files do not need a YouTube id.
  - new column `video_url` (text, nullable): public URL of an uploaded video file (Supabase Storage).
  - new column `thumbnail_url` (text, nullable): optional poster image for the card.

2. Storage
- Creates a public storage bucket `videos` (idempotent) to host uploaded video files.
- Storage object policies:
  - everyone can view files in the `videos` bucket (public playback),
  - administrators (profiles.role = 'admin') can upload and delete files in the bucket.

3. Security
- Table `public.videos`: RLS stays enabled. Public read policy unchanged.
- New INSERT / UPDATE / DELETE policies on `public.videos` restricted to authenticated
  administrators (profile row with role = 'admin'), so only the admin account can publish.
- Grants already exist for `authenticated`; no privilege change needed for new nullable columns.

4. Notes
- All statements are idempotent and safe to re-run.
- No data is removed; existing YouTube rows keep working as a fallback playback source.
*/

ALTER TABLE public.videos ALTER COLUMN youtube_id DROP NOT NULL;
ALTER TABLE public.videos ADD COLUMN IF NOT EXISTS video_url text;
ALTER TABLE public.videos ADD COLUMN IF NOT EXISTS thumbnail_url text;

INSERT INTO storage.buckets (id, name, public)
VALUES ('videos', 'videos', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Public can view video files" ON storage.objects;
CREATE POLICY "Public can view video files"
ON storage.objects FOR SELECT
TO anon, authenticated
USING (bucket_id = 'videos');

DROP POLICY IF EXISTS "Admins can upload video files" ON storage.objects;
CREATE POLICY "Admins can upload video files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'videos'
  AND EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  )
);

DROP POLICY IF EXISTS "Admins can delete video files" ON storage.objects;
CREATE POLICY "Admins can delete video files"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'videos'
  AND EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  )
);

DROP POLICY IF EXISTS "Admins can add videos" ON public.videos;
CREATE POLICY "Admins can add videos"
ON public.videos FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  )
);

DROP POLICY IF EXISTS "Admins can edit videos" ON public.videos;
CREATE POLICY "Admins can edit videos"
ON public.videos FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  )
);

DROP POLICY IF EXISTS "Admins can remove videos" ON public.videos;
CREATE POLICY "Admins can remove videos"
ON public.videos FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  )
);
