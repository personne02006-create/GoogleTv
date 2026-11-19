/*
# Remove YouTube catalog and add dislikes

1. Data cleanup
- Deletes every row from `public.videos` that uses a YouTube video id.
- Keeps locally uploaded videos whose `video_url` is present and `youtube_id` is null.
- Removes activity rows attached to deleted YouTube videos so counters do not reference missing content.

2. Modified tables
- `public.user_content_activity`
  - adds `disliked` (boolean, not null, default false) to record a user's dislike action.

3. Security
- Existing RLS policies and authenticated-only grants remain in force.
- The new column is covered by the existing owner-scoped activity policies.

4. Important notes
- This is an intentional deletion requested by the project owner.
- No locally uploaded video file is deleted.
- The migration is safe to re-run: deleted YouTube rows and their related activity are absent afterward.
*/

ALTER TABLE public.user_content_activity
ADD COLUMN IF NOT EXISTS disliked boolean NOT NULL DEFAULT false;

DELETE FROM public.user_content_activity
WHERE content_id IN (
  SELECT id::text FROM public.videos WHERE youtube_id IS NOT NULL
);

DELETE FROM public.videos
WHERE youtube_id IS NOT NULL;
