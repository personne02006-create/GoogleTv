/*
# Add secure administrator registration and identifier lookup

1. New Functions
- `public.register_admin_profile`
  - Creates the authenticated caller's profile as an administrator.
  - Requires the exact administrator referral code and France as the country.
  - Automatically marks the administrator account approved.
- `public.find_pending_profile_by_identifier`
  - Lets an administrator find one pending registration by its displayed identifier.
  - Returns only the requested pending profile and its contact details.

2. Security
- Both functions are SECURITY DEFINER with a fixed public search_path.
- Anonymous execution is revoked.
- Administrator lookup and approval require the caller's existing server-side `profiles.role = 'admin'`.
- The browser cannot set `role` or `approval_status` directly.

3. Important Notes
- The administrator referral code is validated in the database, not only in the interface.
- The administrator registration is restricted to the country France.
- No existing rows are removed or changed.
*/

CREATE OR REPLACE FUNCTION public.register_admin_profile(
  p_first_name text,
  p_last_name text,
  p_email text,
  p_phone text,
  p_country text,
  p_city text,
  p_account_type text,
  p_birth_date date,
  p_gender text,
  p_referral_code text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  IF upper(trim(p_referral_code)) <> 'GTV-A2180067' OR lower(trim(p_country)) <> 'france' THEN
    RAISE EXCEPTION 'Invalid administrator registration';
  END IF;

  IF EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid()) THEN
    RAISE EXCEPTION 'Profile already exists';
  END IF;

  INSERT INTO profiles (
    id, first_name, last_name, email, phone, country, city, account_type,
    birth_date, gender, referral_code, approval_status, role, approved_at, approved_by
  ) VALUES (
    auth.uid(), p_first_name, p_last_name, p_email, p_phone, p_country, p_city, p_account_type,
    p_birth_date, p_gender, upper(trim(p_referral_code)), 'approved', 'admin', now(), auth.uid()
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.register_admin_profile(text, text, text, text, text, text, text, date, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.register_admin_profile(text, text, text, text, text, text, text, date, text, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.find_pending_profile_by_identifier(p_identifier text)
RETURNS TABLE (
  id uuid,
  first_name text,
  last_name text,
  email text,
  phone text,
  country text,
  city text,
  account_type text,
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
         profiles.country, profiles.city, profiles.account_type, profiles.created_at
  FROM profiles
  WHERE profiles.approval_status = 'pending'
    AND upper(replace(profiles.id::text, '-', '')) LIKE v_identifier || '%'
  LIMIT 1;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.find_pending_profile_by_identifier(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.find_pending_profile_by_identifier(text) TO authenticated;
