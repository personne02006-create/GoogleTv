/*
# Remove direct profile insertion

1. Modified Table
- `public.profiles`
  - Authenticated clients no longer receive direct INSERT permission.
  - Existing profile records and all readable columns remain unchanged.

2. Security
- Standard registration must use `register_user_profile`.
- Administrator registration must use `register_admin_profile`.
- Both server functions validate the referral code and control role and approval status.

3. Important Notes
- No rows are deleted.
- Existing profile updates and owner reads continue to use their existing policies.
*/

REVOKE INSERT ON public.profiles FROM authenticated;
