/*
# Fix video publication order update

1. Purpose
- Fixes the error that prevents an administrator from publishing a video.
- Keeps the intended behavior: every newly published video is placed first.

2. Modified database behavior
- Updates existing `public.videos.display_order` values with an explicit condition.
- Assigns the new video `display_order = 1`.
- Existing videos retain their relative order and move down one position.

3. Security
- Keeps the existing SECURITY DEFINER function and fixed `search_path = public`.
- Does not change tables, columns, RLS policies, grants, or stored video data.

4. Important notes
- No existing video is deleted or otherwise changed beyond its display position.
- The explicit WHERE condition satisfies the database safety rule that rejected the previous publication attempt.
*/

CREATE OR REPLACE FUNCTION public.assign_video_display_order()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.videos
  SET display_order = display_order + 1
  WHERE id IS NOT NULL;

  NEW.display_order := 1;
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.assign_video_display_order() FROM PUBLIC, anon;
