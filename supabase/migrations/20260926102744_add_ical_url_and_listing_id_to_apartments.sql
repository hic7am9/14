-- Add iCal URL and Airbnb Listing ID/API Key to apartments for automated booking sync
ALTER TABLE apartments ADD COLUMN IF NOT EXISTS ical_url text;
ALTER TABLE apartments ADD COLUMN IF NOT EXISTS airbnb_listing_id text;
