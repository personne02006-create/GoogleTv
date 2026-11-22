/*
# Persist withdrawal flow stage

1. New table
- `public.withdrawal_flow_states`
  - `user_id` identifies the signed-in account and is filled from `auth.uid()`.
  - `stage` stores the current withdrawal screen: tax, certification, hosting,
    hosted, fee, or update.
  - `updated_at` records the last progression update.

2. New functions
- `get_withdrawal_flow_state` returns the signed-in user's current stage.
- `set_withdrawal_flow_state` saves a stage and only permits forward movement.
- `clear_withdrawal_flow_state` removes the completed flow state after submission.

3. Security
- Row level security is enabled on the new table.
- Four separate owner-scoped policies cover SELECT, INSERT, UPDATE, and DELETE.
- Browser table access is not granted; the controlled SECURITY DEFINER functions
  are the only application access path.
- Every function derives ownership from `auth.uid()`, uses a fixed search path,
  and is callable only by authenticated users.

4. Important notes
- A saved stage survives navigation, sign-out, and sign-in on the same account.
- The database refuses attempts to move the stage backward.
- Hosting and later stages require a certified account.
- Existing withdrawal requests and user data are preserved.
*/

CREATE TABLE IF NOT EXISTS public.withdrawal_flow_states (
  user_id uuid PRIMARY KEY DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  stage text NOT NULL CHECK (stage IN ('tax', 'certification', 'hosting', 'hosted', 'fee', 'update')),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.withdrawal_flow_states ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own withdrawal flow state" ON public.withdrawal_flow_states;
CREATE POLICY "Users can read own withdrawal flow state"
ON public.withdrawal_flow_states FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create own withdrawal flow state" ON public.withdrawal_flow_states;
CREATE POLICY "Users can create own withdrawal flow state"
ON public.withdrawal_flow_states FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own withdrawal flow state" ON public.withdrawal_flow_states;
CREATE POLICY "Users can update own withdrawal flow state"
ON public.withdrawal_flow_states FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own withdrawal flow state" ON public.withdrawal_flow_states;
CREATE POLICY "Users can delete own withdrawal flow state"
ON public.withdrawal_flow_states FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.get_withdrawal_flow_state()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT stage
  FROM public.withdrawal_flow_states
  WHERE user_id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.set_withdrawal_flow_state(p_stage text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_is_certified boolean;
  v_current_stage text;
  v_current_order integer;
  v_next_order integer;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  IF p_stage NOT IN ('tax', 'certification', 'hosting', 'hosted', 'fee', 'update') THEN
    RAISE EXCEPTION 'Invalid withdrawal flow stage';
  END IF;

  SELECT COALESCE(is_certified, false)
  INTO v_is_certified
  FROM public.profiles
  WHERE id = v_user_id;

  IF p_stage IN ('hosting', 'hosted', 'fee', 'update') AND NOT v_is_certified THEN
    RAISE EXCEPTION 'Account certification required';
  END IF;

  SELECT stage
  INTO v_current_stage
  FROM public.withdrawal_flow_states
  WHERE user_id = v_user_id;

  v_current_order := CASE v_current_stage
    WHEN 'tax' THEN 1
    WHEN 'certification' THEN 2
    WHEN 'hosting' THEN 3
    WHEN 'hosted' THEN 4
    WHEN 'fee' THEN 5
    WHEN 'update' THEN 6
    ELSE 0
  END;

  v_next_order := CASE p_stage
    WHEN 'tax' THEN 1
    WHEN 'certification' THEN 2
    WHEN 'hosting' THEN 3
    WHEN 'hosted' THEN 4
    WHEN 'fee' THEN 5
    WHEN 'update' THEN 6
  END;

  IF v_current_order > v_next_order THEN
    RAISE EXCEPTION 'Withdrawal flow cannot move backward';
  END IF;

  INSERT INTO public.withdrawal_flow_states (user_id, stage, updated_at)
  VALUES (v_user_id, p_stage, now())
  ON CONFLICT (user_id)
  DO UPDATE SET stage = EXCLUDED.stage, updated_at = now();
END;
$$;

CREATE OR REPLACE FUNCTION public.clear_withdrawal_flow_state()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  DELETE FROM public.withdrawal_flow_states
  WHERE user_id = auth.uid();
END;
$$;

REVOKE ALL ON public.withdrawal_flow_states FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_withdrawal_flow_state() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_withdrawal_flow_state() TO authenticated;
REVOKE EXECUTE ON FUNCTION public.set_withdrawal_flow_state(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_withdrawal_flow_state(text) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.clear_withdrawal_flow_state() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.clear_withdrawal_flow_state() TO authenticated;