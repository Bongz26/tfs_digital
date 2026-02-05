-- Migration: Add created_at and updated_at to inventory table
-- Run this if your inventory table already exists without these columns

-- Add created_at column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'inventory' AND column_name = 'created_at'
    ) THEN
        ALTER TABLE inventory ADD COLUMN created_at TIMESTAMP DEFAULT NOW();
    END IF;
END $$;

-- Add updated_at column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'inventory' AND column_name = 'updated_at'
    ) THEN
        ALTER TABLE inventory ADD COLUMN updated_at TIMESTAMP DEFAULT NOW();
    END IF;
END $$;

-- Update existing rows to have timestamps
UPDATE inventory SET created_at = NOW() WHERE created_at IS NULL;
UPDATE inventory SET updated_at = NOW() WHERE updated_at IS NULL;

