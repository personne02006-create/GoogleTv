/*
# Secure the standard user registration flow

1. New Function
- `public.register_user_profile`
  - Creates the authenticated user's profile as a normal pending user.
  - Validates the exact standard referral code on the server.
  - Prevents the caller from choosing an administrator role or approval state.

2. Security
- SECURITY DEFINER with a fixed public search_path.
- Anonymous and public execution are revoked.
- The profile owner is always taken from `auth.uid()`.
- The role and approval status are fixed to `user` and `pending`.

3. Important Notes
- Existing profile records are preserved.
- The browser no longer needs direct INSERT access for the standard registration path.
- Administrator creation continues through its separate France-only function.
*/

CREATE OR REPLACE FUNCTION public.register_user_profile(
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
  IF auth.uid() IS NULL OR upper(trim(p_referral_code)) <> 'GTV-Q27102' THEN
    RAISE EXCEPTION 'Invalid registration';
  END IF;

  IF EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid()) THEN
    RAISE EXCEPTION 'Profile already exists';
  END IF;

  INSERT INTO profiles (
    id, first_name, last_name, email, phone, country, city, account_type,
    birth_date, gender, referral_code, approval_status, role
  ) VALUES (
    auth.uid(), p_first_name, p_last_name, p_email, p_phone, p_country, p_city, p_account_type,
    p_birth_date, p_gender, upper(trim(p_referral_code)), 'pending', 'user'
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.register_user_profile(text, text, text, text, text, text, text, date, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.register_user_profile(text, text, text, text, text, text, text, date, text, text) TO authenticated;
