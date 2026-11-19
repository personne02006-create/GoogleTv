/*
# Restrict profile access to authenticated users

1. Purpose
- Keep registration profiles private while allowing signed-in users to create and view their own record.
- Prevent anonymous browser requests from reaching profile data or attempting profile writes.

2. Modified Tables
- `public.profiles`
  - No columns or rows are removed.
  - Anonymous table privileges are revoked.

3. Security
- Anonymous users cannot SELECT, INSERT, UPDATE, or DELETE profiles.
- Existing authenticated owner policies and restricted write columns remain unchanged.
- Administrator approval functions remain the only path for approval and role changes.

4. Important Notes
- The signup flow authenticates the new account before inserting its profile.
- Existing profile data is preserved.
*/

REVOKE SELECT, INSERT, UPDATE, DELETE ON public.profiles FROM anon;
