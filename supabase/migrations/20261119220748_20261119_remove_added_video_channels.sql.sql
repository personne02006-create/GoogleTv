/*
# Remove all generated video channels

1. Purpose
- Removes any remaining video rows from the generated channels previously added by the application.
- Keeps the original channels and video links supplied for the project.

2. Tables modified
- `public.videos`: deletes only rows identified as generated placeholder channels.

3. Security
- No RLS, grants, or policies are changed.

4. Important notes
- This cleanup is explicitly requested by the project owner.
- It is safe to re-run because matching generated rows are removed after the first run.
*/

DELETE FROM public.videos
WHERE channel_id LIKE 'seed-%'
   OR channel_name IN (
     'Nature', 'Cuisine', 'Voyage', 'Business', 'Musique', 'Technologie', 'Sport',
     'Mode', 'Culture', 'Photo', 'Santé', 'Éducation', 'Cinéma'
   );
