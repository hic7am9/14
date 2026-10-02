/*
# Add guest email and Airbnb account linking

1. Modified Tables
- `bookings`: Add `guest_email` (text, nullable) — guest's email address for direct/WhatsApp bookings.
- `guests_archive`: Add `guest_email` (text, nullable) — archived guest email.
- `apartments`: Add `airbnb_account` (text, nullable) — which Airbnb Gmail account this apartment is linked to (hic7am.skills or hic7am1998).

2. Security
- No new tables. Existing RLS policies cover the new columns automatically.

3. Notes
- All new columns are nullable so existing rows are unaffected.
- airbnb_account is a free-text field constrained by the app to two known values.
*/

ALTER TABLE bookings ADD COLUMN IF NOT EXISTS guest_email text;
ALTER TABLE guests_archive ADD COLUMN IF NOT EXISTS guest_email text;
ALTER TABLE apartments ADD COLUMN IF NOT EXISTS airbnb_account text;
