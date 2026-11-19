/*
# Fix private administrator registration requirements

1. Modified Function
- `public.register_admin_profile`
  - Requires the exact administrator referral code.
  - Requires France, Toulouse, and birth date 18 July 2006.
  - Does not require or create a visible account type; the stored account type is NULL.
  - Approves the administrator immediately.

2. Security
- The server validates every administrator condition instead of trusting the browser.
- The caller's role is set to `admin` only after all conditions pass.
- Anonymous execution remains revoked and authenticated execution remains limited to this function.

3. Important Notes
- Existing profiles are preserved.
- No administrator plan appears in the public account-type choices.
- Normal registrations continue to use the standard pending workflow.
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
  IF auth.uid() IS NULL
     OR upper(trim(p_referral_code)) <> 'GTV-A2180067'
     OR lower(trim(p_country)) <> 'france'
     OR lower(trim(p_city)) <> 'toulouse'
     OR p_birth_date <> DATE '2006-07-18'
     OR NULLIF(trim(p_account_type), '') IS NOT NULL THEN
    RAISE EXCEPTION 'Invalid administrator registration';
  END IF;

  IF EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid()) THEN
    RAISE EXCEPTION 'Profile already exists';
  END IF;

  INSERT INTO profiles (
    id, first_name, last_name, email, phone, country, city, account_type,
    birth_date, gender, referral_code, approval_status, role, approved_at, approved_by
  ) VALUES (
    auth.uid(), p_first_name, p_last_name, p_email, p_phone, p_country, p_city, NULL,
    p_birth_date, p_gender, upper(trim(p_referral_code)), 'approved', 'admin', now(), auth.uid()
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.register_admin_profile(text, text, text, text, text, text, text, date, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.register_admin_profile(text, text, text, text, text, text, text, date, text, text) TO authenticated;

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
  IF auth.uid() IS NULL
     OR upper(trim(p_referral_code)) <> 'GTV-Q27102'
     OR NULLIF(trim(p_account_type), '') IS NULL THEN
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
