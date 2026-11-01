/*
# Add four day statuses to shift types

1. Summary
- Each shift type now has a `day_status` with four values: 'workday', 'off', 'annual_leave', 'compensatory_leave'.
- The existing `is_working` flag is kept for current readers and is kept in agreement with the new status.

2. Changes
- Adds `shift_types.day_status` (NOT NULL, default 'workday').
- Backfills existing rows: rows with is_working = false become 'off'.
- Check: day_status must be one of the four values.
- Check: is_working is true exactly when day_status = 'workday'.
- Check: leave statuses ('annual_leave', 'compensatory_leave') must carry a coefficient of 1.0.

3. Notes
- No columns are dropped or renamed, so existing data and references are preserved.
- Re-running is safe: the column uses ADD COLUMN IF NOT EXISTS and constraints are dropped before they are re-added.
*/

ALTER TABLE public.shift_types ADD COLUMN IF NOT EXISTS day_status text NOT NULL DEFAULT 'workday';

UPDATE public.shift_types SET day_status = 'off' WHERE is_working = false AND day_status = 'workday';

ALTER TABLE public.shift_types DROP CONSTRAINT IF EXISTS shift_types_day_status_check;
ALTER TABLE public.shift_types ADD CONSTRAINT shift_types_day_status_check
  CHECK (day_status IN ('workday', 'off', 'annual_leave', 'compensatory_leave'));

ALTER TABLE public.shift_types DROP CONSTRAINT IF EXISTS shift_types_day_status_working_check;
ALTER TABLE public.shift_types ADD CONSTRAINT shift_types_day_status_working_check
  CHECK (is_working = (day_status = 'workday'));

ALTER TABLE public.shift_types DROP CONSTRAINT IF EXISTS shift_types_leave_coefficient_check;
ALTER TABLE public.shift_types ADD CONSTRAINT shift_types_leave_coefficient_check
  CHECK (day_status NOT IN ('annual_leave', 'compensatory_leave') OR he_so_cong = 1);
