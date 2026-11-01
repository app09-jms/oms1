/*
# Scope employee personal data behind a session-checked RPC

1. New function: list_employee_profiles(p_token, p_hotel_id)
   - super_admin: all hotels (or filtered by p_hotel_id)
   - staff: only own linked record
   - other roles: employees in hotels linked via app_user_hotels
2. Modified grants: revoke table-wide SELECT, grant SELECT on non-sensitive columns only
3. Sensitive columns (citizen_id, citizen_id_issued_date, citizen_id_issued_place, permanent_address) only readable through the RPC
*/

CREATE OR REPLACE FUNCTION public.list_employee_profiles(p_token text, p_hotel_id uuid DEFAULT NULL)
RETURNS SETOF public.employees
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  v_caller public.app_users%ROWTYPE;
BEGIN
  SELECT * INTO v_caller FROM public.app_session_user(p_token);
  IF v_caller.system_uid IS NULL THEN
    RAISE EXCEPTION 'unauthorized' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT e.*
  FROM public.employees e
  WHERE (p_hotel_id IS NULL OR e.hotel_id = p_hotel_id)
    AND (
      v_caller.role = 'super_admin'
      OR (v_caller.role = 'staff' AND e.app_user_system_uid = v_caller.system_uid)
      OR (
        v_caller.role <> 'staff'
        AND EXISTS (
          SELECT 1
          FROM public.app_user_hotels h
          WHERE h.app_user_system_uid = v_caller.system_uid
            AND h.hotel_id = e.hotel_id
        )
      )
    )
  ORDER BY e.code;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.list_employee_profiles(text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_employee_profiles(text, uuid) TO anon, authenticated;

REVOKE SELECT ON public.employees FROM anon, authenticated;
GRANT SELECT (
  system_uid, code, full_name, display_name, department, position, probation_date, official_date,
  employment_status, phone, email, has_account, app_user_system_uid, leave_tracking,
  initial_leave_days, hotel_id, auth_user_id, created_at
) ON public.employees TO anon, authenticated;