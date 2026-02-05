-- Migration: Remove driver columns from vehicles table and update constraint
-- This fixes the conflict when updating/deleting vehicles
--
-- IMPORTANT: Run this ONLY after updating all vehicle types to valid values!
-- Use: node database/update-vehicle-types.js first

-- Step 1: Check for invalid types (run this first to see what needs updating)
-- SELECT id, reg_number, type 
-- FROM vehicles 
-- WHERE type NOT IN ('fortuner', 'vito', 'v_class', 'truck', 'q7', 'hilux')
--    OR type IS NULL;

-- Step 2: Drop the old vehicle type constraint (if it exists with old types)
-- Note: CASCADE might be needed if there are dependent objects
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'vehicles_type_check' 
        AND conrelid = 'vehicles'::regclass
    ) THEN
        ALTER TABLE vehicles DROP CONSTRAINT vehicles_type_check;
        RAISE NOTICE 'Dropped existing constraint';
    ELSE
        RAISE NOTICE 'Constraint does not exist';
    END IF;
END $$;

-- Step 3: Add the new constraint with updated vehicle types
-- Only add if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'vehicles_type_check' 
        AND conrelid = 'vehicles'::regclass
    ) THEN
        ALTER TABLE vehicles 
        ADD CONSTRAINT vehicles_type_check 
        CHECK (type IN ('fortuner', 'vito', 'v_class', 'truck', 'q7', 'hilux'));
        RAISE NOTICE 'Added new constraint';
    ELSE
        RAISE NOTICE 'Constraint already exists';
    END IF;
END $$;

-- Step 4: Remove driver columns from vehicles table (if they exist)
-- Note: This will delete the driver_name and driver_contact data
-- Make sure you've migrated this data to the drivers table first!
ALTER TABLE vehicles DROP COLUMN IF EXISTS driver_name;
ALTER TABLE vehicles DROP COLUMN IF EXISTS driver_contact;

-- Step 5: Verify the constraint is working
-- This should return all vehicles with their types
SELECT id, reg_number, type, available FROM vehicles;

