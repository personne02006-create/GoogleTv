/*
# Administrator withdrawal review

1. New functions
- `get_pending_withdrawals` returns every pending withdrawal request with the
  requester's profile details (name, identifier, contact, payout details) so the
  administrator can review and decide each request.
- `review_withdrawal_request` approves or rejects one pending withdrawal request.
  - `p_request_id` is the withdrawal request to review.
  - `p_status` must be 'approved' or 'rejected'.

2. Security
- Both functions are SECURITY DEFINER with a fixed search path.
- Both verify the caller's profile has role = 'admin' before doing anything.
- Anonymous and public execution are revoked; only authenticated administrators can call them.
- `review_withdrawal_request` only touches requests still in 'pending' status, so a
  request cannot be approved twice or changed after a decision.

3. Important notes
- Users still cannot write to `withdrawal_requests` directly: no insert, update, or
  delete grant is added, and no new policy is created.
- Rejecting a request frees the amount back to the user's available balance because
  only 'pending' and 'approved' requests are subtracted from the balance.
- Existing data is preserved; this migration only adds functions.
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
         'ID-' || upper(replace(wr.user_id::text, '-', ''))::text,
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

CREATE OR REPLACE FUNCTION public.review_withdrawal_request(p_request_id uuid, p_status text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin') THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  IF p_status NOT IN ('approved', 'rejected') THEN
    RAISE EXCEPTION 'Invalid withdrawal status';
  END IF;

  UPDATE withdrawal_requests
  SET status = p_status
  WHERE withdrawal_requests.id = p_request_id
    AND withdrawal_requests.status = 'pending';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Withdrawal request not found or already reviewed';
  END IF;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_pending_withdrawals() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_pending_withdrawals() TO authenticated;
REVOKE EXECUTE ON FUNCTION public.review_withdrawal_request(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.review_withdrawal_request(uuid, text) TO authenticated;
