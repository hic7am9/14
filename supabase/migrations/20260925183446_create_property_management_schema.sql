/*
# Property Management Dashboard Schema (single-tenant, no auth)

1. New Tables
- `locations`: Cities/neighborhoods (e.g. جدة, الخبر, المروة, الواحة) with name and optional display order.
- `apartments`: Apartment profiles — name, number, unit type, building number, floor, Google Maps URL, current status (occupied/ready/not_ready/maintenance), maintenance note, linked to a location.
- `bookings`: Reservation records — guest name, phone, source (airbnb/whatsapp/direct), check-in/check-out dates, total price, payment method, linked to an apartment.
- `guests_archive`: Historical guest records auto-archived on departure — guest name, phone, apartment snapshot, booking source, check-in/check-out dates, archived_at.
- `ical_sync`: iCal import/export metadata per apartment — sync URL, direction, last synced timestamp.

2. Security
- Enable RLS on all tables.
- Allow anon + authenticated CRUD (single-tenant, no sign-in screen, intentionally shared data).

3. Notes
- All timestamps are timestamptz with now() defaults.
- Apartment status uses a text check constraint for valid values.
- Booking source uses a text check constraint for valid values.
- Payment method uses a text check constraint for valid values.
- Guest phone is stored as-is; the frontend sanitizes country codes for WhatsApp links.
*/

CREATE TABLE IF NOT EXISTS locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  display_order int NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE locations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_locations" ON locations;
CREATE POLICY "anon_select_locations" ON locations FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_locations" ON locations;
CREATE POLICY "anon_insert_locations" ON locations FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_locations" ON locations;
CREATE POLICY "anon_update_locations" ON locations FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_locations" ON locations;
CREATE POLICY "anon_delete_locations" ON locations FOR DELETE
  TO anon, authenticated USING (true);

CREATE TABLE IF NOT EXISTS apartments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id uuid REFERENCES locations(id) ON DELETE SET NULL,
  name text NOT NULL,
  apt_number text,
  unit_type text,
  building_number text,
  floor_number text,
  maps_url text,
  status text NOT NULL DEFAULT 'ready' CHECK (status IN ('occupied','ready','not_ready','maintenance')),
  maintenance_note text,
  current_booking_id uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE apartments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_apartments" ON apartments;
CREATE POLICY "anon_select_apartments" ON apartments FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_apartments" ON apartments;
CREATE POLICY "anon_insert_apartments" ON apartments FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_apartments" ON apartments;
CREATE POLICY "anon_update_apartments" ON apartments FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_apartments" ON apartments;
CREATE POLICY "anon_delete_apartments" ON apartments FOR DELETE
  TO anon, authenticated USING (true);

CREATE TABLE IF NOT EXISTS bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  apartment_id uuid REFERENCES apartments(id) ON DELETE CASCADE,
  guest_name text NOT NULL,
  guest_phone text,
  source text NOT NULL DEFAULT 'direct' CHECK (source IN ('airbnb','whatsapp','direct')),
  check_in date NOT NULL,
  check_out date NOT NULL,
  total_price numeric,
  payment_method text CHECK (payment_method IN ('cash','bank_transfer','visa','mada') OR payment_method IS NULL),
  notes text,
  archived boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_bookings" ON bookings;
CREATE POLICY "anon_select_bookings" ON bookings FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_bookings" ON bookings;
CREATE POLICY "anon_insert_bookings" ON bookings FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_bookings" ON bookings;
CREATE POLICY "anon_update_bookings" ON bookings FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_bookings" ON bookings;
CREATE POLICY "anon_delete_bookings" ON bookings FOR DELETE
  TO anon, authenticated USING (true);

CREATE TABLE IF NOT EXISTS guests_archive (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  apartment_id uuid REFERENCES apartments(id) ON DELETE SET NULL,
  apartment_name text,
  apartment_number text,
  location_name text,
  guest_name text NOT NULL,
  guest_phone text,
  source text,
  check_in date,
  check_out date,
  total_price numeric,
  payment_method text,
  notes text,
  archived_at timestamptz DEFAULT now()
);

ALTER TABLE guests_archive ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_guests_archive" ON guests_archive;
CREATE POLICY "anon_select_guests_archive" ON guests_archive FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_guests_archive" ON guests_archive;
CREATE POLICY "anon_insert_guests_archive" ON guests_archive FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_guests_archive" ON guests_archive;
CREATE POLICY "anon_update_guests_archive" ON guests_archive FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_guests_archive" ON guests_archive;
CREATE POLICY "anon_delete_guests_archive" ON guests_archive FOR DELETE
  TO anon, authenticated USING (true);

CREATE TABLE IF NOT EXISTS ical_sync (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  apartment_id uuid REFERENCES apartments(id) ON DELETE CASCADE,
  url text NOT NULL,
  direction text NOT NULL DEFAULT 'import' CHECK (direction IN ('import','export')),
  last_synced timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE ical_sync ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_ical_sync" ON ical_sync;
CREATE POLICY "anon_select_ical_sync" ON ical_sync FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_ical_sync" ON ical_sync;
CREATE POLICY "anon_insert_ical_sync" ON ical_sync FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_ical_sync" ON ical_sync;
CREATE POLICY "anon_update_ical_sync" ON ical_sync FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_ical_sync" ON ical_sync;
CREATE POLICY "anon_delete_ical_sync" ON ical_sync FOR DELETE
  TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_apartments_location ON apartments(location_id);
CREATE INDEX IF NOT EXISTS idx_apartments_status ON apartments(status);
CREATE INDEX IF NOT EXISTS idx_bookings_apartment ON bookings(apartment_id);
CREATE INDEX IF NOT EXISTS idx_bookings_dates ON bookings(check_in, check_out);
CREATE INDEX IF NOT EXISTS idx_guests_archive_apartment ON guests_archive(apartment_id);
CREATE INDEX IF NOT EXISTS idx_guests_archive_archived_at ON guests_archive(archived_at);

-- updated_at trigger for apartments
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS apartments_updated_at ON apartments;
CREATE TRIGGER apartments_updated_at BEFORE UPDATE ON apartments
FOR EACH ROW EXECUTE FUNCTION update_updated_at();
