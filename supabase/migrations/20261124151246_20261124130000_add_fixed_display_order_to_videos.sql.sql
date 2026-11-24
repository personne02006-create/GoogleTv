/*
# Add fixed display order to videos

1. Modified Tables
- `videos`: new column `display_order` (bigint). Each existing video receives a
  permanently random position, drawn once. New videos appended at the end.
2. Security
- No RLS changes; column readable via existing SELECT grants, written by admin flow only.
3. Notes
- The shuffle is done ONCE: row_number over a random sort, stored in the column.
  Fetches order by display_order, so the layout is stable across pages and reloads.
*/

ALTER TABLE public.videos ADD COLUMN IF NOT EXISTS display_order bigint;

UPDATE public.videos
SET display_order = s.ord
FROM (
  SELECT id, row_number() OVER (ORDER BY random()) AS ord
  FROM public.videos
) s
WHERE s.id = videos.id AND videos.display_order IS NULL;

-- New videos default to a position after all current ones (epoch seconds), never reshuffling existing rows.
ALTER TABLE public.videos
  ALTER COLUMN display_order SET DEFAULT (extract(epoch from now())::bigint);

CREATE INDEX IF NOT EXISTS videos_display_order_idx ON public.videos (display_order);
