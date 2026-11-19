/*
# Add account profiles and owner-scoped favorites

1. New Tables
   - `profiles`
     - `id` (uuid, primary key, linked to the authenticated account)
     - `first_name`, `last_name` (text, required)
     - `email`, `phone`, `country`, `city` (text)
     - `account_type`, `birth_date`, `gender`, `referral_code` (text)
     - `created_at` (timestamp)

2. Modified Tables
   - `favorites`
     - Add `user_id` (uuid, defaults to the signed-in account and references auth.users).
     - Add a unique index so an account cannot save the same title twice.

3. Security
   - Enable RLS on `profiles` and `favorites`.
   - Profiles are readable and editable only by their owner.
   - Favorites are readable, insertable, and deletable only by their owner.
   - Remove anonymous access to favorites now that the app has account screens.

4. Important Notes
   - Existing favorite rows without an owner remain inaccessible to signed-in accounts; no user data is deleted.
   - The browser never receives passwords; authentication remains managed by Supabase Auth.
*/

CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name text NOT NULL,
  last_name text NOT NULL,
  email text,
  phone text,
  country text,
  city text,
  account_type text,
  birth_date date,
  gender text,
  referral_code text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE ON profiles TO authenticated;

DROP POLICY IF EXISTS "profiles_select_own" ON profiles;
CREATE POLICY "profiles_select_own" ON profiles FOR SELECT
TO authenticated USING (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_insert_own" ON profiles;
CREATE POLICY "profiles_insert_own" ON profiles FOR INSERT
TO authenticated WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
CREATE POLICY "profiles_update_own" ON profiles FOR UPDATE
TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

ALTER TABLE favorites ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid();
ALTER TABLE favorites ALTER COLUMN user_id SET DEFAULT auth.uid();
CREATE UNIQUE INDEX IF NOT EXISTS favorites_user_title_unique ON favorites(user_id, title);

ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;
REVOKE SELECT, INSERT, DELETE ON favorites FROM anon;
GRANT SELECT, INSERT, DELETE ON favorites TO authenticated;

DROP POLICY IF EXISTS "anon_select_favorites" ON favorites;
DROP POLICY IF EXISTS "anon_insert_favorites" ON favorites;
DROP POLICY IF EXISTS "anon_delete_favorites" ON favorites;
DROP POLICY IF EXISTS "favorites_select_own" ON favorites;
CREATE POLICY "favorites_select_own" ON favorites FOR SELECT
TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "favorites_insert_own" ON favorites;
CREATE POLICY "favorites_insert_own" ON favorites FOR INSERT
TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "favorites_delete_own" ON favorites;
CREATE POLICY "favorites_delete_own" ON favorites FOR DELETE
TO authenticated USING (auth.uid() = user_id);
