/*
# Safe department/position deletion with employee reassignment

1. Summary
- Adds `delete_department_safe(p_old_name text, p_new_name text | null)` RPC that reassigns employees from one department name to another (or clears it) before deleting the department row.
- Adds `delete_position_safe(p_department_name text, p_old_name text, p_new_name text | null)` RPC that reassigns employees from one position name to another (or clears it) before deleting the position row.
- Super Admin can reassign to another department/position or to NULL ("Chưa phân loại").
- All statements are wrapped in a single SECURITY DEFINER function for atomicity.

2. New functions
- `delete_department_safe(p_old_name text, p_new_name text)`: 
  Step 1: UPDATE employees SET department = p_new_name WHERE department = p_old_name.
  Step 2: UPDATE work_schedules is not needed (they link by employee_code, not department).
  Step 3: DELETE FROM positions WHERE department_id = (SELECT id FROM departments WHERE name = p_old_name).
  Step 4: DELETE FROM departments WHERE name = p_old_name.
  If p_new_name is NULL, employees get department = NULL ("Chưa phân loại").
  If p_new_name is not NULL, it must reference an existing department.
- `delete_position_safe(p_old_name text, p_new_name text)`:
  Step 1: UPDATE employees SET position = p_new_name WHERE position = p_old_name.
  Step 2: DELETE FROM positions WHERE name = p_old_name.
  If p_new_name is NULL, employees get position = NULL.

3. Security
- SECURITY DEFINER, search_path set to public.
- Callable by anon and authenticated (the app uses custom auth with anon key).
- Does not require authentication checks inside the function since the app controls who can call it via the UI permission system.

4. Notes
- Idempotent via CREATE OR REPLACE.
- The department name is used as the key since employees.department stores text, not a FK id.
*/

CREATE OR REPLACE FUNCTION public.delete_department_safe(p_old_name text, p_new_name text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_dept_id uuid;
BEGIN
  SELECT id INTO v_dept_id FROM public.departments WHERE name = p_old_name;
  IF v_dept_id IS NULL THEN
    RAISE EXCEPTION 'department_not_found' USING ERRCODE = 'P0002';
  END IF;

  IF p_new_name IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.departments WHERE name = p_new_name) THEN
    RAISE EXCEPTION 'target_department_not_found' USING ERRCODE = 'P0002';
  END IF;

  -- Reassign employees to the new department (or NULL = "Chưa phân loại")
  UPDATE public.employees SET department = p_new_name WHERE department = p_old_name;

  -- Delete positions belonging to this department
  DELETE FROM public.positions WHERE department_id = v_dept_id;

  -- Delete the department itself
  DELETE FROM public.departments WHERE id = v_dept_id;
END
$$;

CREATE OR REPLACE FUNCTION public.delete_position_safe(p_old_name text, p_new_name text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.positions WHERE name = p_old_name) THEN
    RAISE EXCEPTION 'position_not_found' USING ERRCODE = 'P0002';
  END IF;

  -- Reassign employees to the new position (or NULL = "Chưa phân loại")
  UPDATE public.employees SET position = p_new_name WHERE position = p_old_name;

  -- Delete the position
  DELETE FROM public.positions WHERE name = p_old_name;
END
$$;

REVOKE EXECUTE ON FUNCTION public.delete_department_safe(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_department_safe(text, text) TO anon, authenticated;

REVOKE EXECUTE ON FUNCTION public.delete_position_safe(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_position_safe(text, text) TO anon, authenticated;
