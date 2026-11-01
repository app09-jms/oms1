import { supabase } from '@/lib/supabase';
import { nullIfEmpty } from '@/lib/payload';
import {
  normalizeDraft,
  type EmployeeDraft,
  type EmployeeProfile,
  type EmploymentStatus,
  type ProvisioningOptions,
} from '@/features/employees/employeeRules';

const DUPLICATE_CODE_MESSAGE = 'Mã NV đã tồn tại trong danh sách.';

interface EmployeeProfileRow {
  system_uid: string;
  code: string;
  full_name: string;
  display_name: string | null;
  department: string | null;
  position: string | null;
  probation_date: string | null;
  official_date: string | null;
  employment_status: EmploymentStatus;
  phone: string | null;
  email: string | null;
  has_account: boolean;
  app_user_system_uid: string | null;
  leave_tracking: boolean;
  initial_leave_days: number;
  hotel_id: string;
  citizen_id: string | null;
  citizen_id_issued_date: string | null;
  citizen_id_issued_place: string | null;
  permanent_address: string | null;
}

export type DeleteEmployeeOutcome = 'deleted' | 'resigned' | 'has_data';

function isProfileRow(value: unknown): value is EmployeeProfileRow {
  if (typeof value !== 'object' || value === null) return false;
  const row = value as Record<string, unknown>;
  return (
    typeof row.system_uid === 'string' &&
    typeof row.code === 'string' &&
    typeof row.full_name === 'string' &&
    (typeof row.department === 'string' || row.department === null) &&
    typeof row.employment_status === 'string' &&
    typeof row.has_account === 'boolean' &&
    typeof row.leave_tracking === 'boolean' &&
    typeof row.initial_leave_days === 'number' &&
    typeof row.hotel_id === 'string'
  );
}

function toProfile(row: EmployeeProfileRow): EmployeeProfile {
  return {
    systemUid: row.system_uid,
    code: row.code,
    fullName: row.full_name,
    displayName: row.display_name ?? '',
    department: row.department ?? null,
    position: row.position ?? null,
    probationDate: row.probation_date,
    officialDate: row.official_date,
    employmentStatus: row.employment_status,
    phone: row.phone ?? '',
    email: row.email ?? '',
    hasAccount: row.has_account,
    appUserSystemUid: row.app_user_system_uid,
    leaveTracking: row.leave_tracking,
    initialLeaveDays: row.initial_leave_days,
    hotelId: row.hotel_id,
    citizenId: row.citizen_id ?? '',
    citizenIdIssuedDate: row.citizen_id_issued_date,
    citizenIdIssuedPlace: row.citizen_id_issued_place ?? '',
    permanentAddress: row.permanent_address ?? '',
  };
}

function toProfilePayload(draft: EmployeeDraft) {
  const values = normalizeDraft(draft);
  return {
    full_name: values.fullName,
    display_name: values.displayName || null,
    department: values.department,
    position: nullIfEmpty(values.position),
    probation_date: values.probationDate || null,
    official_date: values.officialDate || null,
    employment_status: values.employmentStatus,
    phone: values.phone || null,
    email: values.email || null,
    hotel_id: values.hotelId,
    citizen_id: values.citizenId || null,
    citizen_id_issued_date: values.citizenIdIssuedDate || null,
    citizen_id_issued_place: values.citizenIdIssuedPlace || null,
    permanent_address: values.permanentAddress || null,
  };
}

function toDatabaseError(error: { code?: string; message: string }, fallback: string): Error {
  if (error.code === '23505') return new Error(DUPLICATE_CODE_MESSAGE);
  return new Error(fallback);
}

export async function fetchEmployeeProfiles(token: string, hotelScopeId: string | null): Promise<EmployeeProfile[]> {
  const { data, error } = await supabase.rpc('list_employee_profiles', {
    p_token: token,
    p_hotel_id: hotelScopeId,
  });

  if (error) throw error;
  if (!Array.isArray(data) || !data.every(isProfileRow)) throw new Error('Dữ liệu hồ sơ nhân viên không hợp lệ.');
  return data.map(toProfile);
}

export async function fetchOwnEmployeeProfile(token: string): Promise<EmployeeProfile | null> {
  const profiles = await fetchEmployeeProfiles(token, null);
  return profiles[0] ?? null;
}

export async function insertEmployees(drafts: EmployeeDraft[], options: ProvisioningOptions): Promise<void> {
  const rows = drafts.map((draft) => ({
    code: normalizeDraft(draft).code,
    ...toProfilePayload(draft),
    leave_tracking: options.trackLeave,
    initial_leave_days: options.initialLeaveDays,
  }));

  const { error } = await supabase.from('employees').insert(rows);
  if (error) throw toDatabaseError(error, 'Không thể lưu hồ sơ nhân viên. Vui lòng thử lại.');
}

export async function updateEmployeeProfile(code: string, draft: EmployeeDraft): Promise<void> {
  const { error } = await supabase.from('employees').update(toProfilePayload(draft)).eq('code', code);
  if (error) throw toDatabaseError(error, 'Không thể cập nhật hồ sơ. Vui lòng thử lại.');
}

export async function deleteEmployeeProfile(
  token: string,
  code: string,
  force: boolean,
): Promise<DeleteEmployeeOutcome> {
  const { data, error } = await supabase.rpc('delete_employee_profile', {
    p_token: token,
    p_code: code,
    p_force: force,
  });
  if (error?.code === '42501') throw new Error('Bạn không có quyền xóa nhân viên này.');
  if (error?.code === 'P0002') throw new Error('Không tìm thấy hồ sơ nhân viên.');
  if (error) throw new Error('Không thể xóa nhân viên. Vui lòng thử lại.');
  if (data === 'deleted' || data === 'resigned' || data === 'has_data') return data;
  throw new Error('Không thể xóa nhân viên. Vui lòng thử lại.');
}

export async function applyLeaveOpening(code: string): Promise<void> {
  const { error } = await supabase.rpc('apply_employee_leave_opening', { p_code: code });
  if (error) throw error;
}

export async function setLeaveTracking(code: string, enabled: boolean): Promise<void> {
  const { error } = await supabase.from('employees').update({ leave_tracking: enabled }).eq('code', code);
  if (error) throw error;
  if (enabled) await applyLeaveOpening(code);
}

export async function createEmployees(drafts: EmployeeDraft[], options: ProvisioningOptions): Promise<void> {
  await insertEmployees(drafts, options);
  if (!options.trackLeave) return;
  for (const draft of drafts) {
    const code = normalizeDraft(draft).code;
    try {
      await applyLeaveOpening(code);
    } catch (cause) {
      console.error('Leave opening failed for employee', code, cause);
    }
  }
}
