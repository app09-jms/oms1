/*
# Employee delete with soft-delete fallback and Super Admin cascade

1. New Function: delete_employee_profile(p_token, p_code, p_force)
   - Returns 'deleted', 'resigned', or 'has_data'
2. Security: session-checked, SECURITY DEFINER, EXECUTE granted to anon/authenticated
3. Revokes direct DELETE on employees so removal goes through this function
*/

CREATE OR REPLACE FUNCTION public.delete_employee_profile(p_token text, p_code text, p_force boolean DEFAULT false)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
v_caller public.app_users%ROWTYPE;
v_emp public.employees%ROWTYPE;
v_account_uid text;
v_has_data boolean;
BEGIN
SELECT * INTO v_caller FROM public.app_session_user(p_token);
IF v_caller.system_uid IS NULL OR v_caller.role NOT IN ('super_admin', 'admin', 'mod') THEN
RAISE EXCEPTION 'unauthorized' USING ERRCODE = '42501';
END IF;

SELECT * INTO v_emp FROM public.employees WHERE code = p_code;
IF v_emp.system_uid IS NULL THEN
RAISE EXCEPTION 'not_found' USING ERRCODE = 'P0002';
END IF;

IF v_caller.role <> 'super_admin' AND NOT EXISTS (
SELECT 1 FROM public.app_user_hotels
WHERE app_user_system_uid = v_caller.system_uid AND hotel_id = v_emp.hotel_id
) THEN
RAISE EXCEPTION 'forbidden_hotel' USING ERRCODE = '42501';
END IF;

SELECT system_uid INTO v_account_uid FROM public.app_users WHERE employee_system_uid = v_emp.system_uid;

v_has_data := EXISTS (
SELECT 1 FROM public.attendance_records
WHERE employee_code = p_code OR app_user_system_uid = v_account_uid
)
OR EXISTS (SELECT 1 FROM public.work_schedules WHERE employee_code = p_code)
OR EXISTS (SELECT 1 FROM public.leave_carryovers WHERE employee_code = p_code)
OR EXISTS (SELECT 1 FROM public.payroll_adjustments WHERE employee_code = p_code)
OR EXISTS (SELECT 1 FROM public.payroll_locked_summaries WHERE employee_code = p_code);

IF v_has_data AND v_caller.role = 'super_admin' AND NOT p_force THEN
RETURN 'has_data';
END IF;

IF v_has_data AND v_caller.role <> 'super_admin' THEN
UPDATE public.employees SET employment_status = 'resigned' WHERE system_uid = v_emp.system_uid;
UPDATE public.app_users SET is_active = false WHERE system_uid = v_account_uid;
RETURN 'resigned';
END IF;

IF v_has_data THEN
DELETE FROM public.attendance_records
WHERE employee_code = p_code OR app_user_system_uid = v_account_uid;
DELETE FROM public.work_schedules WHERE employee_code = p_code;
DELETE FROM public.leave_carryovers WHERE employee_code = p_code;
DELETE FROM public.payroll_adjustments WHERE employee_code = p_code;
DELETE FROM public.payroll_locked_summaries WHERE employee_code = p_code;
END IF;

DELETE FROM public.app_users WHERE system_uid = v_account_uid;
DELETE FROM public.employees WHERE system_uid = v_emp.system_uid;
RETURN 'deleted';
END
$function$;

REVOKE EXECUTE ON FUNCTION public.delete_employee_profile(text, text, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_employee_profile(text, text, boolean) TO anon, authenticated;

REVOKE DELETE ON public.employees FROM anon, authenticated;
DROP POLICY IF EXISTS "anon_delete_employees" ON public.employees;