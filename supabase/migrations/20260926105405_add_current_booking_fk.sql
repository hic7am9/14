-- Add foreign key from apartments.current_booking_id to bookings.id
-- This is needed for the Supabase JS client to resolve the current_booking relation
ALTER TABLE apartments
  DROP CONSTRAINT IF EXISTS apartments_current_booking_id_fkey;

ALTER TABLE apartments
  ADD CONSTRAINT apartments_current_booking_id_fkey
  FOREIGN KEY (current_booking_id) REFERENCES bookings(id) ON DELETE SET NULL;
