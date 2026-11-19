/*
# Restore administrator withdrawal-code confirmation

1. Modified withdrawal flow
- The user first fills the withdrawal details and continues to a confirmation step.
- The interface waits three seconds before showing the withdrawal-code field.
- The withdrawal request is created only after the submitted code is verified.
- Existing withdrawal requests, balances, profiles, and account statuses are preserved.

2. Modified administrator control
- `set_profile_payment_code` is restored as the only way for an administrator to
  define or replace the withdrawal code for a user account.
- The account lookup does not return the stored code.
- The code is never written directly by the browser to the profiles table.

3. Modified server function
- `submit_withdrawal_request` accepts `p_payment_code` again.
- The server checks the signed-in user, code, approval status, suspension status,
  required payout details, and available earned balance before inserting a request.
- The code comparison ignores leading/trailing spaces and letter case.

4. Security
- The payment-code column remains unavailable to browser UPDATE requests.
- The code-setting function is callable only by authenticated administrators after
  checking the caller's administrator role on the server.
- The withdrawal function is callable only by authenticated users and derives the
  account from `auth.uid()` rather than from a client-supplied user id.
- Direct INSERT, UPDATE, and DELETE access to withdrawal requests remains disabled.

5. Important notes
- A request is not created during the three-second preparation screen.
- If no code is defined for an account, the administrator must define one before
  that account can complete a withdrawal.
*/

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS payment_code text;
REVOKE UPDATE (payment_code) ON public.profiles FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.set_profile_payment_code(p_user_id uuid, p_code text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  UPDATE profiles
  SET payment_code = NULLIF(trim(p_code), '')
  WHERE profiles.id = p_user_id AND profiles.role = 'user';
END;
$$;

DROP FUNCTION IF EXISTS public.submit_withdrawal_request(numeric, text, text, text, text);
DROP FUNCTION IF EXISTS public.submit_withdrawal_request(numeric, text, text, text, text, text);

CREATE FUNCTION public.submit_withdrawal_request(
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

REVOKE EXECUTE ON FUNCTION public.set_profile_payment_code(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_profile_payment_code(uuid, text) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.submit_withdrawal_request(numeric, text, text, text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.submit_withdrawal_request(numeric, text, text, text, text, text) TO authenticated;
