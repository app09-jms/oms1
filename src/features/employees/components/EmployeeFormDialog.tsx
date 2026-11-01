import { useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import type { HotelRef } from '@/features/auth/authRules';
import type { Department, Position } from '@/features/settings/settingsRules';
import { normalizeDraft, validateDraft, EMPLOYMENT_STATUSES, EMPLOYMENT_STATUS_LABELS, type EmployeeDraft } from '@/features/employees/employeeRules';

interface EmployeeFormDialogProps {
  mode: 'add' | 'edit';
  initialDraft: EmployeeDraft;
  takenCodes: Set<string>;
  hotels: HotelRef[];
  hotelLocked: boolean;
  departments: Department[];
  positions: Position[];
  isSaving: boolean;
  errorMessage: string | null;
  onCancel: () => void;
  onSubmit: (draft: EmployeeDraft) => void;
}

const fieldClass = 'h-10 border-[#E2E8F0] bg-white focus-visible:ring-[#4F7284]';

function Field({ label, htmlFor, children }: { label: string; htmlFor: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={htmlFor} className="text-sm font-medium text-[#1F2A30]">
        {label}
      </Label>
      {children}
    </div>
  );
}

const UNASSIGNED = '__none__';

export function EmployeeFormDialog({
  mode,
  initialDraft,
  takenCodes,
  hotels,
  hotelLocked,
  departments,
  positions,
  isSaving,
  errorMessage,
  onCancel,
  onSubmit,
}: EmployeeFormDialogProps) {
  const [draft, setDraft] = useState<EmployeeDraft>(initialDraft);
  const [validationError, setValidationError] = useState<string | null>(null);
  const isEdit = mode === 'edit';

  const departmentNameToId = useMemo(
    () => new Map(departments.map((dept) => [dept.name, dept.id])),
    [departments]
  );

  const filteredPositions = useMemo(() => {
    if (draft.department === null) return [];
    const deptId = departmentNameToId.get(draft.department);
    if (!deptId) return [];
    return positions.filter((pos) => pos.departmentId === deptId);
  }, [draft.department, departmentNameToId, positions]);

  function update<K extends keyof EmployeeDraft>(key: K, value: EmployeeDraft[K]) {
    setDraft((current) => {
      const next = { ...current, [key]: value };
      if (key === 'department') {
        const deptId = value === null ? null : departmentNameToId.get(value) ?? null;
        const stillValid = deptId !== null && positions.some((pos) => pos.departmentId === deptId && pos.name === current.position);
        if (!stillValid) next.position = null;
      }
      return next;
    });
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalized = normalizeDraft(draft);
    const validDepartmentNames = departments.map((dept) => dept.name);
    const message =
      validateDraft(normalized, validDepartmentNames) ??
      (!isEdit && takenCodes.has(normalized.code) ? 'Mã NV này đã tồn tại trong danh sách.' : null);
    if (message) {
      setValidationError(message);
      return;
    }
    setValidationError(null);
    onSubmit(normalized);
  }

  return (
    <Dialog open onOpenChange={(open) => !open && !isSaving && onCancel()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto border-[#E2E8F0] bg-white sm:max-w-2xl sm:rounded-xl">
        <DialogHeader className="gap-2">
          <DialogTitle className="text-xl font-semibold text-[#1F2A30]">
            {isEdit ? 'Chỉnh sửa hồ sơ nhân viên' : 'Thêm nhân viên mới'}
          </DialogTitle>
          <DialogDescription className="text-sm text-[#5C6670]">
            {isEdit
              ? 'Cập nhật thông tin hồ sơ. Mã NV dùng làm tên đăng nhập và không thể thay đổi.'
              : 'Nhập thông tin hồ sơ. Ở bước tiếp theo bạn sẽ chọn có tạo tài khoản đăng nhập hay không.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Mã NV (Username)" htmlFor="employee-code">
              <Input
                id="employee-code"
                value={draft.code}
                disabled={isEdit}
                onChange={(event) => update('code', event.target.value)}
                placeholder="VD: NV010"
                autoComplete="off"
                className={fieldClass}
              />
            </Field>
            <Field label="Họ và tên" htmlFor="employee-full-name">
              <Input
                id="employee-full-name"
                value={draft.fullName}
                onChange={(event) => update('fullName', event.target.value)}
                placeholder="Nguyễn Văn A"
                className={fieldClass}
              />
            </Field>
            <Field label="Tên hiển thị" htmlFor="employee-display-name">
              <Input
                id="employee-display-name"
                value={draft.displayName}
                onChange={(event) => update('displayName', event.target.value)}
                placeholder="Văn A"
                className={fieldClass}
              />
            </Field>
            <Field label="Bộ phận" htmlFor="employee-department">
              <Select
                value={draft.department ?? UNASSIGNED}
                onValueChange={(value) => update('department', value === UNASSIGNED ? null : value)}
              >
                <SelectTrigger id="employee-department" className={fieldClass}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={UNASSIGNED}>Chưa phân loại</SelectItem>
                  {departments.map((department) => (
                    <SelectItem key={department.id} value={department.name}>
                      {department.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Chức vụ" htmlFor="employee-position">
              <Select
                value={draft.position ?? UNASSIGNED}
                onValueChange={(value) => update('position', value === UNASSIGNED ? null : value)}
                disabled={draft.department === null}
              >
                <SelectTrigger id="employee-position" className={fieldClass}>
                  <SelectValue placeholder={draft.department === null ? 'Chọn bộ phận trước' : 'Chọn chức vụ'} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={UNASSIGNED}>Chưa phân loại</SelectItem>
                  {filteredPositions.map((pos) => (
                    <SelectItem key={pos.id} value={pos.name}>
                      {pos.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="SĐT" htmlFor="employee-phone">
              <Input
                id="employee-phone"
                type="tel"
                value={draft.phone}
                onChange={(event) => update('phone', event.target.value)}
                placeholder="0900 000 000"
                className={fieldClass}
              />
            </Field>
            <Field label="Email" htmlFor="employee-email">
              <Input
                id="employee-email"
                type="email"
                value={draft.email}
                onChange={(event) => update('email', event.target.value)}
                placeholder="ten@khachsan.vn"
                className={fieldClass}
              />
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Ngày thử việc" htmlFor="employee-probation-date">
                <Input
                  id="employee-probation-date"
                  type="date"
                  value={draft.probationDate}
                  onChange={(event) => update('probationDate', event.target.value)}
                  className={fieldClass}
                />
              </Field>
              <Field label="Ngày chính thức" htmlFor="employee-official-date">
                <Input
                  id="employee-official-date"
                  type="date"
                  value={draft.officialDate}
                  onChange={(event) => update('officialDate', event.target.value)}
                  className={fieldClass}
                />
              </Field>
            </div>
            <Field label="Trạng thái làm việc" htmlFor="employee-employment-status">
              <Select
                value={draft.employmentStatus}
                onValueChange={(value) => update('employmentStatus', value as EmployeeDraft['employmentStatus'])}
              >
                <SelectTrigger id="employee-employment-status" className={fieldClass}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EMPLOYMENT_STATUSES.map((status) => (
                    <SelectItem key={status} value={status}>
                      {EMPLOYMENT_STATUS_LABELS[status]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Khách sạn" htmlFor="employee-hotel">
              {hotelLocked ? (
                <Input
                  id="employee-hotel"
                  readOnly
                  value={hotels.find((hotel) => hotel.id === draft.hotelId)?.name ?? ''}
                  className={`${fieldClass} bg-[#F8FAFC]`}
                />
              ) : (
                <Select value={draft.hotelId} onValueChange={(value) => update('hotelId', value)}>
                  <SelectTrigger id="employee-hotel" className={fieldClass}>
                    <SelectValue placeholder="Chọn khách sạn" />
                  </SelectTrigger>
                  <SelectContent>
                    {hotels.map((hotel) => (
                      <SelectItem key={hotel.id} value={hotel.id}>
                        {hotel.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </Field>
          </div>

          <section className="flex flex-col gap-4 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-4">
            <h3 className="text-sm font-semibold text-[#1F2A30]">Thông tin định danh & Cư trú</h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Số CCCD" htmlFor="employee-citizen-id">
                <Input
                  id="employee-citizen-id"
                  inputMode="numeric"
                  value={draft.citizenId}
                  onChange={(event) => update('citizenId', event.target.value)}
                  placeholder="12 chữ số"
                  className={`${fieldClass} bg-white`}
                />
              </Field>
              <Field label="Ngày cấp" htmlFor="employee-citizen-issued-date">
                <Input
                  id="employee-citizen-issued-date"
                  type="date"
                  value={draft.citizenIdIssuedDate}
                  onChange={(event) => update('citizenIdIssuedDate', event.target.value)}
                  className={`${fieldClass} bg-white`}
                />
              </Field>
              <Field label="Nơi cấp" htmlFor="employee-citizen-issued-place">
                <Input
                  id="employee-citizen-issued-place"
                  value={draft.citizenIdIssuedPlace}
                  onChange={(event) => update('citizenIdIssuedPlace', event.target.value)}
                  placeholder="Cục Cảnh sát QLHC về TTXH"
                  className={`${fieldClass} bg-white`}
                />
              </Field>
              <Field label="Địa chỉ thường trú" htmlFor="employee-permanent-address">
                <Textarea
                  id="employee-permanent-address"
                  rows={2}
                  value={draft.permanentAddress}
                  onChange={(event) => update('permanentAddress', event.target.value)}
                  className="border-[#E2E8F0] bg-white focus-visible:ring-[#4F7284]"
                />
              </Field>
            </div>
          </section>

          {(validationError || errorMessage) && (
            <p role="alert" className="rounded-md border border-error/40 bg-error/5 px-4 py-3 text-sm text-error">
              {validationError ?? errorMessage}
            </p>
          )}

          <DialogFooter className="gap-2 sm:gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={isSaving}
              className="border-[#E2E8F0] text-[#1F2A30]"
            >
              Hủy
            </Button>
            <Button type="submit" disabled={isSaving} className="bg-[#4F7284] text-white hover:bg-[#3F5C6C]">
              {isEdit ? 'Lưu thay đổi' : 'Tiếp tục'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
