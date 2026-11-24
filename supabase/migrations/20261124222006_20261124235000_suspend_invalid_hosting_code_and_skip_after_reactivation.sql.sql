/*
# Suspend accounts after an invalid hosting code

1. Purpose
- Suspends a user immediately when the hosting code is incorrect.
- Reuses the existing suspended-account screen shown by the application.
- Lets only an administrator reactivate the account.
- After administrator reactivation, permanently skips the hosting-code step for that account and continues the withdrawal flow at the next stage.

2. Modified table
- `public.profiles`
  - Adds `hosting_code_bypassed`, a protected flag indicating that the administrator has cleared the hosting-code step after account reactivation.
  - The flag defaults to false for all existing and new accounts.
  - The browser cannot update this flag directly.

3. New functions
- `suspend_current_user_for_invalid_hosting_code()` suspends only the currently signed-in user and records no administrator as the suspending actor.
- `has_hosting_code_bypass()` reports the current user's protected hosting-step status.

4. Modified function
- `set_profile_suspension` remains administrator-only.
- When an administrator reactivates a user, it records the hosting step as bypassed.
- Suspension and reactivation continue to update the existing suspension fields.

5. Security
- Account suspension and the hosting bypass are server-controlled.
- The new functions use `auth.uid()` and a fixed search path.
- Anonymous execution is revoked; authenticated execution is granted only to the intended application paths.
- No user can reactivate an account through the browser or target another account with the self-suspension function.

6. Important notes
- No profiles, videos, withdrawals, or existing account data are deleted.
- Existing accounts remain active and keep the hosting step until an administrator reactivates them after suspension.
- The existing administrator suspension control is preserved.
*/

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS hosting_code_bypassed boolean NOT NULL DEFAULT false;

REVOKE UPDATE (hosting_code_bypassed) ON public.profiles FROM authenticated;

CREATE OR REPLACE FUNCTION public.suspend_current_user_for_invalid_hosting_code()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  UPDATE public.profiles
  SET suspended_at = now(),
      suspended_by = NULL,
      hosting_code_bypassed = false
  WHERE id = auth.uid()
    AND role = 'user';
END;
$$;

CREATE OR REPLACE FUNCTION public.has_hosting_code_bypass()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(hosting_code_bypassed, false)
  FROM public.profiles
  WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.set_profile_suspension(p_user_id uuid, p_suspended boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  UPDATE public.profiles
  SET suspended_at = CASE WHEN p_suspended THEN now() ELSE NULL END,
      suspended_by = CASE WHEN p_suspended THEN auth.uid() ELSE NULL END,
      hosting_code_bypassed = CASE WHEN p_suspended THEN hosting_code_bypassed ELSE true END
  WHERE profiles.id = p_user_id
    AND profiles.role = 'user';
END;
$$;

REVOKE EXECUTE ON FUNCTION public.suspend_current_user_for_invalid_hosting_code() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.suspend_current_user_for_invalid_hosting_code() TO authenticated;
REVOKE EXECUTE ON FUNCTION public.has_hosting_code_bypass() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_hosting_code_bypass() TO authenticated;
REVOKE EXECUTE ON FUNCTION public.set_profile_suspension(uuid, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_profile_suspension(uuid, boolean) TO authenticated;
