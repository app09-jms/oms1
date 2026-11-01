DROP FUNCTION IF EXISTS public.delete_department_safe(text, text);
DROP FUNCTION IF EXISTS public.delete_position_safe(text, text);

CREATE FUNCTION public.delete_department_safe(p_old_name text, p_new_name text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
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

  -- Reassign employees: p_new_name = NULL means "Chưa phân loại" (unassigned)
  UPDATE public.employees SET department = p_new_name WHERE department = p_old_name;

  -- Delete positions belonging to this department
  DELETE FROM public.positions WHERE department_id = v_dept_id;

  -- Delete the department itself
  DELETE FROM public.departments WHERE id = v_dept_id;
END;
$$;

CREATE FUNCTION public.delete_position_safe(p_old_name text, p_new_name text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.positions WHERE name = p_old_name) THEN
    RAISE EXCEPTION 'position_not_found' USING ERRCODE = 'P0002';
  END IF;

  -- Reassign employees: p_new_name = NULL means "Chưa phân loại" (unassigned)
  UPDATE public.employees SET position = p_new_name WHERE position = p_old_name;

  -- Delete the position
  DELETE FROM public.positions WHERE name = p_old_name;
END;
$$;