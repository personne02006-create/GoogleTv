/*
# Harden withdrawal requests and fix displayed identifier

1. Fixes
- `get_pending_withdrawals` now returns the same 15-character identifier format
  users see in their profile, instead of the full identifier.

2. Security
- Direct writes (INSERT, UPDATE, DELETE) on `withdrawal_requests` are revoked from
  `anon` and `authenticated`. Requests can only be created through
  `submit_withdrawal_request` and only reviewed through `review_withdrawal_request`.
- Row level security and the read-own-requests policy are unchanged.

3. Important notes
- No data is modified; existing withdrawal requests are preserved.
*/

CREATE OR REPLACE FUNCTION public.get_pending_withdrawals()
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
BEGIN
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin') THEN
    RAISE EXCEPTION 'Not authorized';
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
  ORDER BY wr.created_at ASC;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_pending_withdrawals() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_pending_withdrawals() TO authenticated;

REVOKE INSERT, UPDATE, DELETE ON public.withdrawal_requests FROM anon, authenticated;
