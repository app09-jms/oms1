/*
# Add identity, residence, and hotel link to employee profiles

1. Modified table: employees
- citizen_id (text, optional)
- citizen_id_issued_date (date, optional)
- citizen_id_issued_place (text, optional)
- permanent_address (text, optional)
- hotel_id (uuid, references hotels.id) — nullable for existing rows, but new rows should provide it

2. Indexes
- employees_hotel_id_idx on hotel_id

3. Security
- Grants INSERT and UPDATE on employees to anon and authenticated.
*/

ALTER TABLE employees
  ADD COLUMN IF NOT EXISTS citizen_id text,
  ADD COLUMN IF NOT EXISTS citizen_id_issued_date date,
  ADD COLUMN IF NOT EXISTS citizen_id_issued_place text,
  ADD COLUMN IF NOT EXISTS permanent_address text,
  ADD COLUMN IF NOT EXISTS hotel_id uuid REFERENCES hotels(id) ON DELETE RESTRICT;

CREATE INDEX IF NOT EXISTS employees_hotel_id_idx ON employees (hotel_id);

GRANT INSERT, UPDATE ON employees TO anon, authenticated;