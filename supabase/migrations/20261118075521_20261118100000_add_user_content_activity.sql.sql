/*
# Track personal video activity

1. New Table
- `user_content_activity`
  - `id` identifies the activity row.
  - `user_id` identifies the signed-in user and defaults to the current session user.
  - `content_id` identifies the video.
  - `watched` records whether the user watched the video.
  - `liked` records whether the user liked the video.
  - `favorited` records whether the user added the video to favorites.
  - `created_at` and `updated_at` record activity timing.

2. Security
- Row level security is enabled.
- Signed-in users can only read and change their own activity rows.
- The browser cannot assign activity to another user because ownership is filled by `auth.uid()` and checked by policies.
- Anonymous users receive no access.

3. Important Notes
- One row per user and video keeps the counters stable and prevents duplicate counting.
- Existing user accounts and favorite records are preserved.
*/

CREATE TABLE IF NOT EXISTS public.user_content_activity (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  content_id text NOT NULL,
  watched boolean NOT NULL DEFAULT false,
  liked boolean NOT NULL DEFAULT false,
  favorited boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, content_id)
);

ALTER TABLE public.user_content_activity ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_content_activity TO authenticated;

DROP POLICY IF EXISTS "Users can read own content activity" ON public.user_content_activity;
CREATE POLICY "Users can read own content activity"
ON public.user_content_activity FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create own content activity" ON public.user_content_activity;
CREATE POLICY "Users can create own content activity"
ON public.user_content_activity FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own content activity" ON public.user_content_activity;
CREATE POLICY "Users can update own content activity"
ON public.user_content_activity FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own content activity" ON public.user_content_activity;
CREATE POLICY "Users can delete own content activity"
ON public.user_content_activity FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS user_content_activity_user_id_idx
ON public.user_content_activity (user_id);
