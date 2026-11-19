/*
# Add account approval workflow and secure administration

1. Modified Tables
   - `profiles`
     - `approval_status` (text, defaults to `pending`) controls access after registration.
     - `role` (text, defaults to `user`) identifies administrators without trusting browser input.
     - `approved_at` (timestamp) records when access was approved.
     - `approved_by` (uuid) records the administrator who approved the account.

2. Security
   - User inserts and updates are limited to personal registration fields.
   - Approval status, role, approval timestamps, and approver identity cannot be changed by the browser.
   - Add a security-definer function for administrators to list pending requests.
   - Add a security-definer function for administrators to approve or reject a request.
   - Both functions check the caller's server-side `profiles.role` value and are unavailable to anonymous users.

3. Important Notes
   - New registrations remain pending until an administrator approves them.
   - Approved accounts are still redirected to the preparation screen required by the product flow.
   - No existing rows are deleted.
*/

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS approval_status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'user',
  ADD COLUMN IF NOT EXISTS approved_at timestamptz,
  ADD COLUMN IF NOT EXISTS approved_by uuid REFERENCES auth.users(id);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'profiles_approval_status_check') THEN
    ALTER TABLE profiles ADD CONSTRAINT profiles_approval_status_check CHECK (approval_status IN ('pending', 'approved', 'rejected'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'profiles_role_check') THEN
    ALTER TABLE profiles ADD CONSTRAINT profiles_role_check CHECK (role IN ('user', 'admin'));
  END IF;
END $$;

REVOKE INSERT, UPDATE ON profiles FROM authenticated;
GRANT INSERT (id, first_name, last_name, email, phone, country, city, account_type, birth_date, gender, referral_code) ON profiles TO authenticated;
GRANT UPDATE (first_name, last_name, email, phone, country, city, account_type, birth_date, gender, referral_code) ON profiles TO authenticated;

CREATE OR REPLACE FUNCTION public.get_pending_profiles()
RETURNS TABLE (
  id uuid,
  first_name text,
  last_name text,
  email text,
  country text,
  city text,
  account_type text,
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
  SELECT profiles.id, profiles.first_name, profiles.last_name, profiles.email, profiles.country, profiles.city, profiles.account_type, profiles.created_at
  FROM profiles
  WHERE profiles.approval_status = 'pending'
  ORDER BY profiles.created_at ASC;
END;
$$;

CREATE OR REPLACE FUNCTION public.approve_profile(p_user_id uuid, p_status text)
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
    RAISE EXCEPTION 'Invalid status';
  END IF;

  UPDATE profiles
  SET approval_status = p_status,
      approved_at = CASE WHEN p_status = 'approved' THEN now() ELSE NULL END,
      approved_by = auth.uid()
  WHERE profiles.id = p_user_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_pending_profiles() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_pending_profiles() TO authenticated;
REVOKE EXECUTE ON FUNCTION public.approve_profile(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.approve_profile(uuid, text) TO authenticated;
