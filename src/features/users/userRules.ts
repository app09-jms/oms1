export const DEFAULT_ACCOUNT_PASSWORD = '123';

export const USERNAME_PATTERN = /^[A-Za-z0-9._-]{3,30}$/;

export const DEFAULT_ROLE_KEY = 'staff';

export interface AppUser {
  systemUid: string;
  username: string;
  fullName: string;
  role: string;
  isActive: boolean;
  employeeSystemUid: string | null;
}

export interface EmployeeOption {
  systemUid: string;
  code: string;
  fullName: string;
  department: string | null;
}

export interface UserAccountRow extends AppUser {
  employee: EmployeeOption | null;
  hotelIds: string[];
}

export interface UserFilters {
  role: 'all' | string;
  status: 'all' | 'active' | 'locked';
  hotelId: 'all' | string;
  search: string;
}

export const DEFAULT_USER_FILTERS: UserFilters = {
  role: 'all',
  status: 'all',
  hotelId: 'all',
  search: '',
};

export interface NewAccountDraft {
  employeeSystemUid: string;
  hotelId: string;
  username: string;
  fullName: string;
  role: string;
}

export function createEmptyAccountDraft(hotelId: string): NewAccountDraft {
  return { employeeSystemUid: '', hotelId, username: '', fullName: '', role: DEFAULT_ROLE_KEY };
}

export function applyUserFilters(rows: UserAccountRow[], filters: UserFilters): UserAccountRow[] {
  const query = filters.search.trim().toLowerCase();
  return rows.filter((row) => {
    if (filters.role !== 'all' && row.role !== filters.role) return false;
    if (filters.hotelId !== 'all' && !row.hotelIds.includes(filters.hotelId)) return false;
    if (filters.status === 'active' && !row.isActive) return false;
    if (filters.status === 'locked' && row.isActive) return false;
    if (!query) return true;
    return [row.username, row.fullName, row.employee?.code ?? '']
      .some((value) => value.toLowerCase().includes(query));
  });
}

export function validateAccountDraft(draft: NewAccountDraft, employees: EmployeeOption[]): string | null {
  if (!draft.hotelId) {
    return 'Vui lòng chọn khách sạn.';
  }
  if (draft.employeeSystemUid) {
    if (!employees.some((employee) => employee.systemUid === draft.employeeSystemUid)) {
      return 'Vui lòng chọn hồ sơ nhân viên hợp lệ.';
    }
    return null;
  }
  if (!USERNAME_PATTERN.test(draft.username.trim())) {
    return 'Tên đăng nhập chỉ gồm chữ, số, dấu chấm, gạch dưới hoặc gạch ngang (3-30 ký tự).';
  }
  if (!draft.fullName.trim()) {
    return 'Vui lòng nhập họ và tên.';
  }
  return null;
}

export function employeeOptionLabel(employee: EmployeeOption): string {
  return `${employee.code} - ${employee.fullName} - ${employee.department ?? 'Chưa phân loại'}`;
}
