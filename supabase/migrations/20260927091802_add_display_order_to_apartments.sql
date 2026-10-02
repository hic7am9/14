-- Add display_order to apartments for manual reordering
ALTER TABLE apartments ADD COLUMN IF NOT EXISTS display_order integer DEFAULT 0;

-- Initialize display_order based on creation order
UPDATE apartments SET display_order = EXTRACT(EPOCH FROM created_at)::integer WHERE display_order = 0;
