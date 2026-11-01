import { LATE_TOLERANCE_MINUTES } from '@/config/attendance';
import { SCHEDULE_SHIFTS, type ShiftCode } from '@/config/schedule';

export type CheckStatus = 'on_shift' | 'mismatch' | 'pending_adjustment' | 'adjusted';

export interface Employee {
  code: string;
  fullName: string;
  department: string | null;
  position: string | null;
}

export interface ScheduleEntry {
  id: string;
  employeeCode: string;
  workDate: string;
  shiftCode: ShiftCode;
  checkStatus: CheckStatus;
  requestedShiftCode: ShiftCode | null;
  adjustmentReason: string | null;
}

const MINUTE_MS = 60_000;

export function getWeekStart(date: Date): Date {
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const offsetToMonday = (start.getDay() + 6) % 7;
  start.setDate(start.getDate() - offsetToMonday);
  return start;
}

export function addDays(date: Date, days: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}

export function getWeekDates(weekStart: Date): Date[] {
  return Array.from({ length: 7 }, (_, index) => addDays(weekStart, index));
}

export function toDisplayDate(date: Date): string {
  return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function formatWeekRange(weekStart: Date): string {
  return `${toDisplayDate(weekStart)} - ${toDisplayDate(addDays(weekStart, 6))}`;
}

export function getScheduledStart(workDateKey: string, shiftCode: ShiftCode): Date | null {
  const shift = SCHEDULE_SHIFTS[shiftCode];
  if (shift.startHour === null) return null;
  return new Date(`${workDateKey}T${String(shift.startHour).padStart(2, '0')}:00:00`);
}

export function isCheckInMismatched(workDateKey: string, shiftCode: ShiftCode, checkInTime: string): boolean {
  const scheduledStart = getScheduledStart(workDateKey, shiftCode);
  if (!scheduledStart) return false;
  const checkIn = new Date(`${workDateKey}T${checkInTime}:00`);
  const diffMinutes = Math.abs(checkIn.getTime() - scheduledStart.getTime()) / MINUTE_MS;
  return diffMinutes > LATE_TOLERANCE_MINUTES;
}

export function formatCheckStatus(status: CheckStatus): string {
  switch (status) {
    case 'on_shift':
      return 'Đúng ca';
    case 'mismatch':
      return 'Lệch ca';
    case 'pending_adjustment':
      return 'Chờ duyệt điều chỉnh';
    case 'adjusted':
      return 'Đã điều chỉnh';
  }
}

export function getShiftDisplayHours(shiftCode: ShiftCode): string {
  const shift = SCHEDULE_SHIFTS[shiftCode];
  if (shift.startHour === null || shift.endHour === null) return 'Không làm việc';
  const pad = (hour: number) => `${String(hour).padStart(2, '0')}:00`;
  return `${pad(shift.startHour)} - ${pad(shift.endHour)}`;
}
