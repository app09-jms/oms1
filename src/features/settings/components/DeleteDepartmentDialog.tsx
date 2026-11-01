import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { Department, Position } from '@/features/settings/settingsRules';

interface DeleteDepartmentDialogProps {
  department: Department;
  allDepartments: Department[];
  isSuperAdmin: boolean;
  inUseCount: number;
  isPending: boolean;
  errorMessage: string | null;
  onCancel: () => void;
  onConfirm: (reassignTo: string | null) => void;
}

export function DeleteDepartmentDialog({
  department,
  allDepartments,
  isSuperAdmin,
  inUseCount,
  isPending,
  errorMessage,
  onCancel,
  onConfirm,
}: DeleteDepartmentDialogProps) {
  const otherDepartments = allDepartments.filter((d) => d.id !== department.id);
  const [reassignTo, setReassignTo] = useState<string>(otherDepartments[0]?.name ?? '__none__');

  useEffect(() => {
    setReassignTo(otherDepartments[0]?.name ?? '__none__');
  }, [otherDepartments.length > 0 ? otherDepartments[0]?.name : '__init__']);

  const hasEmployees = inUseCount > 0;

  const description = hasEmployees
    ? `Bộ phận "${department.name}" đang có ${inUseCount} nhân viên.${
        isSuperAdmin
          ? ' Chọn bộ phận để chuyển toàn bộ nhân viên sang, hoặc "Chưa phân loại" để bỏ trống.'
          : ' Vui lòng chuyển nhân viên sang bộ phận khác trước khi xóa.'
      }`
    : `Bộ phận "${department.name}" và toàn bộ chức vụ thuộc bộ phận sẽ bị xóa. Hành động này không thể hoàn tác.`;

  const canConfirm = !hasEmployees || isSuperAdmin;

  return (
    <AlertDialog open onOpenChange={(open) => !open && !isPending && onCancel()}>
      <AlertDialogContent className="border-[#E2E8F0] bg-white sm:max-w-md sm:rounded-xl">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-xl font-semibold text-[#1F2A30]">Xóa bộ phận?</AlertDialogTitle>
          <AlertDialogDescription className="text-sm text-[#5C6670]">{description}</AlertDialogDescription>
        </AlertDialogHeader>

        {hasEmployees && isSuperAdmin && (
          <div className="flex flex-col gap-2">
            <Label htmlFor="reassign-department" className="text-sm font-medium text-[#1F2A30]">
              Chuyển nhân viên sang bộ phận:
            </Label>
            <Select value={reassignTo} onValueChange={setReassignTo}>
              <SelectTrigger id="reassign-department" className="h-10 border-[#E2E8F0] bg-white focus-visible:ring-[#4F7284]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">Chưa phân loại</SelectItem>
                {otherDepartments.map((d) => (
                  <SelectItem key={d.id} value={d.name}>
                    {d.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {errorMessage && (
          <p role="alert" className="rounded-md border border-error/40 bg-error/5 px-4 py-3 text-sm text-error">
            {errorMessage}
          </p>
        )}

        <AlertDialogFooter className="gap-2 sm:gap-2">
          <AlertDialogCancel disabled={isPending} className="border-[#E2E8F0] text-[#1F2A30]">
            Hủy
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={(event) => {
              event.preventDefault();
              onConfirm(reassignTo === '__none__' ? null : reassignTo);
            }}
            disabled={isPending || !canConfirm}
            className="bg-error text-white hover:bg-error/90"
          >
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Xóa bộ phận
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
