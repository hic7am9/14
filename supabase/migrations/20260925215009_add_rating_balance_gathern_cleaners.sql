/*
# Add rating, balance, gathern source, cleaner role tables

1. Modified Tables
- `guests_archive`: Add `rating` (int, 0-5, nullable) — 5-star guest rating.
- `bookings`: Add `balance` (numeric, default 0) — outstanding balance (WhatsApp bookings only).
- `bookings`: Add `paid` (boolean, default false) — whether payment is settled.
- `guests_archive`: Add `balance` (numeric, nullable) and `paid` (boolean, nullable) — archived financial data.

2. New Tables
- `cleaners`: Cleaner accounts for future role-based access (username, password_hash, assigned apartment IDs).
- `cleaner_assignments`: Links cleaners to apartments (many-to-many).

3. Security
- Enable RLS on new tables.
- Allow anon + authenticated CRUD (single-tenant, no auth).

4. Notes
- `balance` on bookings tracks outstanding amount for WhatsApp/direct bookings.
- Airbnb and Gathern bookings have automatic payouts — balance stays 0, payment fields hidden.
- `rating` is 0-5 integer, editable from the archive view.
- Cleaner tables are scaffolded for future role-based access but not yet wired to auth.
*/

ALTER TABLE guests_archive ADD COLUMN IF NOT EXISTS rating int CHECK (rating >= 0 AND rating <= 5);
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS balance numeric NOT NULL DEFAULT 0;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS paid boolean NOT NULL DEFAULT false;
ALTER TABLE guests_archive ADD COLUMN IF NOT EXISTS balance numeric;
ALTER TABLE guests_archive ADD COLUMN IF NOT EXISTS paid boolean;

-- Update bookings source constraint to include 'gathern'
ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_source_check;
ALTER TABLE bookings ADD CONSTRAINT bookings_source_check CHECK (source IN ('airbnb','gathern','whatsapp','direct'));

CREATE TABLE IF NOT EXISTS cleaners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username text UNIQUE NOT NULL,
  password_hash text NOT NULL,
  display_name text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE cleaners ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_cleaners" ON cleaners;
CREATE POLICY "anon_select_cleaners" ON cleaners FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_cleaners" ON cleaners;
CREATE POLICY "anon_insert_cleaners" ON cleaners FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_cleaners" ON cleaners;
CREATE POLICY "anon_update_cleaners" ON cleaners FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_cleaners" ON cleaners;
CREATE POLICY "anon_delete_cleaners" ON cleaners FOR DELETE
  TO anon, authenticated USING (true);

CREATE TABLE IF NOT EXISTS cleaner_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cleaner_id uuid REFERENCES cleaners(id) ON DELETE CASCADE,
  apartment_id uuid REFERENCES apartments(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(cleaner_id, apartment_id)
);

ALTER TABLE cleaner_assignments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_cleaner_assignments" ON cleaner_assignments;
CREATE POLICY "anon_select_cleaner_assignments" ON cleaner_assignments FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_cleaner_assignments" ON cleaner_assignments;
CREATE POLICY "anon_insert_cleaner_assignments" ON cleaner_assignments FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_cleaner_assignments" ON cleaner_assignments;
CREATE POLICY "anon_update_cleaner_assignments" ON cleaner_assignments FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_cleaner_assignments" ON cleaner_assignments;
CREATE POLICY "anon_delete_cleaner_assignments" ON cleaner_assignments FOR DELETE
  TO anon, authenticated USING (true);
