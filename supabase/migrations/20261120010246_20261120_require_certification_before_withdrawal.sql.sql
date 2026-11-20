/*
# Require account certification before withdrawal review

1. Modified withdrawal validation
- `submit_withdrawal_request` now reads the account certification flag from the
  signed-in user's profile.
- The function refuses to create a withdrawal request when the account is not
  certified by an administrator.
- A correct withdrawal code and a valid balance do not bypass certification.
- Existing withdrawal records and balances are preserved.

2. New administrator lookup
- `find_pending_withdrawal_by_identifier` searches one pending withdrawal using
  the user's displayed identification number.
- The withdrawal details and review buttons are returned only after an
  authenticated administrator performs that search.
- The identifier is restricted to the hexadecimal characters used by the account
  identifier format.

3. Security
- The certification check runs inside the SECURITY DEFINER withdrawal function,
  not only in the browser interface.
- The administrator lookup verifies that the caller has the administrator role.
- Anonymous and public execution are revoked for the new lookup function.
- No direct browser write access to withdrawal requests is added.

4. Important notes
- An uncertified account cannot create a pending withdrawal request, so no amount
  becomes reserved by that attempted request.
- Once an administrator certifies the account, the user can submit a request and
  it remains pending until an administrator approves or rejects it.
- The existing all-pending lookup is preserved for compatibility, but the current
  administrator interface uses the identifier-specific lookup.
*/

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

  IF COALESCE(v_payment_code, '') = ''
     OR lower(trim(p_payment_code)) <> lower(trim(v_payment_code)) THEN
    RAISE EXCEPTION 'Invalid payment code';
  END IF;

  IF COALESCE(v_approval_status, '') <> 'approved' OR v_suspended_at IS NOT NULL THEN
    RAISE EXCEPTION 'Account is not eligible';
  END IF;

  IF NOT COALESCE(v_is_certified, false) THEN
    RAISE EXCEPTION 'Account certification required';
  END IF;

  IF p_amount IS NULL OR p_amount <= 0
     OR NULLIF(trim(p_payment_method), '') IS NULL
     OR NULLIF(trim(p_phone), '') IS NULL
     OR NULLIF(trim(p_country), '') IS NULL
     OR NULLIF(trim(p_city), '') IS NULL THEN
    RAISE EXCEPTION 'Invalid withdrawal request';
  END IF;

  IF EXISTS (
    SELECT 1 FROM withdrawal_requests
    WHERE user_id = v_user_id AND status = 'pending'
  ) THEN
    RAISE EXCEPTION 'Withdrawal request already pending';
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

REVOKE EXECUTE ON FUNCTION public.submit_withdrawal_request(numeric, text, text, text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.submit_withdrawal_request(numeric, text, text, text, text, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.find_pending_withdrawal_by_identifier(p_identifier text)
RETURNS TABLE (
  request_id uuid,
  user_id uuid,
  first_name text,
  last_name text,
  identifier text,
  amount numeric,
  payment_method text,
  phone text,
  country text,
  city text,
  status text,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_identifier text := upper(regexp_replace(trim(p_identifier), '^ID-', ''));
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  IF v_identifier IS NULL OR v_identifier = '' OR v_identifier !~ '^[0-9A-F]{1,32}$' THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT wr.id,
         wr.user_id,
         p.first_name,
         p.last_name,
         'ID-' || left(upper(replace(wr.user_id::text, '-', '')), 15)::text,
         wr.amount,
         wr.payment_method,
         wr.phone,
         wr.country,
         wr.city,
         wr.status,
         wr.created_at
  FROM withdrawal_requests wr
  JOIN profiles p ON p.id = wr.user_id
  WHERE wr.status = 'pending'
    AND upper(replace(wr.user_id::text, '-', '')) LIKE v_identifier || '%'
  ORDER BY wr.created_at ASC
  LIMIT 1;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.find_pending_withdrawal_by_identifier(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.find_pending_withdrawal_by_identifier(text) TO authenticated;
