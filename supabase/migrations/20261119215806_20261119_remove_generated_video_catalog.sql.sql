/*
# Remove generated placeholder video catalog

1. Purpose
- Removes only the 520 catalog rows that were generated with `channel_id` values
  beginning with `seed-`.
- Keeps every original video row supplied for the application unchanged.

2. Tables modified
- `public.videos`: deletes generated placeholder rows only.

3. Security
- No RLS, grants, storage settings, or policies are changed.

4. Important notes
- This is an intentional cleanup requested by the project owner.
- No user activity rows reference these generated videos, so no related user data is removed.
- The migration is safe to re-run because matching generated rows are absent afterward.
*/

DELETE FROM public.videos
WHERE channel_id LIKE 'seed-%';
