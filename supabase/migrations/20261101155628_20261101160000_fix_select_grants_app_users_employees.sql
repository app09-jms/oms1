/*
# Fix missing SELECT grants on app_users and employees

1. Context
- app_users has an RLS policy allowing SELECT for anon/authenticated (USING true), but the GRANT only includes INSERT/UPDATE/DELETE.
  Without a SELECT grant, the anon role cannot read the table at all — this causes the 404 error on the User Management page.
- employees had SELECT revoked by the scope_employee_sensitive_data migration, then re-granted on specific non-sensitive columns.
  However, the grant statement may not have taken effect or was overwritten. The User Management page needs to read
  system_uid, code, full_name, and department from employees to populate the employee dropdown.

2. Changes
- GRANT SELECT on app_users TO anon, authenticated (the RLS policy already allows all rows).
- GRANT SELECT on the non-sensitive columns of employees TO anon, authenticated (matching the existing restricted column list).
*/

GRANT SELECT ON public.app_users TO anon, authenticated;
GRANT SELECT (
  system_uid, code, full_name, display_name, department, position, probation_date, official_date,
  employment_status, phone, email, has_account, app_user_system_uid, leave_tracking,
  initial_leave_days, hotel_id, auth_user_id, created_at
) ON public.employees TO anon, authenticated;