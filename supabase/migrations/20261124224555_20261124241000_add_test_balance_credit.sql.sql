/*
# Add an isolated test balance credit

1. Purpose
- Adds a server-controlled test credit that can be used for validating the withdrawal code flow.
- Keeps the normal video rewards and activity history unchanged.

2. Modified table
- `public.profiles`
  - Adds `test_balance_xof`, a numeric XOF amount reserved for controlled test accounts.
  - Defaults to zero for every account.
  - The application adds this amount to the account's available balance without changing video statistics.

3. Security
- The test credit is readable only through the existing owner-scoped profile access.
- Authenticated users cannot update the test credit through the browser because the column is excluded from their profile update privileges.
- Only an explicitly authorized database operation can assign a test credit.

4. Important notes
- No account, activity, withdrawal, or video record is deleted or rewritten.
- Existing accounts remain unchanged because the new value defaults to zero.
- This migration creates the storage field only; the test account grant is applied separately to the identifier requested for testing.
*/

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS test_balance_xof numeric NOT NULL DEFAULT 0;

REVOKE UPDATE (test_balance_xof) ON public.profiles FROM authenticated;
