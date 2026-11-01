import { supabase } from '@/lib/supabase';
import {
  normalizeShiftDraft,
  SHIFT_DAY_STATUSES,
  type Department,
  type Position,
  type ShiftDayStatus,
  type ShiftDraft,
  type ShiftType,
} from '@/features/settings/settingsRules';

const IN_USE_MESSAGE = 'Không thể thay đổi hoặc xóa vì đang có nhân viên hoặc lịch làm việc sử dụng.';
const DUPLICATE_MESSAGE = 'Tên này đã tồn tại.';

interface DepartmentRow {
  id: string;
  name: string;
  sort_order: number;
}

interface PositionRow {
  id: string;
  department_id: string;
  name: string;
}

interface ShiftRow {
  code: string;
  name: string;
  day_status: ShiftDayStatus;
  start_time: string | null;
  end_time: string | null;
  break_minutes: number;
  he_so_cong: number;
  sort_order: number;
}

function toDatabaseError(error: { code?: string; message: string }, fallback: string): Error {
  if (error.code === '23505') return new Error(DUPLICATE_MESSAGE);
  return new Error(fallback);
}

function assertRows<T>(data: unknown, guard: (value: unknown) => value is T, label: string): T[] {
  if (!Array.isArray(data) || !data.every(guard)) throw new Error(`Dữ liệu ${label} không hợp lệ.`);
  return data;
}

function isDepartmentRow(value: unknown): value is DepartmentRow {
  const row = value as DepartmentRow;
  return typeof row?.id === 'string' && typeof row.name === 'string' && typeof row.sort_order === 'number';
}

function isPositionRow(value: unknown): value is PositionRow {
  const row = value as PositionRow;
  return typeof row?.id === 'string' && typeof row.department_id === 'string' && typeof row.name === 'string';
}

function isShiftRow(value: unknown): value is ShiftRow {
  const row = value as ShiftRow;
  return (
    typeof row?.code === 'string' &&
    typeof row.name === 'string' &&
    (SHIFT_DAY_STATUSES as readonly string[]).includes(row.day_status) &&
    typeof row.break_minutes === 'number' &&
    typeof row.he_so_cong === 'number' &&
    typeof row.sort_order === 'number'
  );
}

async function countRows(query: PromiseLike<{ count: number | null; error: { message: string } | null }>): Promise<number> {
  const { count, error } = await query;
  if (error) throw error;
  return count ?? 0;
}

export async function fetchDepartmentCatalog(): Promise<{ departments: Department[]; positions: Position[] }> {
  const [departmentResult, positionResult] = await Promise.all([
    supabase.from('departments').select('id, name, sort_order').order('sort_order', { ascending: true }),
    supabase.from('positions').select('id, department_id, name').order('name', { ascending: true }),
  ]);
  if (departmentResult.error) throw departmentResult.error;
  if (positionResult.error) throw positionResult.error;

  const departments = assertRows(departmentResult.data, isDepartmentRow, 'bộ phận').map((row) => ({
    id: row.id,
    name: row.name,
    sortOrder: row.sort_order,
  }));
  const positions = assertRows(positionResult.data, isPositionRow, 'chức vụ').map((row) => ({
    id: row.id,
    departmentId: row.department_id,
    name: row.name,
  }));
  return { departments, positions };
}

export async function insertDepartment(name: string, sortOrder: number): Promise<void> {
  const { error } = await supabase.from('departments').insert({ name, sort_order: sortOrder });
  if (error) throw toDatabaseError(error, 'Không thể thêm bộ phận. Vui lòng thử lại.');
}

export async function renameDepartment(department: Department, name: string): Promise<void> {
  if (name === department.name) return;
  const inUse = await countRows(
    supabase.from('employees').select('code', { count: 'exact', head: true }).eq('department', department.name)
  );
  if (inUse > 0) throw new Error(IN_USE_MESSAGE);

  const { error } = await supabase.from('departments').update({ name }).eq('id', department.id);
  if (error) throw toDatabaseError(error, 'Không thể cập nhật bộ phận. Vui lòng thử lại.');
}

export async function countDepartmentEmployees(departmentName: string): Promise<number> {
  return countRows(
    supabase.from('employees').select('code', { count: 'exact', head: true }).eq('department', departmentName)
  );
}

export async function deleteDepartment(department: Department): Promise<void> {
  const inUse = await countRows(
    supabase.from('employees').select('code', { count: 'exact', head: true }).eq('department', department.name)
  );
  if (inUse > 0) throw new Error(IN_USE_MESSAGE);

  const { error } = await supabase.from('departments').delete().eq('id', department.id);
  if (error) throw new Error('Không thể xóa bộ phận. Vui lòng thử lại.');
}

