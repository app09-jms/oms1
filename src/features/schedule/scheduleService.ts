import { supabase } from '@/lib/supabase';
import { SHIFT_CODES, type ShiftCode } from '@/config/schedule';
import type { CheckStatus, Employee, ScheduleEntry } from '@/features/schedule/scheduleRules';

interface EmployeeRow {
  code: string;
  full_name: string;
  department: string | null;
  position: string | null;
}

interface ScheduleRow {
  id: string;
  employee_code: string;
  work_date: string;
  shift_code: string;
  check_status: string;
  requested_shift_code: string | null;
  adjustment_reason: string | null;
}

const CHECK_STATUSES: CheckStatus[] = ['on_shift', 'mismatch', 'pending_adjustment', 'adjusted'];

function isShiftCode(value: unknown): value is ShiftCode {
  return typeof value === 'string' && (SHIFT_CODES as string[]).includes(value);
}

function isEmployeeRow(value: unknown): value is EmployeeRow {
  if (typeof value !== 'object' || value === null) return false;
  const row = value as Record<string, unknown>;
  return (
    typeof row.code === 'string' &&
    typeof row.full_name === 'string' &&
    (typeof row.department === 'string' || row.department === null) &&
    (typeof row.position === 'string' || row.position === null)
  );
}

function isScheduleRow(value: unknown): value is ScheduleRow {
  if (typeof value !== 'object' || value === null) return false;
  const row = value as Record<string, unknown>;
  return (
    typeof row.id === 'string' &&
    typeof row.employee_code === 'string' &&
    typeof row.work_date === 'string' &&
    isShiftCode(row.shift_code) &&
    typeof row.check_status === 'string' &&
    (CHECK_STATUSES as string[]).includes(row.check_status) &&
    (row.requested_shift_code === null || isShiftCode(row.requested_shift_code)) &&
    (row.adjustment_reason === null || typeof row.adjustment_reason === 'string')
  );
}

function toScheduleEntry(row: ScheduleRow): ScheduleEntry {
  return {
    id: row.id,
    employeeCode: row.employee_code,
    workDate: row.work_date,
    shiftCode: row.shift_code as ShiftCode,
    checkStatus: row.check_status as CheckStatus,
    requestedShiftCode: row.requested_shift_code as ShiftCode | null,
    adjustmentReason: row.adjustment_reason,
  };
}

export interface EmployeeFilter {
  hotelId?: string;
  employeeCode?: string | null;
}

export async function fetchEmployees(filter?: EmployeeFilter): Promise<Employee[]> {
  let query = supabase
    .from('employees')
    .select('code, full_name, department, position')
    .not('app_user_system_uid', 'is', null)
    .order('code', { ascending: true });

  if (filter?.hotelId) query = query.eq('hotel_id', filter.hotelId);
  if (filter?.employeeCode) query = query.eq('code', filter.employeeCode);

  const { data, error } = await query;

  if (error) throw error;
  if (!Array.isArray(data) || !data.every(isEmployeeRow)) throw new Error('Unexpected employee data.');
  return data.map((row) => ({
    code: row.code,
    fullName: row.full_name,
    department: row.department,
    position: row.position,
  }));
}

export async function fetchSchedules(
  fromDate: string,
  toDate: string,
  employeeCodes?: string[] | null
): Promise<ScheduleEntry[]> {
  let query = supabase
    .from('work_schedules')
    .select('id, employee_code, work_date, shift_code, check_status, requested_shift_code, adjustment_reason')
    .gte('work_date', fromDate)
    .lte('work_date', toDate);

  if (employeeCodes && employeeCodes.length > 0) query = query.in('employee_code', employeeCodes);
  else if (employeeCodes) query = query.eq('employee_code', '__none__');

  const { data, error } = await query;

  if (error) throw error;
  if (!Array.isArray(data) || !data.every(isScheduleRow)) throw new Error('Unexpected schedule data.');
  return data.map(toScheduleEntry);
}

export interface ShiftAssignment {
  employeeCode: string;
  workDate: string;
  shiftCode: ShiftCode;
}

export async function upsertShiftAssignments(assignments: ShiftAssignment[]): Promise<void> {
  if (assignments.length === 0) return;
  const { error } = await supabase.from('work_schedules').upsert(
    assignments.map((item) => ({
      employee_code: item.employeeCode,
      work_date: item.workDate,
      shift_code: item.shiftCode,
    })),
    { onConflict: 'employee_code,work_date' }
  );
  if (error) throw error;
}

export async function submitAdjustmentRequest(
  scheduleId: string,
  requestedShiftCode: ShiftCode,
  reason: string
): Promise<void> {
  const { error } = await supabase
    .from('work_schedules')
    .update({
      check_status: 'pending_adjustment',
      requested_shift_code: requestedShiftCode,
      adjustment_reason: reason,
      updated_at: new Date().toISOString(),
    })
    .eq('id', scheduleId);
  if (error) throw error;
}

export async function approveAdjustmentRequest(scheduleId: string, requestedShiftCode: ShiftCode): Promise<void> {
  const { error } = await supabase
    .from('work_schedules')
    .update({
      check_status: 'adjusted',
      shift_code: requestedShiftCode,
      updated_at: new Date().toISOString(),
    })
    .eq('id', scheduleId);
  if (error) throw error;
}

export async function rejectAdjustmentRequest(scheduleId: string): Promise<void> {
  const { error } = await supabase
    .from('work_schedules')
    .update({ check_status: 'mismatch', updated_at: new Date().toISOString() })
    .eq('id', scheduleId);
  if (error) throw error;
}
