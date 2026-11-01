import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ShiftCode } from '@/config/schedule';
import { toDateKey } from '@/features/attendance/attendanceRules';
import { useSession, useViewerRole } from '@/features/auth/AuthProvider';
import { useRoles } from '@/features/permissions/useRoles';
import { SUPER_ADMIN_ROLE_KEY } from '@/features/permissions/permissionRules';
import {
  addDays,
  getWeekDates,
  getWeekStart,
  type Employee,
  type ScheduleEntry,
} from '@/features/schedule/scheduleRules';
import {
  fetchEmployees,
  fetchSchedules,
  upsertShiftAssignments,
  type EmployeeFilter,
} from '@/features/schedule/scheduleService';

export type DepartmentFilter = 'all' | string;

export function useWeeklySchedule() {
  const session = useSession();
  const { roleKey } = useViewerRole();
  const roles = useRoles();
  const { account, hotel } = session;
  const hotelId = hotel.id;

  const isSuperAdmin = account.roleKey === SUPER_ADMIN_ROLE_KEY;
  const viewerRole = roles.data?.find((role) => role.key === roleKey) ?? null;
  const dataScope = viewerRole?.dataScope ?? null;

  const employeeFilter: EmployeeFilter = isSuperAdmin
    ? {}
    : { hotelId, employeeCode: account.employeeCode };

  const isStaff = !isSuperAdmin && dataScope === 'self' && !!account.employeeCode;

  const [weekStart, setWeekStart] = useState(() => getWeekStart(new Date()));
  const [department, setDepartment] = useState<DepartmentFilter>('all');
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [schedules, setSchedules] = useState<ScheduleEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const weekDates = useMemo(() => getWeekDates(weekStart), [weekStart]);

  const reload = useCallback(async () => {
    setIsLoading(true);
    try {
      const employeeList = await fetchEmployees(employeeFilter);
      const employeeCodes = employeeList.map((e) => e.code);
      const scheduleList = await fetchSchedules(
        toDateKey(weekStart),
        toDateKey(addDays(weekStart, 6)),
        isSuperAdmin ? null : employeeCodes,
      );
      setEmployees(employeeList);
      setSchedules(scheduleList);
      setError(null);
    } catch {
      setError('Không thể tải lịch làm việc. Vui lòng thử lại.');
    } finally {
      setIsLoading(false);
    }
  }, [weekStart, employeeFilter, isSuperAdmin]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const visibleEmployees = useMemo(
    () => (department === 'all' ? employees : employees.filter((item) => item.department === department)),
    [employees, department]
  );

  const scheduleByKey = useMemo(() => {
    const map = new Map<string, ScheduleEntry>();
    for (const entry of schedules) {
      map.set(`${entry.employeeCode}|${entry.workDate}`, entry);
    }
    return map;
  }, [schedules]);

  const saveShift = useCallback(
    async (employeeCode: string, workDate: string, shiftCode: ShiftCode) => {
      await upsertShiftAssignments([{ employeeCode, workDate, shiftCode }]);
      await reload();
    },
    [reload]
  );

  const shiftWeek = useCallback((days: number) => {
    setWeekStart((current) => addDays(current, days));
  }, []);

  const goToCurrentWeek = useCallback(() => {
    setWeekStart(getWeekStart(new Date()));
  }, []);

  return {
    weekStart,
    weekDates,
    shiftWeek,
    goToCurrentWeek,
    department,
    setDepartment,
    employees,
    visibleEmployees,
    scheduleByKey,
    isLoading,
    error,
    reload,
    saveShift,
    isStaff,
  };
}
