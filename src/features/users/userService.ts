import { supabase } from '@/lib/supabase';
import { type HotelRef } from '@/features/auth/authRules';
import {
  DEFAULT_ACCOUNT_PASSWORD,
  type EmployeeOption,
  type NewAccountDraft,
  type UserAccountRow,
} from '@/features/users/userRules';

const LOAD_ERROR = 'Không thể tải danh sách tài khoản.';
const LINK_TAKEN_MESSAGE = 'Hồ sơ nhân viên này đã được liên kết với tài khoản khác.';
const CREATE_ERROR = 'Không thể tạo tài khoản. Vui lòng thử lại.';
const USERNAME_TAKEN_ERROR = 'Tên đăng nhập đã tồn tại. Vui lòng chọn tên khác.';
const CREATE_PERMISSION_ERROR = 'Bạn không có quyền tạo tài khoản này hoặc phiên đăng nhập đã hết hạn.';
const UNIQUE_VIOLATION = '23505';
const INSUFFICIENT_PRIVILEGE = '42501';

interface AppUserRow {
  system_uid: string;
  username: string;
  full_name: string;
  role: string;
  is_active: boolean;
  employee_system_uid: string | null;
}

interface AppUserHotelRow {
  app_user_system_uid: string;
  hotel_id: string;
}

interface EmployeeRow {
  system_uid: string;
  code: string;
  full_name: string;
  department: string | null;
}

interface HotelOptionRow {
  id: string;
  system_hotel_id: string;
  name: string;
  address: string | null;
  id_prefix: string | null;
}

function isAppUserRow(value: unknown): value is AppUserRow {
  const row = value as AppUserRow;
  return (
    typeof row?.system_uid === 'string' &&
    typeof row.username === 'string' &&
    typeof row.full_name === 'string' &&
    typeof row.role === 'string' &&
    typeof row.is_active === 'boolean' &&
    (row.employee_system_uid === null || typeof row.employee_system_uid === 'string')
  );
}

function isAppUserHotelRow(value: unknown): value is AppUserHotelRow {
  const row = value as AppUserHotelRow;
  return typeof row?.app_user_system_uid === 'string' && typeof row.hotel_id === 'string';
}

function isEmployeeRow(value: unknown): value is EmployeeRow {
  const row = value as EmployeeRow;
  return (
    typeof row?.system_uid === 'string' &&
    typeof row.code === 'string' &&
    typeof row.full_name === 'string' &&
    (row.department === null || typeof row.department === 'string')
  );
}

function isHotelOptionRow(value: unknown): value is HotelOptionRow {
  const row = value as HotelOptionRow;
  return (
    typeof row?.id === 'string' &&
    typeof row.system_hotel_id === 'string' &&
    typeof row.name === 'string' &&
    (row.address === null || typeof row.address === 'string') &&
    (row.id_prefix === null || typeof row.id_prefix === 'string')
  );
}

function assertRows<T>(data: unknown, guard: (value: unknown) => value is T): T[] {
  if (!Array.isArray(data) || !data.every(guard)) throw new Error(LOAD_ERROR);
  return data;
}

