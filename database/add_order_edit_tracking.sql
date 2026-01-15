-- Add edit tracking fields to order_items table
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS price_edited_by_seller BOOLEAN DEFAULT FALSE;
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS quantity_edited_by_seller BOOLEAN DEFAULT FALSE;
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS buy_price_edited_by_seller BOOLEAN DEFAULT FALSE;
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS edited_at TIMESTAMP DEFAULT NULL;

-- Add comments for the new fields
COMMENT ON COLUMN order_items.price_edited_by_seller IS 'Flag to track if price was manually edited by seller';
COMMENT ON COLUMN order_items.quantity_edited_by_seller IS 'Flag to track if quantity was manually edited by seller';
COMMENT ON COLUMN order_items.buy_price_edited_by_seller IS 'Flag to track if buy price was manually edited by seller';
COMMENT ON COLUMN order_items.edited_at IS 'Timestamp of when the order item was last edited by seller';