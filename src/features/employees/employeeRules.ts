import { DEPARTMENTS } from '@/config/schedule';
import { normalizeSearchText } from '@/lib/text';

export const DEFAULT_INITIAL_LEAVE_DAYS = 12;
export const FILTER_DEPARTMENTS = ['Lễ tân', 'Buồng phòng', 'F&B', 'Bếp'] as const;

export const EMPLOYMENT_STATUSES = ['probation', 'official', 'resigned'] as const;
export type EmploymentStatus = (typeof EMPLOYMENT_STATUSES)[number];

export const EMPLOYMENT_STATUS_LABELS: Record<EmploymentStatus, string> = {
  probation: 'Thử việc',
  official: 'Làm việc chính thức',
  resigned: 'Nghỉ việc',
};

export interface EmployeeProfile {
  systemUid: string;
  code: string;
  fullName: string;
  displayName: string;
  department: string | null;
  position: string | null;
  probationDate: string | null;
  officialDate: string | null;
  employmentStatus: EmploymentStatus;
  phone: string;
  email: string;
  hasAccount: boolean;
  appUserSystemUid: string | null;
  leaveTracking: boolean;
  initialLeaveDays: number;
  hotelId: string;
  citizenId: string;
  citizenIdIssuedDate: string | null;
  citizenIdIssuedPlace: string;
  permanentAddress: string;
}

export interface EmployeeDraft {
  code: string;
  fullName: string;
  displayName: string;
  department: string | null;
  position: string | null;
  probationDate: string;
  officialDate: string;
  employmentStatus: EmploymentStatus;
  phone: string;
  email: string;
  hotelId: string;
  citizenId: string;
  citizenIdIssuedDate: string;
  citizenIdIssuedPlace: string;
  permanentAddress: string;
}

export interface ProvisioningOptions {
  trackLeave: boolean;
  initialLeaveDays: number;
}

export type AccountFilter = 'all' | 'linked' | 'unlinked';

export interface EmployeeFilters {
  hotelId: 'all' | string;
  department: string;
  account: AccountFilter;
  employmentStatus: 'all' | EmploymentStatus;
  search: string;
}

export const DEFAULT_EMPLOYEE_FILTERS: EmployeeFilters = {
  hotelId: 'all',
  department: 'all',
  account: 'all',
  employmentStatus: 'all',
  search: '',
};

const CODE_PATTERN = /^[A-Za-z0-9._-]{1,20}$/;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const CITIZEN_ID_PATTERN = /^(\d{9}|\d{12})$/;

export function createEmptyDraft(hotelId: string): EmployeeDraft {
  return {
    hotelId,
    citizenId: '',
    citizenIdIssuedDate: '',
    citizenIdIssuedPlace: '',
    permanentAddress: '',
    code: '',
    fullName: '',
    displayName: '',
    department: DEPARTMENTS[0] ?? null,
    position: '',
    probationDate: '',
    officialDate: '',
    employmentStatus: 'probation',
    phone: '',
    email: '',
  };
}

export function draftFromProfile(profile: EmployeeProfile): EmployeeDraft {
  return {
    code: profile.code,
    fullName: profile.fullName,
    displayName: profile.displayName,
    department: profile.department,
    position: profile.position,
    probationDate: profile.probationDate ?? '',
    officialDate: profile.officialDate ?? '',
    employmentStatus: profile.employmentStatus,
    phone: profile.phone,
    email: profile.email,
    hotelId: profile.hotelId,
    citizenId: profile.citizenId,
    citizenIdIssuedDate: profile.citizenIdIssuedDate ?? '',
    citizenIdIssuedPlace: profile.citizenIdIssuedPlace,
    permanentAddress: profile.permanentAddress,
  };
}

export function normalizeDraft(draft: EmployeeDraft): EmployeeDraft {
  return {
    code: draft.code.trim(),
    fullName: draft.fullName.trim(),
    displayName: draft.displayName.trim(),
    department: draft.department === null ? null : draft.department.trim(),
    position: draft.position === null ? null : draft.position.trim(),
    probationDate: draft.probationDate.trim(),
    officialDate: draft.officialDate.trim(),
    employmentStatus: draft.employmentStatus,
    phone: draft.phone.trim(),
    email: draft.email.trim(),
    hotelId: draft.hotelId,
    citizenId: draft.citizenId.replace(/\s+/g, ''),
    citizenIdIssuedDate: draft.citizenIdIssuedDate.trim(),
    citizenIdIssuedPlace: draft.citizenIdIssuedPlace.trim(),
    permanentAddress: draft.permanentAddress.trim(),
  };
}

export function validateDraft(input: EmployeeDraft): string | null {
  const draft = normalizeDraft(input);
  if (!CODE_PATTERN.test(draft.code)) {
    return 'Mã NV chỉ gồm chữ, số, dấu chấm, gạch dưới hoặc gạch ngang (tối đa 20 ký tự).';
  }
  if (!draft.fullName) return 'Vui lòng nhập họ và tên.';
  if (!draft.hotelId) return 'Vui lòng chọn khách sạn.';
  if (draft.citizenId && !CITIZEN_ID_PATTERN.test(draft.citizenId)) {
    return 'Số CCCD phải gồm 9 hoặc 12 chữ số.';
  }
  if (draft.citizenIdIssuedDate && !DATE_PATTERN.test(draft.citizenIdIssuedDate)) {
    return 'Ngày cấp CCCD không hợp lệ.';
  }
  if (draft.department !== null && !(DEPARTMENTS as readonly string[]).includes(draft.department)) return 'Bộ phận không hợp lệ.';
  if (draft.probationDate && !DATE_PATTERN.test(draft.probationDate)) return 'Ngày thử việc không hợp lệ.';
  if (draft.officialDate && !DATE_PATTERN.test(draft.officialDate)) return 'Ngày chính thức không hợp lệ.';
  if (!(EMPLOYMENT_STATUSES as readonly string[]).includes(draft.employmentStatus)) {
    return 'Vui lòng chọn trạng thái làm việc.';
  }
  if (draft.email && !EMAIL_PATTERN.test(draft.email)) return 'Email không hợp lệ.';
  return null;
}

export function applyEmployeeFilters(profiles: EmployeeProfile[], filters: EmployeeFilters): EmployeeProfile[] {
  const query = normalizeSearchText(filters.search);
  return profiles.filter((profile) => {
    if (filters.hotelId !== 'all' && profile.hotelId !== filters.hotelId) return false;
    if (filters.department !== 'all' && profile.department !== filters.department) return false;
    if (filters.account === 'linked' && profile.appUserSystemUid === null) return false;
    if (filters.account === 'unlinked' && profile.appUserSystemUid !== null) return false;
    if (filters.employmentStatus !== 'all' && profile.employmentStatus !== filters.employmentStatus) return false;
    if (!query) return true;
    return [profile.code, profile.fullName, profile.displayName, profile.phone, profile.email, profile.citizenId].some((value) =>
      normalizeSearchText(value).includes(query)
    );
  });
}

export function formatDisplayDate(isoDate: string | null): string {
  if (!isoDate || !DATE_PATTERN.test(isoDate)) return '—';
  const [year, month, day] = isoDate.split('-');
  return `${day}/${month}/${year}`;
}
