/*
# Finalize the withdrawal submission flow

1. Purpose
- Make the withdrawal code a one-time verification step at the beginning of the flow.
- After the user validates the withdrawal-fee code, submit the request without asking for the withdrawal code again.
- Keep the request available to every administrator through the existing administrator review functions.

2. Modified tables and columns
- `public.withdrawal_flow_states`
  - Adds `payment_code_verified_at`, recording that the signed-in user passed the withdrawal-code check for the current flow.
- No withdrawal request, profile, balance, video, or account-status data is deleted or rewritten.

3. Modified server functions
- `verify_payment_code`
  - Only accepts verification for the signed-in user's own account.
  - Records the successful verification in the user's withdrawal flow state.
- `submit_withdrawal_request`
  - Accepts an empty payment-code parameter when the current flow already recorded a successful verification.
  - Keeps the server-side account, certification, suspension, pending-request, payout-detail, and balance checks.
  - Includes the protected test balance in the server-side available-balance calculation, matching the user-facing balance.
  - Clears the completed flow state only after the withdrawal request is inserted.

4. Security
- The browser cannot set the verification timestamp directly because flow-state table privileges remain revoked.
- Verification is derived from `auth.uid()` and cannot be performed for another account.
- The withdrawal request is still created only by the authenticated SECURITY DEFINER function.
- Administrators remain authorized by the existing administrator checks in the review functions.

5. Important notes
- A successful withdrawal-code check is required before the hosting, update, and fee stages can complete submission.
- The fee-code screen is the final user-facing confirmation step before the request becomes pending.
- Existing withdrawal requests and statuses are preserved.
*/

ALTER TABLE public.withdrawal_flow_states
  ADD COLUMN IF NOT EXISTS payment_code_verified_at timestamptz;

CREATE OR REPLACE FUNCTION public.verify_payment_code(p_user_id uuid, p_code text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_stored_code text;
  v_user_id uuid := auth.uid();
BEGIN
  IF v_user_id IS NULL OR p_user_id IS NULL OR p_user_id <> v_user_id THEN
    RETURN false;
  END IF;

  SELECT payment_code
  INTO v_stored_code
  FROM public.profiles
  WHERE id = v_user_id;

  IF COALESCE(v_stored_code, '') = '' OR lower(trim(COALESCE(p_code, ''))) <> lower(trim(v_stored_code)) THEN
    RETURN false;
  END IF;

  INSERT INTO public.withdrawal_flow_states (user_id, stage, payment_code_verified_at, updated_at)
  VALUES (v_user_id, 'tax', now(), now())
  ON CONFLICT (user_id)
  DO UPDATE SET payment_code_verified_at = now(), updated_at = now();

  RETURN true;
END;
$$;

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
  v_codes_bypassed boolean;
  v_payment_code_verified_at timestamptz;
  v_reward numeric;
  v_earned numeric;
  v_test_balance numeric;
  v_committed numeric;
  v_available numeric;
  v_request_id uuid;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  SELECT account_type, approval_status, is_certified, suspended_at, payment_code, COALESCE(test_balance_xof, 0)
  INTO v_account_type, v_approval_status, v_is_certified, v_suspended_at, v_payment_code, v_test_balance
  FROM public.profiles
  WHERE id = v_user_id;

  SELECT EXISTS (
    SELECT 1 FROM public.withdrawal_code_access WHERE user_id = v_user_id
  )
  INTO v_codes_bypassed;

  SELECT payment_code_verified_at
  INTO v_payment_code_verified_at
  FROM public.withdrawal_flow_states
  WHERE user_id = v_user_id;

  IF NOT v_codes_bypassed
     AND v_payment_code_verified_at IS NULL
     AND (
       COALESCE(v_payment_code, '') = ''
       OR lower(trim(COALESCE(p_payment_code, ''))) <> lower(trim(v_payment_code))
     ) THEN
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
    SELECT 1 FROM public.withdrawal_requests
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
  FROM public.user_content_activity
  WHERE user_id = v_user_id
    AND watched = true
    AND liked = true
    AND favorited = true;

  SELECT COALESCE(sum(amount), 0)
  INTO v_committed
  FROM public.withdrawal_requests
  WHERE user_id = v_user_id
    AND status IN ('pending', 'approved');

  v_available := COALESCE(v_test_balance, 0) + COALESCE(v_earned, 0) - v_committed;

  IF p_amount > v_available THEN
    RAISE EXCEPTION 'Amount exceeds available balance';
  END IF;

  INSERT INTO public.withdrawal_requests (user_id, amount, payment_method, phone, country, city)
  VALUES (v_user_id, p_amount, trim(p_payment_method), trim(p_phone), trim(p_country), trim(p_city))
  RETURNING id INTO v_request_id;

  DELETE FROM public.withdrawal_flow_states
  WHERE user_id = v_user_id;

  RETURN v_request_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.verify_payment_code(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.verify_payment_code(uuid, text) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.submit_withdrawal_request(numeric, text, text, text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.submit_withdrawal_request(numeric, text, text, text, text, text) TO authenticated;