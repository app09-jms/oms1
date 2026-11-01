import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  decideAttendanceAdjustment,
  fetchAttendanceHistory,
} from '@/features/attendance/attendanceService';
import type { AttendanceRecord, DateRange } from '@/features/attendance/attendanceRules';
import { fetchEmployees, type EmployeeFilter } from '@/features/schedule/scheduleService';
import { useSession, useViewerRole } from '@/features/auth/AuthProvider';
import { useRoles } from '@/features/permissions/useRoles';
import { SUPER_ADMIN_ROLE_KEY } from '@/features/permissions/permissionRules';
import type { AttendanceScope } from '@/features/attendance/attendanceRules';
import type { Employee } from '@/features/schedule/scheduleRules';
import {
  buildTimesheetRows,
  filterTimesheetRows,
  getQuickRange,
  type QuickRangePreset,
  type TimesheetFilters,
  type TimesheetRow,
} from '@/features/timesheet/timesheetRules';

const DEFAULT_FILTERS: TimesheetFilters = { department: 'all', status: 'all', search: '' };

export function useTimesheet() {
  const session = useSession();
  const { roleKey } = useViewerRole();
  const roles = useRoles();
  const { account, hotel } = session;
  const hotelId = hotel.id;
  const [range, setRange] = useState<DateRange>(() => getQuickRange('this-month'));
  const [filters, setFilters] = useState<TimesheetFilters>(DEFAULT_FILTERS);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [decidingId, setDecidingId] = useState<string | null>(null);
  const [decisionError, setDecisionError] = useState<string | null>(null);

  const isSuperAdmin = account.roleKey === SUPER_ADMIN_ROLE_KEY;
  const viewerRole = roles.data?.find((role) => role.key === roleKey) ?? null;
  const dataScope = viewerRole?.dataScope ?? null;
  const viewerDepartmentsKey = viewerRole?.departments.join('|') ?? '';

  const attendanceScope = useMemo<AttendanceScope>(
    () =>
      isSuperAdmin || dataScope === 'hotel'
        ? { kind: 'hotel' }
        : dataScope === 'department'
          ? { kind: 'department', departments: viewerDepartmentsKey ? viewerDepartmentsKey.split('|') : [] }
          : { kind: 'self', systemUid: account.systemUid },
    [isSuperAdmin, dataScope, viewerDepartmentsKey, account.systemUid],
  );

  const employeeFilter = useMemo<EmployeeFilter>(
    () => (isSuperAdmin ? {} : { hotelId, employeeCode: account.employeeCode }),
    [isSuperAdmin, hotelId, account.employeeCode],
  );

  const refresh = useCallback(async () => {
    setIsLoading(true);
    try {
      const [rows, employeeList] = await Promise.all([
        fetchAttendanceHistory(hotelId, attendanceScope, range),
        fetchEmployees(employeeFilter),
      ]);
      setRecords(rows);
      setEmployees(employeeList);
      setLoadError(null);
    } catch {
      setLoadError('Không thể tải bảng chấm công. Vui lòng thử lại.');
    } finally {
      setIsLoading(false);
    }
  }, [range, hotelId, attendanceScope, employeeFilter]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const allRows = useMemo<TimesheetRow[]>(() => buildTimesheetRows(records, employees), [records, employees]);
  const rows = useMemo(() => filterTimesheetRows(allRows, filters), [allRows, filters]);
  const pendingRows = useMemo(() => rows.filter((row) => row.status === 'pending'), [rows]);

  const decide = useCallback(
    async (recordId: string, decision: 'approved' | 'rejected'): Promise<boolean> => {
      setDecidingId(recordId);
      setDecisionError(null);
      try {
        await decideAttendanceAdjustment(recordId, decision);
        await refresh();
        return true;
      } catch {
        setDecisionError('Không thể cập nhật đề xuất. Vui lòng thử lại.');
        return false;
      } finally {
        setDecidingId(null);
      }
    },
    [refresh]
  );

  const applyQuickRange = useCallback((preset: QuickRangePreset) => {
    setRange(getQuickRange(preset));
  }, []);

  return {
    range,
    setRange,
    applyQuickRange,
    filters,
    setFilters,
    rows,
    pendingRows,
    isLoading,
    loadError,
    decidingId,
    decisionError,
    decide,
  };
}
