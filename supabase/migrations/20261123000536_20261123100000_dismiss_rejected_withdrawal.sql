/*
# Remember dismissed rejected withdrawals

1. Modified table
- `public.withdrawal_requests`
  - Adds `dismissed_at`, which records when the owner hides a rejected withdrawal.
  - Existing withdrawal amounts, statuses, and user data are preserved.

2. New function
- `dismiss_withdrawal_request` marks one rejected withdrawal as dismissed.
  - It derives the account from `auth.uid()`.
  - It only changes a rejected request belonging to that account.
  - It does nothing to pending or approved requests.

3. Security
- The browser still has no direct UPDATE privilege on withdrawal requests.
- The mutation is performed by a SECURITY DEFINER function with a fixed search path.
- Anonymous and public execution are revoked; only authenticated users can call it.

4. Important notes
- After the user presses “Réessayer”, the rejected message stays hidden when they visit Accueil, Vidéo, Profil, or return to Retrait.
- The existing administrator review functions continue to work because the new column is optional and does not alter existing statuses.
*/

ALTER TABLE public.withdrawal_requests
ADD COLUMN IF NOT EXISTS dismissed_at timestamptz;

CREATE OR REPLACE FUNCTION public.dismiss_withdrawal_request(p_request_id uuid)
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
  SET dismissed_at = now()
  WHERE id = p_request_id
    AND user_id = auth.uid()
    AND status = 'rejected'
    AND dismissed_at IS NULL;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.dismiss_withdrawal_request(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.dismiss_withdrawal_request(uuid) TO authenticated;