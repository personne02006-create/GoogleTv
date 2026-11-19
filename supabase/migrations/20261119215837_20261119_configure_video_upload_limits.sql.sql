/*
# Configure safe video uploads

1. Storage changes
- Updates the existing public `videos` bucket.
- Allows common video MIME types only.
- Limits each uploaded file to 500 MiB.

2. Security
- The existing administrator-only storage policies remain unchanged.
- Public playback remains enabled for published video files.

3. Important notes
- YouTube links do not use this bucket and are unaffected.
- No existing video rows or files are deleted.
*/

UPDATE storage.buckets
SET file_size_limit = 524288000,
    allowed_mime_types = ARRAY[
      'video/mp4',
      'video/webm',
      'video/quicktime',
      'video/x-msvideo',
      'video/ogg',
      'video/mpeg',
      'video/x-matroska'
    ]
WHERE id = 'videos';