export async function deleteDepartmentSafe(oldName: string, newName: string | null): Promise<void> {
  const { error } = await supabase.rpc('delete_department_safe', {
    p_old_name: oldName,
    p_new_name: newName,
  });
  if (error?.code === 'P0002') throw new Error('Không tìm thấy bộ phận hoặc bộ phận đích.');
  if (error) throw new Error('Không thể xóa bộ phận. Vui lòng thử lại.');
}

export async function insertPosition(departmentId: string, name: string): Promise<void> {
  const { error } = await supabase.from('positions').insert({ department_id: departmentId, name });
  if (error) throw toDatabaseError(error, 'Không thể thêm chức vụ. Vui lòng thử lại.');
}

export async function renamePosition(department: Department, position: Position, name: string): Promise<void> {
  if (name === position.name) return;
  const inUse = await countRows(
    supabase
      .from('employees')
      .select('code', { count: 'exact', head: true })
      .eq('department', department.name)
      .eq('position', position.name)
  );
  if (inUse > 0) throw new Error(IN_USE_MESSAGE);

  const { error } = await supabase.from('positions').update({ name }).eq('id', position.id);
  if (error) throw toDatabaseError(error, 'Không thể cập nhật chức vụ. Vui lòng thử lại.');
}

export async function countPositionEmployees(departmentName: string, positionName: string): Promise<number> {
  return countRows(
    supabase
      .from('employees')
      .select('code', { count: 'exact', head: true })
      .eq('department', departmentName)
      .eq('position', positionName)
  );
}

export async function deletePosition(department: Department, position: Position): Promise<void> {
  const inUse = await countRows(
    supabase
      .from('employees')
      .select('code', { count: 'exact', head: true })
      .eq('department', department.name)
      .eq('position', position.name)
  );
  if (inUse > 0) throw new Error(IN_USE_MESSAGE);

  const { error } = await supabase.from('positions').delete().eq('id', position.id);
  if (error) throw new Error('Không thể xóa chức vụ. Vui lòng thử lại.');
}

export async function deletePositionSafe(oldName: string, newName: string | null): Promise<void> {
  const { error } = await supabase.rpc('delete_position_safe', {
    p_old_name: oldName,
    p_new_name: newName,
  });
  if (error?.code === 'P0002') throw new Error('Không tìm thấy chức vụ.');
  if (error) throw new Error('Không thể xóa chức vụ. Vui lòng thử lại.');
}

export async function fetchShiftTypes(): Promise<ShiftType[]> {
  const { data, error } = await supabase
    .from('shift_types')
    .select('code, name, day_status, start_time, end_time, break_minutes, he_so_cong, sort_order')
    .order('sort_order', { ascending: true });
  if (error) throw error;

  return assertRows(data, isShiftRow, 'ca làm việc').map((row) => ({
    code: row.code,
    name: row.name,
    dayStatus: row.day_status,
    startTime: row.start_time,
    endTime: row.end_time,
    breakMinutes: row.break_minutes,
    heSoCong: row.he_so_cong,
    sortOrder: row.sort_order,
  }));
}

function toShiftPayload(draft: ShiftDraft) {
  const values = normalizeShiftDraft(draft);
  return {
    name: values.name,
    day_status: values.dayStatus,
    is_working: values.dayStatus === 'workday',
    start_time: values.dayStatus === 'workday' ? values.startTime : null,
    end_time: values.dayStatus === 'workday' ? values.endTime : null,
    break_minutes: Number(values.breakMinutes),
    he_so_cong: Number(values.heSoCong),
  };
}

export async function insertShiftType(draft: ShiftDraft, sortOrder: number): Promise<void> {
  const { error } = await supabase
    .from('shift_types')
    .insert({ code: normalizeShiftDraft(draft).code, sort_order: sortOrder, ...toShiftPayload(draft) });
  if (error) throw toDatabaseError(error, 'Không thể thêm ca làm việc. Vui lòng thử lại.');
}

export async function updateShiftType(code: string, draft: ShiftDraft): Promise<void> {
  const { error } = await supabase.from('shift_types').update(toShiftPayload(draft)).eq('code', code);
  if (error) throw toDatabaseError(error, 'Không thể cập nhật ca làm việc. Vui lòng thử lại.');
}

export async function deleteShiftType(code: string): Promise<void> {
  const inUse = await countRows(
    supabase
      .from('work_schedules')
      .select('id', { count: 'exact', head: true })
      .or(`shift_code.eq.${code},requested_shift_code.eq.${code}`)
  );
  if (inUse > 0) throw new Error(IN_USE_MESSAGE);

  const { error } = await supabase.from('shift_types').delete().eq('code', code);
  if (error) throw new Error('Không thể xóa ca làm việc. Vui lòng thử lại.');
}
