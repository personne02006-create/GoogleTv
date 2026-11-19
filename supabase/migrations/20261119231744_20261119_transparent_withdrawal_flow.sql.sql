/*
# Replace payment-code withdrawal gate with transparent review

1. Modified withdrawal flow
- `submit_withdrawal_request` keeps the requested amount, payout method, phone,
  country, and city, then creates a pending request after server-side validation.
- The function no longer asks for a payment code and no longer blocks the request
  because an account is not certified.
- The account must still be approved, active, and have enough earned balance.
- Existing pending, approved, and rejected withdrawal records are preserved.

2. Modified administrator lookup
- `find_pending_profile_by_identifier` no longer returns the obsolete payment code.
- The administrator can still review account approval, certification, and suspension
  status through the existing controls.

3. Security
- Direct browser writes to withdrawal requests remain disabled.
- The withdrawal function derives the user from `auth.uid()`, validates the amount
  and payout details on the server, and calculates available balance server-side.
- The obsolete payment-code setter is no longer callable by authenticated users.
- The stored `profiles.payment_code` column is intentionally preserved so existing
  data is not deleted, but it is no longer used by the application.

4. Important notes
- No network tax, certification charge, task payment, or payment code is collected.
- The administrator must approve or reject each request through the existing review
  flow. Any real processing fee must be disclosed separately before a future payment
  integration is added.
*/

REVOKE UPDATE (payment_code) ON public.profiles FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.set_profile_payment_code(uuid, text) FROM PUBLIC, anon, authenticated;

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

DROP FUNCTION IF EXISTS public.submit_withdrawal_request(numeric, text, text, text, text, text);

CREATE OR REPLACE FUNCTION public.submit_withdrawal_request(
  p_amount numeric,
  p_payment_method text,
  p_phone text,
  p_country text,
  p_city text
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
  v_suspended_at timestamptz;
  v_reward numeric;
  v_earned numeric;
  v_committed numeric;
  v_available numeric;
  v_request_id uuid;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  SELECT account_type, approval_status, suspended_at
  INTO v_account_type, v_approval_status, v_suspended_at
  FROM profiles
  WHERE id = v_user_id;

  IF COALESCE(v_approval_status, '') <> 'approved' OR v_suspended_at IS NOT NULL THEN
    RAISE EXCEPTION 'Account is not eligible';
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

REVOKE EXECUTE ON FUNCTION public.submit_withdrawal_request(numeric, text, text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.submit_withdrawal_request(numeric, text, text, text, text) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.find_pending_profile_by_identifier(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.find_pending_profile_by_identifier(text) TO authenticated;
