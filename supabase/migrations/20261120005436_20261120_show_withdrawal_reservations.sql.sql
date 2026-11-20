/*
# Show reserved withdrawal balance clearly

1. Modified withdrawal display
- The user-facing withdrawal balance now subtracts amounts already reserved by
  pending or approved withdrawal requests.
- Existing requests remain visible to the administrator and are not deleted.
- This prevents the screen from showing 7,500 FCFA as available when that same
  amount is already committed to an earlier request.

2. Modified server validation
- `submit_withdrawal_request` now returns a specific message when the account
  already has a pending withdrawal request.
- The existing server-side balance calculation remains authoritative and continues
  to include pending and approved requests.

3. Security
- The browser only reads the signed-in user's own withdrawal rows through the
  existing row-level security policy.
- No direct write access or balance-changing access is added.
- Existing withdrawal records and statuses are preserved.

4. Important notes
- A pending request must be approved or rejected by the administrator before the
  reserved amount becomes available again.
- Rejected requests are not counted as reserved balance.
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

  SELECT account_type, approval_status, suspended_at, payment_code
  INTO v_account_type, v_approval_status, v_suspended_at, v_payment_code
  FROM profiles
  WHERE id = v_user_id;

  IF COALESCE(v_payment_code, '') = ''
     OR lower(trim(p_payment_code)) <> lower(trim(v_payment_code)) THEN
    RAISE EXCEPTION 'Invalid payment code';
  END IF;

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
