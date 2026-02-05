-- Migration: Update Vehicle Types
-- Changes vehicle types from old system (hearse, family_car, bus, backup) 
-- to new system (fortuner, vito, v_class, truck, q7, hilux)
-- 
-- IMPORTANT: Before running this migration, update your existing vehicle records
-- to use the new types. This script only updates the table constraint.

-- Step 1: Drop the old constraint
ALTER TABLE vehicles DROP CONSTRAINT IF EXISTS vehicles_type_check;

-- Step 2: Add the new constraint with new vehicle types
ALTER TABLE vehicles 
ADD CONSTRAINT vehicles_type_check 
CHECK (type IN ('fortuner', 'vito', 'v_class', 'truck', 'q7', 'hilux'));

-- Step 3: Update existing vehicles (if any) - YOU MUST UPDATE THESE MANUALLY
-- Example mappings (adjust based on your actual vehicles):
-- UPDATE vehicles SET type = 'fortuner' WHERE type = 'hearse' AND reg_number = 'HVR 607 FS';
-- UPDATE vehicles SET type = 'vito' WHERE type = 'family_car' AND reg_number = 'TSF 145 FS';
-- UPDATE vehicles SET type = 'v_class' WHERE type = 'hearse' AND reg_number = 'THS 001 FS';
-- UPDATE vehicles SET type = 'truck' WHERE type = 'family_car' AND reg_number = 'THS 002 FS';
-- UPDATE vehicles SET type = 'q7' WHERE type = 'bus' AND reg_number = 'THS 003 FS';
-- UPDATE vehicles SET type = 'hilux' WHERE type = 'backup' AND reg_number = 'THS 004 FS';

-- Note: If you have existing vehicles with old types, you'll need to manually
-- update each one to a new type before the constraint will allow it.

