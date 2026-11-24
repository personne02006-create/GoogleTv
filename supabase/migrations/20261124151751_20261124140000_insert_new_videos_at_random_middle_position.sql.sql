/*
# Insert new videos at a random position (never touching the first 15)

1. Modified Tables
- `videos`: the `display_order` default (epoch seconds, i.e. "append at end") is removed.
  A new video's position is now assigned automatically by a trigger.
2. New Function + Trigger
- `assign_video_display_order()` (SECURITY DEFINER, search_path pinned):
  when a video is inserted without a position, a random target rank is drawn
  between position 16 and "end of list". Every existing video at or after that
  rank is shifted down by one, and the new video takes that rank.
  The first 15 videos are never moved. If the list has fewer than 15 videos,
  the new one is simply appended.
- Trigger `videos_assign_display_order` runs on every INSERT.
3. Security
- Function is not callable directly: EXECUTE revoked from PUBLIC and anon.
- No RLS or grant changes; write path unchanged (admin flow inserts, trigger reorders).
*/

ALTER TABLE public.videos ALTER COLUMN display_order DROP DEFAULT;

CREATE OR REPLACE FUNCTION public.assign_video_display_order()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  total bigint;
  target bigint;
BEGIN
  SELECT count(*) INTO total FROM public.videos;
  IF total < 15 THEN
    target := total + 1;
  ELSE
    target := floor(random() * (total - 15 + 1))::bigint + 16;
  END IF;
  UPDATE public.videos SET display_order = display_order + 1 WHERE display_order >= target;
  NEW.display_order := target;
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.assign_video_display_order() FROM PUBLIC, anon;

DROP TRIGGER IF EXISTS videos_assign_display_order ON public.videos;

CREATE TRIGGER videos_assign_display_order
BEFORE INSERT ON public.videos
FOR EACH ROW
EXECUTE FUNCTION public.assign_video_display_order();
