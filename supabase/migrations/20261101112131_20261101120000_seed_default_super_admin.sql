/*
# Ensure default Super Admin account exists with password 000

1. Summary
- Ensures the default Super Admin account (username "jenius", password "000") exists and is active.
- If the account already exists, its password is reset to "000" and is_active is set to true.
- If it does not exist, it is created with the super_admin role.
- Idempotent and safe to re-run.

2. Changes
- Upserts into app_users where username = 'jenius'.
- Sets password_hash using bcrypt (extensions.crypt with gen_salt('bf')).
- Ensures role = 'super_admin', is_active = true.

3. Notes
- Uses ON CONFLICT (username) DO UPDATE since username has a unique constraint.
- Password "000" is shorter than the 6-char minimum enforced by change_app_user_password,
  but this is a seed/admin-level operation that bypasses that check intentionally.
*/

INSERT INTO public.app_users (username, full_name, role, is_active, password_hash)
VALUES (
  'jenius',
  'Super Admin',
  'super_admin',
  true,
  extensions.crypt('000', extensions.gen_salt('bf'))
)
ON CONFLICT (username) DO UPDATE
SET
  password_hash = extensions.crypt('000', extensions.gen_salt('bf')),
  role = 'super_admin',
  is_active = true;
