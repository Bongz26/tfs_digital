-- Simple SQL to fix the constraint issue
-- Run this if you get "constraint already exists" error

-- Step 1: Force drop the constraint (even if it exists)
ALTER TABLE vehicles DROP CONSTRAINT IF EXISTS vehicles_type_check CASCADE;

-- Step 2: Add the new constraint
ALTER TABLE vehicles 
ADD CONSTRAINT vehicles_type_check 
CHECK (type IN ('fortuner', 'vito', 'v_class', 'truck', 'q7', 'hilux'));

-- Step 3: Remove driver columns
ALTER TABLE vehicles DROP COLUMN IF EXISTS driver_name;
ALTER TABLE vehicles DROP COLUMN IF EXISTS driver_contact;

-- Step 4: Verify
SELECT id, reg_number, type, available FROM vehicles LIMIT 5;

