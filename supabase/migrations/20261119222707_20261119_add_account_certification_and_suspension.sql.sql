/*
# Add administrator certification and suspension controls

1. Modified table
- `public.profiles`
  - `is_certified` records whether an administrator has certified the account.
  - `suspended_at` records when access was suspended, or stays null when active.
  - `suspended_by` records which administrator performed the suspension.

2. New administrator functions
- `set_profile_certification` activates or removes the account certification.
- `set_profile_suspension` suspends or reactivates the account.
- `find_pending_profile_by_identifier` is replaced with an administrator lookup for any account,
  returning approval, certification, and suspension status.

3. Security
- New account-control columns are not writable by the browser.
- All functions run with a fixed search path and verify the caller is an administrator.
- Anonymous execution is revoked; authenticated execution is limited to the administrator functions.

4. Important notes
- Suspension is enforced by the application before a user reaches the account area.
- Existing profiles keep their current approval and role values.
- This migration does not create or require a payment code or a payment to access an account.
*/

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_certified boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS suspended_at timestamptz,
  ADD COLUMN IF NOT EXISTS suspended_by uuid REFERENCES auth.users(id);

REVOKE UPDATE (is_certified, suspended_at, suspended_by) ON public.profiles FROM authenticated;

DROP FUNCTION IF EXISTS public.find_pending_profile_by_identifier(text);

CREATE FUNCTION public.find_pending_profile_by_identifier(p_identifier text)
RETURNS TABLE (
  id uuid,
  first_name text,
  last_name text,
  email text,
  phone text,
  country text,
  city text,
  account_type text,
  approval_status text,
  is_certified boolean,
  suspended_at timestamptz,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_identifier text := upper(regexp_replace(trim(p_identifier), '^ID-', ''));
BEGIN
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin') THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  RETURN QUERY
  SELECT profiles.id, profiles.first_name, profiles.last_name, profiles.email, profiles.phone,
         profiles.country, profiles.city, profiles.account_type, profiles.approval_status,
         profiles.is_certified, profiles.suspended_at, profiles.created_at
  FROM profiles
  WHERE upper(replace(profiles.id::text, '-', '')) LIKE v_identifier || '%'
  ORDER BY profiles.created_at DESC
  LIMIT 1;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_profile_certification(p_user_id uuid, p_certified boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin') THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  UPDATE profiles
  SET is_certified = p_certified
  WHERE profiles.id = p_user_id AND profiles.role = 'user';
END;
$$;

CREATE OR REPLACE FUNCTION public.set_profile_suspension(p_user_id uuid, p_suspended boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin') THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  UPDATE profiles
  SET suspended_at = CASE WHEN p_suspended THEN now() ELSE NULL END,
      suspended_by = CASE WHEN p_suspended THEN auth.uid() ELSE NULL END
  WHERE profiles.id = p_user_id AND profiles.role = 'user';
END;
$$;

REVOKE EXECUTE ON FUNCTION public.find_pending_profile_by_identifier(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.find_pending_profile_by_identifier(text) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.set_profile_certification(uuid, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_profile_certification(uuid, boolean) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.set_profile_suspension(uuid, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_profile_suspension(uuid, boolean) TO authenticated;
