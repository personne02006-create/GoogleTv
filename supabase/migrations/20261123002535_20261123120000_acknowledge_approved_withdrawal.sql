/*
# Auto-hide approved withdrawal message after two minutes

1. Modified tables
- `public.withdrawal_requests`
  - New column `acknowledged_at` (timestamptz) records when the owner first saw
    the "Votre retrait a été effectué avec succès" screen.

2. New functions
- `acknowledge_withdrawal_approval(p_request_id uuid)`
  - Marks an approved withdrawal as seen by its owner (first call wins).
  - Only affects the signed-in user's own approved request; safe to call again.

3. Security
- No direct browser write access is added; the new SECURITY DEFINER function is
  the only way to set `acknowledged_at`.
- The function derives the caller from `auth.uid()`, uses a fixed search path,
  and is callable only by authenticated users.

4. Important notes
- The success message now stops displaying two minutes after it is first shown,
  and it never comes back afterwards.
- Existing requests, statuses, balances, and the dismissal flag are untouched.
*/

ALTER TABLE public.withdrawal_requests ADD COLUMN IF NOT EXISTS acknowledged_at timestamptz;

CREATE OR REPLACE FUNCTION public.acknowledge_withdrawal_approval(p_request_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  UPDATE public.withdrawal_requests
  SET acknowledged_at = COALESCE(acknowledged_at, now())
  WHERE id = p_request_id
    AND user_id = auth.uid()
    AND status = 'approved';
END;
$$;

REVOKE EXECUTE ON FUNCTION public.acknowledge_withdrawal_approval(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.acknowledge_withdrawal_approval(uuid) TO authenticated;