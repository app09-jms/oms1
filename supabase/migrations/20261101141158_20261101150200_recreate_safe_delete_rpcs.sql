/*
# Recreate delete_department_safe and delete_position_safe with clearer NULL handling

1. Context
- Both functions already accept p_new_name text which can be NULL (meaning "Chưa phân loại").
- The NOT NULL constraint on employees.department/employees.position has been dropped in the previous migration.
- These recreated functions keep the same signature and logic, with updated comments documenting the NULL = unassigned behavior.

2. Changes
- Recreate delete_department_safe(p_old_name text, p_new_name text)
- Recreate delete_position_safe(p_old_name text, p_new_name text)
- Both: when p_new_name IS NULL, employees are set to NULL (unassigned). When not NULL, they are reassigned by name match.

3. Security
- No RLS or policy changes. Functions remain callable by anon (app uses custom auth under anon role).
*/