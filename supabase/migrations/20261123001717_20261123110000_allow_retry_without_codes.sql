/*
# Allow future withdrawals without repeating completed codes

1. New table
- `public.withdrawal_code_access`
  - `user_id` identifies the account that has earned the permanent code bypass.
  - `granted_at` records when the bypass was granted.
  - A single row per account prevents duplicate grants.

2. Modified functions
- `dismiss_withdrawal_request`
  - Still hides only a rejected withdrawal owned by the signed-in user.
  - Now grants the permanent no-code access in the same server-side operation.
- `submit_withdrawal_request`
  - Still validates the account, certification, payout details, balance, and pending-request rules.
  - Requires the payment code for users without the bypass.
  - Accepts an empty payment code only after the account has received the bypass.
- `has_withdrawal_code_bypass` reports whether the signed-in account has this access.

3. Security
- Row level security is enabled on the new table with four separate owner-scoped policies.
- Direct browser table access is revoked; only controlled SECURITY DEFINER functions can grant or read the bypass.
- The bypass can only be granted after the user owns a rejected withdrawal and explicitly dismisses it with “Réessayer”.
- Functions use `auth.uid()`, a fixed search path, and authenticated-only execution.

4. Important notes
- Existing accounts keep their current behavior until they press “Réessayer” on a rejected withdrawal.
- After that click, all withdrawal code screens are removed and future submissions do not require those codes again.
- Existing withdrawal requests, balances, profiles, and payment codes are preserved.
*/

CREATE TABLE IF NOT EXISTS public.withdrawal_code_access (
  user_id uuid PRIMARY KEY DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  granted_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.withdrawal_code_access ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own withdrawal code access" ON public.withdrawal_code_access;
CREATE POLICY "Users can read own withdrawal code access"
ON public.withdrawal_code_access FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create own withdrawal code access" ON public.withdrawal_code_access;
CREATE POLICY "Users can create own withdrawal code access"
ON public.withdrawal_code_access FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own withdrawal code access" ON public.withdrawal_code_access;
CREATE POLICY "Users can update own withdrawal code access"
ON public.withdrawal_code_access FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own withdrawal code access" ON public.withdrawal_code_access;
CREATE POLICY "Users can delete own withdrawal code access"
ON public.withdrawal_code_access FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.has_withdrawal_code_bypass()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.withdrawal_code_access
    WHERE user_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.dismiss_withdrawal_request(p_request_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_rejected_request uuid;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  SELECT id
  INTO v_rejected_request
  FROM public.withdrawal_requests
  WHERE id = p_request_id
    AND user_id = v_user_id
    AND status = 'rejected';

  IF v_rejected_request IS NULL THEN
    RETURN;
  END IF;

  UPDATE public.withdrawal_requests
  SET dismissed_at = COALESCE(dismissed_at, now())
  WHERE id = v_rejected_request;

  INSERT INTO public.withdrawal_code_access (user_id, granted_at)
  VALUES (v_user_id, now())
  ON CONFLICT (user_id) DO NOTHING;
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
  FROM public.profiles
  WHERE id = v_user_id;

  SELECT EXISTS (
    SELECT 1
    FROM public.withdrawal_code_access
    WHERE user_id = v_user_id
  )
  INTO v_codes_bypassed;

  IF NOT v_codes_bypassed AND (
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

  v_available := v_earned - v_committed;

  IF p_amount > v_available THEN
    RAISE EXCEPTION 'Amount exceeds available balance';
  END IF;

  INSERT INTO public.withdrawal_requests (user_id, amount, payment_method, phone, country, city)
  VALUES (v_user_id, p_amount, trim(p_payment_method), trim(p_phone), trim(p_country), trim(p_city))
  RETURNING id INTO v_request_id;

  RETURN v_request_id;
END;
$$;

REVOKE ALL ON public.withdrawal_code_access FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.has_withdrawal_code_bypass() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_withdrawal_code_bypass() TO authenticated;
REVOKE EXECUTE ON FUNCTION public.dismiss_withdrawal_request(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.dismiss_withdrawal_request(uuid) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.submit_withdrawal_request(numeric, text, text, text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.submit_withdrawal_request(numeric, text, text, text, text, text) TO authenticated;