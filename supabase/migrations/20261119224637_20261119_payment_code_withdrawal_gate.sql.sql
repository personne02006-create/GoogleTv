/*
# Payment code protecting each withdrawal

1. Modified table
- `public.profiles`
  - `payment_code` stores the code an administrator defines for the account.
  - The browser can never write this column; only the administrator function can.

2. New administrator function
- `set_profile_payment_code` saves or clears the payment code of one account.
  Empty code clears it. The administrator writes the code exactly as it should be
  typed by the user (internal spaces are allowed).

3. Modified function
- `submit_withdrawal_request` now takes one extra parameter `p_payment_code`.
  - The check order is: signed-in account -> payment code -> account eligibility ->
    certification -> balance. The payment code is verified FIRST, and only after a
    correct code does the certification requirement apply.
  - The code is compared without case sensitivity and without leading/trailing spaces.
  - An account with no code defined cannot withdraw (the administrator must set one).

4. Security
- `payment_code` is revoked from every browser write.
- `find_pending_profile_by_identifier` also returns the current payment code so the
  administrator panel can display it.
- Old function signatures are dropped to avoid overloads; grants are re-applied.
- Existing withdrawal requests and profiles are preserved.
*/

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS payment_code text;

REVOKE UPDATE (payment_code) ON public.profiles FROM authenticated;

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
  created_at timestamptz,
  payment_code text
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
         profiles.is_certified, profiles.suspended_at, profiles.created_at, profiles.payment_code
  FROM profiles
  WHERE upper(replace(profiles.id::text, '-', '')) LIKE v_identifier || '%'
  ORDER BY profiles.created_at DESC
  LIMIT 1;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_profile_payment_code(p_user_id uuid, p_code text)
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
  SET payment_code = NULLIF(trim(p_code), '')
  WHERE profiles.id = p_user_id AND profiles.role = 'user';
END;
$$;

DROP FUNCTION IF EXISTS public.submit_withdrawal_request(numeric, text, text, text, text);

CREATE OR REPLACE FUNCTION public.submit_withdrawal_request(
  p_amount numeric,
  p_payment_method text,
  p_phone text,
  p_country text,
  p_city text,
  p_payment_code text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_account_type text;
  v_approval_status text;
  v_is_certified boolean;
  v_suspended_at timestamptz;
  v_payment_code text;
  v_reward numeric;
  v_earned numeric;
  v_committed numeric;
  v_available numeric;
  v_request_id uuid;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  SELECT account_type, approval_status, is_certified, suspended_at, payment_code
  INTO v_account_type, v_approval_status, v_is_certified, v_suspended_at, v_payment_code
  FROM profiles
  WHERE id = v_user_id;

  IF lower(trim(p_payment_code)) <> lower(trim(COALESCE(v_payment_code, '')))
     OR COALESCE(v_payment_code, '') = '' THEN
    RAISE EXCEPTION 'Invalid payment code';
  END IF;

  IF v_approval_status <> 'approved' OR v_suspended_at IS NOT NULL THEN
    RAISE EXCEPTION 'Account is not eligible';
  END IF;

  IF NOT v_is_certified THEN
    RAISE EXCEPTION 'Account certification required';
  END IF;

  IF p_amount IS NULL OR p_amount <= 0
     OR NULLIF(trim(p_payment_method), '') IS NULL
     OR NULLIF(trim(p_phone), '') IS NULL
     OR NULLIF(trim(p_country), '') IS NULL
     OR NULLIF(trim(p_city), '') IS NULL THEN
    RAISE EXCEPTION 'Invalid withdrawal request';
  END IF;

  v_reward := CASE v_account_type
    WHEN 'Premium' THEN 12500
    WHEN 'MasterClass' THEN 15000
    ELSE 7500
  END;

  SELECT count(*) * v_reward
  INTO v_earned
  FROM user_content_activity
  WHERE user_id = v_user_id
    AND watched = true
    AND liked = true
    AND favorited = true;

  SELECT COALESCE(sum(amount), 0)
  INTO v_committed
  FROM withdrawal_requests
  WHERE user_id = v_user_id
    AND status IN ('pending', 'approved');

  v_available := v_earned - v_committed;

  IF p_amount > v_available THEN
    RAISE EXCEPTION 'Amount exceeds available balance';
  END IF;

  INSERT INTO withdrawal_requests (user_id, amount, payment_method, phone, country, city)
  VALUES (v_user_id, p_amount, trim(p_payment_method), trim(p_phone), trim(p_country), trim(p_city))
  RETURNING id INTO v_request_id;

  RETURN v_request_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.find_pending_profile_by_identifier(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.find_pending_profile_by_identifier(text) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.set_profile_payment_code(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_profile_payment_code(uuid, text) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.submit_withdrawal_request(numeric, text, text, text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.submit_withdrawal_request(numeric, text, text, text, text, text) TO authenticated;
