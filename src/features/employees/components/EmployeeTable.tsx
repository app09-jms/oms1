import { Pencil, Trash2, UserPlus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatDisplayDate, EMPLOYMENT_STATUS_LABELS, type EmployeeProfile, type EmploymentStatus } from '@/features/employees/employeeRules';
import { getInitials } from '@/lib/text';
import { cn } from '@/lib/utils';

interface EmployeeTableProps {
  rows: EmployeeProfile[];
  hotelNameById: Map<string, string>;
  isLoading: boolean;
  isSaving: boolean;
  emptyMessage: string;
  onEdit: (profile: EmployeeProfile) => void;
  onDelete: (profile: EmployeeProfile) => void;
  onToggleLeave: (profile: EmployeeProfile, enabled: boolean) => void;
  canCreateAccount: boolean;
  onCreateAccount: (profile: EmployeeProfile) => void;
}

const COLUMN_COUNT = 15;

const HEAD_CLASS = 'whitespace-nowrap text-[#5C6670]';

const STATUS_BADGE_CLASS: Record<EmploymentStatus, string> = {
  official: 'border-transparent bg-success/10 text-success hover:bg-success/10',
  probation: 'border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-50',
  resigned: 'border-[#E2E8F0] bg-[#F1F5F9] text-[#5C6670] hover:bg-[#F1F5F9]',
};

export function EmployeeTable({
  rows,
  hotelNameById,
  isLoading,
  isSaving,
  emptyMessage,
  onEdit,
  onDelete,
  onToggleLeave,
  canCreateAccount,
  onCreateAccount,
}: EmployeeTableProps) {
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className={cn('w-[60px]', HEAD_CLASS)}>STT</TableHead>
            <TableHead className={HEAD_CLASS}>Mã NV</TableHead>
            <TableHead className={HEAD_CLASS}>Họ và tên</TableHead>
            <TableHead className={HEAD_CLASS}>Tên hiển thị</TableHead>
            <TableHead className={HEAD_CLASS}>Bộ phận</TableHead>
            <TableHead className={HEAD_CLASS}>Khách sạn</TableHead>
            <TableHead className={HEAD_CLASS}>Số CCCD</TableHead>
            <TableHead className={HEAD_CLASS}>Chức vụ</TableHead>
            <TableHead className={HEAD_CLASS}>Ngày thử việc</TableHead>
            <TableHead className={HEAD_CLASS}>Ngày chính thức</TableHead>
            <TableHead className={HEAD_CLASS}>Trạng thái làm việc</TableHead>
            <TableHead className={HEAD_CLASS}>SĐT & Email</TableHead>
            <TableHead className={HEAD_CLASS}>Theo dõi phép</TableHead>
            <TableHead className={HEAD_CLASS}>Trạng thái liên kết</TableHead>
            <TableHead className={cn('text-right', HEAD_CLASS)}>Thao tác</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading && (
            <TableRow>
              <TableCell colSpan={COLUMN_COUNT} className="py-10 text-center text-[#5C6670]">
                Đang tải danh sách nhân viên...
              </TableCell>
            </TableRow>
          )}
          {!isLoading && rows.length === 0 && (
            <TableRow>
              <TableCell colSpan={COLUMN_COUNT} className="py-10 text-center text-[#5C6670]">
                {emptyMessage}
              </TableCell>
            </TableRow>
          )}
          {!isLoading &&
            rows.map((profile, index) => (
              <TableRow key={profile.code} className="transition-colors duration-150 hover:bg-[#F8FAFC]">
                <TableCell className="tabular-nums text-[#5C6670]">{index + 1}</TableCell>
                <TableCell className="whitespace-nowrap font-medium tabular-nums text-[#1F2A30]">{profile.code}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#4F7284]/10 text-xs font-semibold text-[#4F7284]">
                      {getInitials(profile.fullName)}
                    </div>
                    <span className="whitespace-nowrap font-medium text-[#1F2A30]">{profile.fullName}</span>
                  </div>
                </TableCell>
                <TableCell className="whitespace-nowrap text-[#1F2A30]">{profile.displayName || '—'}</TableCell>
                <TableCell className="whitespace-nowrap text-[#1F2A30]">{profile.department || 'Chưa phân loại'}</TableCell>
                <TableCell className="whitespace-nowrap text-[#1F2A30]">{hotelNameById.get(profile.hotelId) ?? '—'}</TableCell>
                <TableCell className="whitespace-nowrap tabular-nums text-[#1F2A30]">{profile.citizenId || '—'}</TableCell>
                <TableCell className="whitespace-nowrap text-[#1F2A30]">{profile.position || 'Chưa phân loại'}</TableCell>
                <TableCell className="whitespace-nowrap tabular-nums text-[#1F2A30]">
                  {formatDisplayDate(profile.probationDate)}
                </TableCell>
                <TableCell className="whitespace-nowrap tabular-nums text-[#1F2A30]">
                  {formatDisplayDate(profile.officialDate)}
                </TableCell>
                <TableCell>
                  <Badge
                    className={cn('whitespace-nowrap px-2.5 py-0.5 font-medium', STATUS_BADGE_CLASS[profile.employmentStatus])}
                  >
                    {EMPLOYMENT_STATUS_LABELS[profile.employmentStatus]}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex flex-col gap-0.5">
                    <span className="whitespace-nowrap text-sm tabular-nums text-[#1F2A30]">{profile.phone || '—'}</span>
                    <span className="whitespace-nowrap text-xs text-[#5C6670]">{profile.email || '—'}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={profile.leaveTracking}
                      disabled={isSaving}
                      onCheckedChange={(checked) => onToggleLeave(profile, checked)}
                      aria-label={`Theo dõi phép của ${profile.fullName}`}
                      className="data-[state=checked]:bg-[#4F7284]"
                    />
                    <span className="text-xs text-[#5C6670]">{profile.leaveTracking ? 'Bật' : 'Tắt'}</span>
                  </div>
                </TableCell>
                <TableCell>
                  {profile.appUserSystemUid !== null ? (
                    <Badge className="whitespace-nowrap border-transparent bg-success/10 px-2.5 py-0.5 font-medium text-success hover:bg-success/10">
                      Đã liên kết tài khoản
                    </Badge>
                  ) : (
                    <Badge className="whitespace-nowrap border-[#E2E8F0] bg-[#F1F5F9] px-2.5 py-0.5 font-medium text-[#5C6670] hover:bg-[#F1F5F9]">
                      Chưa liên kết tài khoản
                    </Badge>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex items-center justify-end gap-1">
                    {canCreateAccount && !profile.hasAccount && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        aria-label={`Tạo tài khoản cho ${profile.fullName}`}
                        disabled={isSaving}
                        onClick={() => onCreateAccount(profile)}
                        className="h-8 gap-1.5 whitespace-nowrap px-2 text-[#4F7284] hover:bg-[#4F7284]/10 hover:text-[#3F5C6C]"
                      >
                        <UserPlus className="h-4 w-4" />
                        Tạo tài khoản
                      </Button>
                    )}
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label={`Sửa hồ sơ ${profile.fullName}`}
                      disabled={isSaving}
                      onClick={() => onEdit(profile)}
                      className="h-8 w-8 text-[#4F7284] hover:bg-[#4F7284]/10 hover:text-[#3F5C6C]"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label={`Xóa nhân viên ${profile.fullName}`}
                      disabled={isSaving}
                      onClick={() => onDelete(profile)}
                      className="h-8 w-8 text-[#5C6670] hover:bg-error/10 hover:text-error"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
        </TableBody>
      </Table>
    </div>
  );
}
