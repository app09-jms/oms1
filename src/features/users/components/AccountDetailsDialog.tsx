import { useState, type FormEvent } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { RoleSummary } from '@/features/permissions/permissionRules';
import type { UserAccountRow } from '@/features/users/userRules';

const fieldClass = 'h-10 border-[#E2E8F0] bg-white focus-visible:ring-[#4F7284]';

interface AccountDetailsDialogProps {
  account: UserAccountRow;
  roles: RoleSummary[];
  isSaving: boolean;
  errorMessage: string | null;
  onCancel: () => void;
  onSave: (values: { fullName: string; role: string }) => void;
}

export function AccountDetailsDialog({
  account,
  roles,
  isSaving,
  errorMessage,
  onCancel,
  onSave,
}: AccountDetailsDialogProps) {
  const [fullName, setFullName] = useState(account.fullName);
  const [role, setRole] = useState(account.role);
  const [validationError, setValidationError] = useState<string | null>(null);
  const shownError = validationError ?? errorMessage;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = fullName.trim();
    if (!name) {
      setValidationError('Vui lòng nhập họ và tên.');
      return;
    }
    setValidationError(null);
    onSave({ fullName: name, role });
  }

  return (
    <Dialog open onOpenChange={(open) => !open && !isSaving && onCancel()}>
      <DialogContent className="border-[#E2E8F0] bg-white sm:max-w-md sm:rounded-xl">
        <DialogHeader className="gap-2">
          <DialogTitle className="text-xl font-semibold text-[#1F2A30]">Chỉnh sửa thông tin</DialogTitle>
          <DialogDescription className="text-sm text-[#5C6670]">
            Cập nhật thông tin của tài khoản <span className="font-medium text-[#1F2A30]">{account.username}</span>.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5" noValidate>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="account-full-name" className="text-sm font-medium text-[#1F2A30]">
              Họ và tên
            </Label>
            <Input
              id="account-full-name"
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              className={fieldClass}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="account-role" className="text-sm font-medium text-[#1F2A30]">
              Vai trò
            </Label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger id="account-role" className={fieldClass}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {roles.map((item) => (
                  <SelectItem key={item.key} value={item.key}>
                    {item.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-[#1F2A30]">Bộ phận</span>
            <div className="flex h-10 items-center rounded-md border border-[#E2E8F0] bg-[#F8FAFC] px-3 text-sm text-[#5C6670]">
              {account.employee
                ? account.employee.department ?? 'Chưa phân loại'
                : 'Chưa liên kết hồ sơ nhân viên nên chưa có bộ phận.'}
            </div>
          </div>

          {shownError && (
            <p role="alert" className="rounded-md border border-error/40 bg-error/5 px-4 py-3 text-sm text-error">
              {shownError}
            </p>
          )}

          <DialogFooter className="gap-2 sm:gap-2">
            <Button type="button" variant="outline" onClick={onCancel} disabled={isSaving} className="border-[#E2E8F0] text-[#1F2A30]">
              Hủy
            </Button>
            <Button type="submit" disabled={isSaving} className="bg-[#4F7284] text-white hover:bg-[#406273]">
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Lưu thay đổi
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
