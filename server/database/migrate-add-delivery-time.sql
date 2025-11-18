-- Migration: Add delivery_date and delivery_time columns to cases table
-- Run this if the columns don't exist yet

-- Add delivery_date column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'cases' AND column_name = 'delivery_date'
    ) THEN
        ALTER TABLE cases ADD COLUMN delivery_date DATE;
        RAISE NOTICE 'Added delivery_date column';
    ELSE
        RAISE NOTICE 'delivery_date column already exists';
    END IF;
END $$;

-- Add delivery_time column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'cases' AND column_name = 'delivery_time'
    ) THEN
        ALTER TABLE cases ADD COLUMN delivery_time TIME;
        RAISE NOTICE 'Added delivery_time column';
    ELSE
        RAISE NOTICE 'delivery_time column already exists';
    END IF;
END $$;

-- Verify columns were added
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'cases' 
  AND column_name IN ('delivery_date', 'delivery_time');

