import { Briefcase, Building2, CalendarDays, CreditCard, MapPin, Stamp, type LucideIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  EMPLOYMENT_STATUS_LABELS,
  formatDisplayDate,
  type EmployeeProfile,
  type EmploymentStatus,
} from '@/features/employees/employeeRules';
import { getInitials } from '@/lib/text';
import { cn } from '@/lib/utils';

interface EmployeeProfileCardProps {
  profile: EmployeeProfile;
  hotelName: string;
}

const STATUS_BADGE_CLASS: Record<EmploymentStatus, string> = {
  official: 'border-transparent bg-success/10 text-success hover:bg-success/10',
  probation: 'border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-50',
  resigned: 'border-[#E2E8F0] bg-[#F1F5F9] text-[#5C6670] hover:bg-[#F1F5F9]',
};

interface InfoItemProps {
  icon: LucideIcon;
  label: string;
  value: string;
}

function InfoItem({ icon: Icon, label, value }: InfoItemProps) {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-[#E2E8F0] bg-white p-3">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-[#4F7284]/10 text-[#4F7284]">
        <Icon className="h-4 w-4" aria-hidden="true" />
      </div>
      <div className="flex min-w-0 flex-col gap-0.5">
        <span className="text-xs font-medium uppercase tracking-wide text-[#5C6670]">{label}</span>
        <span className="break-words text-sm font-medium text-[#1F2A30]">{value || '—'}</span>
      </div>
    </div>
  );
}

export function EmployeeProfileCard({ profile, hotelName }: EmployeeProfileCardProps) {
  const startDate = profile.probationDate ?? profile.officialDate;
  return (
    <article className="mx-auto flex w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-[#E2E8F0] bg-white shadow-sm">
      <header className="flex flex-col gap-4 border-b border-[#E2E8F0] bg-[#F8FAFC] p-6 sm:flex-row sm:items-center">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-[#4F7284] text-lg font-semibold text-white">
          {getInitials(profile.fullName)}
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <h2 className="text-xl font-semibold text-[#1F2A30]">{profile.fullName}</h2>
          <p className="text-sm text-[#5C6670]">{profile.position || profile.department || 'Chưa phân loại'}</p>
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <Badge variant="outline" className="border-[#E2E8F0] bg-white font-medium tabular-nums text-[#1F2A30]">
              {profile.code}
            </Badge>
            <Badge className={cn('whitespace-nowrap font-medium', STATUS_BADGE_CLASS[profile.employmentStatus])}>
              {EMPLOYMENT_STATUS_LABELS[profile.employmentStatus]}
            </Badge>
            <Badge variant="outline" className="border-[#4F7284]/20 bg-[#4F7284]/10 font-medium text-[#3D5B69]">
              {hotelName || '—'}
            </Badge>
          </div>
        </div>
      </header>

      <div className="flex flex-col gap-6 p-6">
        <section className="flex flex-col gap-3">
          <h3 className="text-sm font-semibold text-[#1F2A30]">Thông tin cá nhân & Định danh</h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <InfoItem icon={CreditCard} label="Số CCCD" value={profile.citizenId} />
            <InfoItem
              icon={CalendarDays}
              label="Ngày cấp"
              value={formatDisplayDate(profile.citizenIdIssuedDate)}
            />
            <InfoItem icon={Stamp} label="Nơi cấp" value={profile.citizenIdIssuedPlace} />
            <InfoItem icon={MapPin} label="Địa chỉ thường trú" value={profile.permanentAddress} />
          </div>
        </section>

        <section className="flex flex-col gap-3">
          <h3 className="text-sm font-semibold text-[#1F2A30]">Công việc & Phòng ban</h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <InfoItem icon={Building2} label="Phòng ban" value={profile.department || 'Chưa phân loại'} />
            <InfoItem icon={Building2} label="Khách sạn" value={hotelName} />
            <InfoItem icon={Briefcase} label="Chức vụ" value={profile.position || 'Chưa phân loại'} />
            <InfoItem icon={CalendarDays} label="Ngày vào làm" value={formatDisplayDate(startDate)} />
          </div>
        </section>
      </div>
    </article>
  );
}
