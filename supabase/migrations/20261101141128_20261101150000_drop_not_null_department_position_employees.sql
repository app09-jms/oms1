/*
# Drop NOT NULL constraint on employees.department and employees.position

1. Context
- The `employees` table stores `department` and `position` as TEXT columns (matching `departments.name` and `positions.name`).
- Both columns were created NOT NULL.
- The RPC `delete_department_safe` reassigns employees to a new department by name, or to NULL when the user picks "Chưa phân loại" (unassigned).
- Setting these columns to NULL violates the NOT NULL constraint, producing error code 23502.

2. Changes
- `employees.department`: ALTER to allow NULL (drop NOT NULL).
- `employees.position`: ALTER to allow NULL (drop NOT NULL).
- Set default to NULL for both columns so inserts that omit them don't fail.

3. RPC updates
- `delete_department_safe`: when `p_new_name` is NULL, set employees.department = NULL (no longer blocked by constraint).
- `delete_position_safe`: when `p_new_name` is NULL, set employees.position = NULL (no longer blocked by constraint).
- Both functions are recreated with the same signature (p_old_name text, p_new_name text) but updated body comments clarifying the NULL = unassigned behavior.

4. Security
- No RLS or policy changes. No new tables. No grants or revokes.
- Functions remain callable by anon (same as before) since the app uses custom auth under the anon role.
*/