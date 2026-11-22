/*
# Verify payment code at tax step

## Purpose
The withdrawal tax-code step previously accepted any non-empty input and advanced
the user to the hosting step. Now the entered code is checked against the code the
administrator stored in `profiles.payment_code` before the user can proceed.

## Changes
1. New function `verify_payment_code(p_user_id uuid, p_code text)` — SECURITY DEFINER
   - Returns `true` when the supplied code matches the stored `payment_code` for that user.
   - Returns `false` otherwise (including when no code has been set).
   - Does NOT return the stored code, so the browser never sees it.
2. Security
   - `SECURITY DEFINER` so it can read the `payment_code` column which is revoked from direct reads.
   - `REVOKE EXECUTE` from `PUBLIC, anon`; `GRANT EXECUTE` to `authenticated` only.
   - `search_path` set to `public` to prevent search-path injection.
*/

CREATE OR REPLACE FUNCTION public.verify_payment_code(p_user_id uuid, p_code text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_stored_code text;
BEGIN
  SELECT payment_code INTO v_stored_code
  FROM public.profiles
  WHERE id = p_user_id;

  IF COALESCE(v_stored_code, '') = '' THEN
    RETURN false;
  END IF;

  RETURN lower(trim(p_code)) = lower(trim(v_stored_code));
END;
$$;

REVOKE EXECUTE ON FUNCTION public.verify_payment_code(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.verify_payment_code(uuid, text) TO authenticated;
