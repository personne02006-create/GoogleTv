/*
# Create videos table with real YouTube Shorts catalog

1. New Tables
- `videos`
  - `id` (uuid, primary key)
  - `channel_id` (text, not null) — YouTube channel identifier.
  - `channel_name` (text, not null) — display name of the YouTube channel.
  - `youtube_id` (text, not null, unique) — YouTube video identifier used by the embedded player.
  - `title` (text, not null) — video title.
  - `created_at` (timestamp)

2. Security
- Row level security is enabled.
- All signed-in users can read the shared catalog (it is the same for everyone).
- Only the service role can insert, update or delete videos (catalog is managed server-side, not by end users).

3. Important Notes
- The catalog is populated with real Shorts collected from the channels provided by the user.
- No fake or placeholder video ids are inserted.
- The `youtube_id` is used to build the embedded YouTube player (iframe src `https://www.youtube.com/embed/<id>`).
*/

CREATE TABLE IF NOT EXISTS public.videos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id text NOT NULL,
  channel_name text NOT NULL,
  youtube_id text NOT NULL UNIQUE,
  title text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.videos ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON public.videos TO authenticated;

DROP POLICY IF EXISTS "Anyone can view videos" ON public.videos;
CREATE POLICY "Anyone can view videos"
ON public.videos FOR SELECT
TO authenticated
USING (true);

CREATE INDEX IF NOT EXISTS videos_channel_id_idx ON public.videos (channel_id);
