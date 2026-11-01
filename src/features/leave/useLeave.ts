import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  applyLeaveFilters,
  buildLeaveKpis,
  buildLeaveRows,
  getYearRange,
  type LeaveFilters,
  type RolloverMode,
} from '@/features/leave/leaveRules';
import {
  fetchCarryOverByCode,
  fetchRolloverRecord,
  runLeaveRollover,
  type RolloverRecord,
} from '@/features/leave/leaveService';
import { fetchEmployees, fetchSchedules, type EmployeeFilter } from '@/features/schedule/scheduleService';
import { useSession, useViewerRole } from '@/features/auth/AuthProvider';
import { useRoles } from '@/features/permissions/useRoles';
import { SUPER_ADMIN_ROLE_KEY } from '@/features/permissions/permissionRules';
import type { Employee, ScheduleEntry } from '@/features/schedule/scheduleRules';

interface YearData {
  employees: Employee[];
  schedules: ScheduleEntry[];
  carryOverByCode: Map<string, number>;
  rollover: RolloverRecord | null;
}

export function useLeave(year: number, filters: LeaveFilters) {
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

  const [data, setData] = useState<YearData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isRolling, setIsRolling] = useState(false);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    const range = getYearRange(year);
    try {
      const employeeList = await fetchEmployees(employeeFilter);
      const employeeCodes = employeeList.map((e) => e.code);
      const [schedules, carryOverByCode, rollover] = await Promise.all([
        fetchSchedules(range.from, range.to, isSuperAdmin ? null : employeeCodes),
        fetchCarryOverByCode(year),
        fetchRolloverRecord(year),
      ]);
      setData({ employees: employeeList, schedules, carryOverByCode, rollover });
      setLoadError(null);
    } catch {
      setLoadError('Không thể tải sổ phép. Vui lòng thử lại.');
    } finally {
      setIsLoading(false);
    }
  }, [year, employeeFilter, isSuperAdmin]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const allRows = useMemo(
    () => (data ? buildLeaveRows(data.employees, data.schedules, data.carryOverByCode, year) : []),
    [data, year]
  );
  const rows = useMemo(() => applyLeaveFilters(allRows, filters), [allRows, filters]);
  const kpis = useMemo(() => buildLeaveKpis(rows), [rows]);

  async function rollover(mode: RolloverMode): Promise<boolean> {
    setIsRolling(true);
    setActionError(null);
    try {
      await runLeaveRollover(year, mode);
      await refresh();
      return true;
    } catch {
      setActionError('Không thể chốt sổ phép. Vui lòng thử lại.');
      return false;
    } finally {
      setIsRolling(false);
    }
  }

  return {
    rows,
    kpis,
    totalCount: allRows.length,
    lastRollover: data?.rollover ?? null,
    isLoading,
    loadError,
    actionError,
    isRolling,
    runRollover: rollover,
  };
}
