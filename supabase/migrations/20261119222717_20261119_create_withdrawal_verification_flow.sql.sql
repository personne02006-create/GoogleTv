/*
# Create transparent withdrawal verification flow

1. New table
- `public.withdrawal_requests`
  - stores the authenticated user's requested amount and payout details.
  - tracks a server-controlled status (`pending`, `approved`, or `rejected`).
  - records creation time for review history.

2. New function
- `submit_withdrawal_request` validates the signed-in account, certification,
  available earned balance, requested amount, and payout details before creating a request.

3. Security
- Row level security is enabled on the new table.
- Users can read only their own requests.
- Direct browser inserts, updates, and deletes are not granted.
- The submission function is SECURITY DEFINER, derives the user from `auth.uid()`,
  uses a fixed search path, and is callable only by authenticated users.

4. Important notes
- This flow shows honest verification and does not ask users to pay a fake network tax.
- Earned balance is calculated from the user's recorded watched, liked, and favorited videos.
- Existing user data is preserved.
*/

CREATE TABLE IF NOT EXISTS public.withdrawal_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  amount numeric(12,2) NOT NULL CHECK (amount > 0),
  payment_method text NOT NULL,
  phone text NOT NULL,
  country text NOT NULL,
  city text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.withdrawal_requests ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.withdrawal_requests TO authenticated;

DROP POLICY IF EXISTS "Users can read own withdrawal requests" ON public.withdrawal_requests;
CREATE POLICY "Users can read own withdrawal requests"
ON public.withdrawal_requests FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

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
  v_is_certified boolean;
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

  SELECT account_type, approval_status, is_certified, suspended_at
  INTO v_account_type, v_approval_status, v_is_certified, v_suspended_at
  FROM profiles
  WHERE id = v_user_id;

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

REVOKE EXECUTE ON FUNCTION public.submit_withdrawal_request(numeric, text, text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.submit_withdrawal_request(numeric, text, text, text, text) TO authenticated;
