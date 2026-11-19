/*
# Restrict the video catalog to uploaded files

1. Modified table
- `public.videos`: adds a check constraint requiring every catalog row to contain
  a local `video_url` and no `youtube_id`.

2. Purpose
- Ensures the catalog contains only videos uploaded by the administrator.
- Prevents future YouTube rows from being inserted accidentally or through a direct request.

3. Security
- Existing RLS policies and administrator-only write rules remain unchanged.

4. Important notes
- Existing YouTube rows were removed by the preceding cleanup migration.
- Existing locally uploaded videos remain available.
*/

ALTER TABLE public.videos
ADD CONSTRAINT videos_uploaded_file_only_check
CHECK (youtube_id IS NULL AND video_url IS NOT NULL);
