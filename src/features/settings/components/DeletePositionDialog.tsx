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

interface DeletePositionDialogProps {
  department: Department;
  position: Position;
  allPositionsInDepartment: Position[];
  isSuperAdmin: boolean;
  inUseCount: number;
  isPending: boolean;
  errorMessage: string | null;
  onCancel: () => void;
  onConfirm: (reassignTo: string | null) => void;
}

export function DeletePositionDialog({
  department,
  position,
  allPositionsInDepartment,
  isSuperAdmin,
  inUseCount,
  isPending,
  errorMessage,
  onCancel,
  onConfirm,
}: DeletePositionDialogProps) {
  const otherPositions = allPositionsInDepartment.filter((p) => p.id !== position.id);
  const [reassignTo, setReassignTo] = useState<string>(otherPositions[0]?.name ?? '__none__');

  useEffect(() => {
    setReassignTo(otherPositions[0]?.name ?? '__none__');
  }, [otherPositions.length > 0 ? otherPositions[0]?.name : '__init__']);

  const hasEmployees = inUseCount > 0;

  const description = hasEmployees
    ? `Chức vụ "${position.name}" thuộc bộ phận "${department.name}" đang có ${inUseCount} nhân viên.${
        isSuperAdmin
          ? ' Chọn chức vụ để chuyển nhân viên sang, hoặc "Chưa phân loại" để bỏ trống.'
          : ' Vui lòng chuyển nhân viên sang chức vụ khác trước khi xóa.'
      }`
    : `Chức vụ "${position.name}" sẽ bị xóa khỏi bộ phận "${department.name}". Hành động này không thể hoàn tác.`;

  const canConfirm = !hasEmployees || isSuperAdmin;

  return (
    <AlertDialog open onOpenChange={(open) => !open && !isPending && onCancel()}>
      <AlertDialogContent className="border-[#E2E8F0] bg-white sm:max-w-md sm:rounded-xl">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-xl font-semibold text-[#1F2A30]">Xóa chức vụ?</AlertDialogTitle>
          <AlertDialogDescription className="text-sm text-[#5C6670]">{description}</AlertDialogDescription>
        </AlertDialogHeader>

        {hasEmployees && isSuperAdmin && (
          <div className="flex flex-col gap-2">
            <Label htmlFor="reassign-position" className="text-sm font-medium text-[#1F2A30]">
              Chuyển nhân viên sang chức vụ:
            </Label>
            <Select value={reassignTo} onValueChange={setReassignTo}>
              <SelectTrigger id="reassign-position" className="h-10 border-[#E2E8F0] bg-white focus-visible:ring-[#4F7284]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">Chưa phân loại</SelectItem>
                {otherPositions.map((p) => (
                  <SelectItem key={p.id} value={p.name}>
                    {p.name}
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
            Xóa chức vụ
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