export async function fetchUserAccounts(): Promise<{
  accounts: UserAccountRow[];
  employees: EmployeeOption[];
  hotels: HotelRef[];
}> {
  const [userResult, employeeResult, hotelResult, userHotelResult] = await Promise.all([
    supabase
      .from('app_users')
      .select('system_uid, username, full_name, role, is_active, employee_system_uid')
      .order('username', { ascending: true }),
    supabase.from('employees').select('system_uid, code, full_name, department').order('code', { ascending: true }),
    supabase.from('hotels').select('id, system_hotel_id, name, address, id_prefix').order('name', { ascending: true }),
    supabase.from('app_user_hotels').select('app_user_system_uid, hotel_id'),
  ]);
  if (userResult.error) throw userResult.error;
  if (hotelResult.error) throw hotelResult.error;
  if (userHotelResult.error) throw userHotelResult.error;

  const hotelIdsByUser = new Map<string, string[]>();
  for (const link of assertRows(userHotelResult.data, isAppUserHotelRow)) {
    const ids = hotelIdsByUser.get(link.app_user_system_uid) ?? [];
    ids.push(link.hotel_id);
    hotelIdsByUser.set(link.app_user_system_uid, ids);
  }

  let employees: EmployeeOption[] = [];
  if (!employeeResult.error && employeeResult.data) {
    employees = assertRows(employeeResult.data, isEmployeeRow).map((row) => ({
      systemUid: row.system_uid,
      code: row.code,
      fullName: row.full_name,
      department: row.department,
    }));
  }
  const employeeByUid = new Map(employees.map((employee) => [employee.systemUid, employee]));

  const accounts = assertRows(userResult.data, isAppUserRow).map((row): UserAccountRow => {
    return {
      systemUid: row.system_uid,
      username: row.username,
      fullName: row.full_name,
      role: row.role,
      isActive: row.is_active,
      employeeSystemUid: row.employee_system_uid,
      employee: row.employee_system_uid ? employeeByUid.get(row.employee_system_uid) ?? null : null,
      hotelIds: hotelIdsByUser.get(row.system_uid) ?? [],
    };
  });

  const hotels = assertRows(hotelResult.data, isHotelOptionRow).map((row): HotelRef => ({
    id: row.id,
    systemHotelId: row.system_hotel_id,
    name: row.name,
    address: row.address,
    idPrefix: row.id_prefix,
  }));

  return { accounts, employees, hotels };
}

export async function createUserAccount(token: string, draft: NewAccountDraft): Promise<void> {
  const { error } = await supabase.rpc('create_app_user', {
    p_token: token,
    p_username: draft.username.trim(),
    p_password: DEFAULT_ACCOUNT_PASSWORD,
    p_full_name: draft.fullName.trim(),
    p_role: draft.role,
    p_hotel_id: draft.hotelId,
    p_employee_system_uid: draft.employeeSystemUid || null,
  });
  if (error?.code === UNIQUE_VIOLATION) throw new Error(USERNAME_TAKEN_ERROR);
  if (error?.code === INSUFFICIENT_PRIVILEGE) throw new Error(CREATE_PERMISSION_ERROR);
  if (error) throw new Error(CREATE_ERROR);
}

export async function resetAccountPassword(token: string, systemUid: string): Promise<void> {
  const { error } = await supabase.rpc('reset_app_user_password', { p_token: token, p_system_uid: systemUid });
  if (error?.code === INSUFFICIENT_PRIVILEGE) throw new Error(CREATE_PERMISSION_ERROR);
  if (error) throw new Error('Không thể đặt lại mật khẩu. Vui lòng thử lại.');
}

async function updateAppUser(
  systemUid: string,
  values: { full_name?: string; role?: string; is_active?: boolean; employee_system_uid?: string | null },
  fallback: string,
): Promise<void> {
  const { data, error } = await supabase
    .from('app_users')
    .update(values)
    .eq('system_uid', systemUid)
    .select('system_uid');
  if (error) throw new Error(fallback);
  if (!data?.length) throw new Error(fallback);
}

export async function setAccountActive(systemUid: string, isActive: boolean): Promise<void> {
  await updateAppUser(systemUid, { is_active: isActive }, 'Không thể cập nhật trạng thái. Vui lòng thử lại.');
}

export async function updateAccountDetails(
  systemUid: string,
  values: { fullName: string; role: string },
): Promise<void> {
  await updateAppUser(
    systemUid,
    { full_name: values.fullName, role: values.role },
    'Không thể cập nhật thông tin tài khoản. Vui lòng thử lại.',
  );
}

export async function unlinkAccountFromEmployee(systemUid: string): Promise<void> {
  await updateAppUser(
    systemUid,
    { employee_system_uid: null },
    'Không thể hủy liên kết hồ sơ. Vui lòng thử lại.',
  );
}

export async function linkAccountToEmployee(systemUid: string, employeeSystemUid: string): Promise<void> {
  const { data, error } = await supabase
    .from('app_users')
    .update({ employee_system_uid: employeeSystemUid })
    .eq('system_uid', systemUid)
    .select('system_uid');
  if (error?.code === '23505') throw new Error(LINK_TAKEN_MESSAGE);
  if (error || !data?.length) throw new Error('Không thể liên kết hồ sơ. Vui lòng thử lại.');
}
