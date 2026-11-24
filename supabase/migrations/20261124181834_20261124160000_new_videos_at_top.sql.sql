/*
# Place newly posted videos at the very top

Replaces the previous "random middle position" trigger.
New videos now get display_order = 1 and push every existing video down by one.
Existing order is otherwise preserved.
*/

CREATE OR REPLACE FUNCTION public.assign_video_display_order()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.videos SET display_order = display_order + 1;
  NEW.display_order := 1;
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.assign_video_display_order() FROM PUBLIC, anon;
