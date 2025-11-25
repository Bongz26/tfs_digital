-- Migration: Add notes column to inventory table
-- Run this to add a notes/comments field to inventory items

-- Add notes column if it doesn't exist
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS notes TEXT;

-- Add SKU column if it doesn't exist (for reference)
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS sku VARCHAR(50);

-- Add supplier_id column if it doesn't exist (link to suppliers)
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS supplier_id INT REFERENCES suppliers(id);

-- Create index for faster supplier lookups
CREATE INDEX IF NOT EXISTS idx_inventory_supplier_id ON inventory(supplier_id);

-- Verify the changes
SELECT column_name, data_type, character_maximum_length 
FROM information_schema.columns 
WHERE table_name = 'inventory' 
ORDER BY ordinal_position;

