/*
# Create favorites table (single-tenant, no auth)

1. New Tables
   - `favorites`
     - `id` (uuid, primary key)
     - `title` (text, not null) — display title of the show/movie
     - `created_at` (timestamp)

2. Security
   - Enable RLS on `favorites`.
   - Grant SELECT, INSERT, DELETE to `anon` + `authenticated` so the Data API can reach the table.
   - Allow anon + authenticated because this app has no sign-in and favorites are intentionally shared.
*/

CREATE TABLE IF NOT EXISTS favorites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, DELETE ON favorites TO anon, authenticated;

DROP POLICY IF EXISTS "anon_select_favorites" ON favorites;
CREATE POLICY "anon_select_favorites" ON favorites FOR SELECT
TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_favorites" ON favorites;
CREATE POLICY "anon_insert_favorites" ON favorites FOR INSERT
TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_favorites" ON favorites;
CREATE POLICY "anon_delete_favorites" ON favorites FOR DELETE
TO anon, authenticated USING (true);
