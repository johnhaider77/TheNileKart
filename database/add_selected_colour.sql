-- Add selected_colour column to order_items table
-- This allows tracking colour selection for items with size variants

ALTER TABLE order_items
ADD COLUMN IF NOT EXISTS selected_colour VARCHAR(100) DEFAULT 'Default';

-- Update existing order items to have default colour
UPDATE order_items
SET selected_colour = 'Default'
WHERE selected_colour IS NULL;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_order_items_selected_colour ON order_items(selected_colour);
