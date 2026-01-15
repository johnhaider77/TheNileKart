-- Add other_profit_loss and tracking columns to order_items table

-- Add other_profit_loss column
ALTER TABLE order_items 
ADD COLUMN IF NOT EXISTS other_profit_loss DECIMAL(10, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS other_profit_loss_edited_by_seller BOOLEAN DEFAULT FALSE;

-- Update existing records to have default values
UPDATE order_items 
SET other_profit_loss = 0, other_profit_loss_edited_by_seller = FALSE 
WHERE other_profit_loss IS NULL;