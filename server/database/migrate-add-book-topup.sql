-- Migration: Add book top-up support to cases table
-- Date: 2025-12-30
-- Purpose: Allow tracking whether top-up is from cash or book(s)

-- Add top_up_type column (cash, book, multiple_books)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'cases' AND column_name = 'top_up_type'
    ) THEN
        ALTER TABLE cases ADD COLUMN top_up_type VARCHAR(20) DEFAULT 'cash';
        RAISE NOTICE 'Added top_up_type column';
    ELSE
        RAISE NOTICE 'top_up_type column already exists';
    END IF;
END $$;

-- Add top_up_reference column (to store book number(s))
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'cases' AND column_name = 'top_up_reference'
    ) THEN
        ALTER TABLE cases ADD COLUMN top_up_reference VARCHAR(255);
        RAISE NOTICE 'Added top_up_reference column';
    ELSE
        RAISE NOTICE 'top_up_reference column already exists';
    END IF;
END $$;

-- Update existing records to have default values
UPDATE cases 
SET top_up_type = 'cash' 
WHERE top_up_type IS NULL AND top_up_amount > 0;

-- Add comment for documentation
COMMENT ON COLUMN cases.top_up_type IS 'Type of top-up: cash, book, or multiple_books';
COMMENT ON COLUMN cases.top_up_reference IS 'Book number(s) if top-up is from book. Multiple books separated by comma';

-- Verify the migration
SELECT 
    column_name, 
    data_type, 
    column_default,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'cases' 
  AND column_name IN ('top_up_type', 'top_up_reference', 'top_up_amount')
ORDER BY column_name;
