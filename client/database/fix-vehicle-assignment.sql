-- Fix Wrong Vehicle/Driver Assignment
-- Instructions:
-- 1. Replace CASE_ID with the actual case ID
-- 2. Replace OLD_VEHICLE_ID with the vehicle ID that was incorrectly assigned
-- 3. Replace NEW_VEHICLE_ID with the correct vehicle ID (or keep OLD_VEHICLE_ID if only driver is wrong)
-- 4. Replace 'NEW_DRIVER_NAME' with the correct driver name (or keep existing if only vehicle is wrong)
-- 5. Run this script in Supabase SQL Editor

-- Example: Fix case ID 5, change from vehicle 3 to vehicle 7, change driver to "J MOFOKENG"
-- BEGIN;

-- Step 1: Update the roster entry with correct vehicle and driver
UPDATE roster
SET 
  vehicle_id = NEW_VEHICLE_ID,  -- Replace with correct vehicle ID
  driver_name = 'NEW_DRIVER_NAME',  -- Replace with correct driver name
  updated_at = NOW()
WHERE case_id = CASE_ID;  -- Replace with actual case ID

-- Step 2: Mark the OLD vehicle as available again (if vehicle changed)
UPDATE vehicles
SET available = true
WHERE id = OLD_VEHICLE_ID;  -- Replace with the old/incorrect vehicle ID

-- Step 3: Mark the NEW vehicle as unavailable (if vehicle changed)
UPDATE vehicles
SET available = false
WHERE id = NEW_VEHICLE_ID;  -- Replace with the new/correct vehicle ID

-- COMMIT;

-- ============================================
-- ACTUAL EXAMPLE (uncomment and modify):
-- ============================================
-- BEGIN;
-- 
-- -- Fix case ID 5: Change from vehicle 3 to vehicle 7, driver to "J MOFOKENG"
-- UPDATE roster
-- SET 
--   vehicle_id = 7,
--   driver_name = 'J MOFOKENG',
--   updated_at = NOW()
-- WHERE case_id = 5;
-- 
-- -- Mark old vehicle (3) as available
-- UPDATE vehicles
-- SET available = true
-- WHERE id = 3;
-- 
-- -- Mark new vehicle (7) as unavailable
-- UPDATE vehicles
-- SET available = false
-- WHERE id = 7;
-- 
-- COMMIT;

-- ============================================
-- QUICK FIXES:
-- ============================================

-- Option 1: Only change the driver (vehicle stays the same)
-- UPDATE roster
-- SET driver_name = 'CORRECT_DRIVER_NAME', updated_at = NOW()
-- WHERE case_id = CASE_ID;

-- Option 2: Only change the vehicle (driver stays the same)
-- BEGIN;
-- UPDATE roster SET vehicle_id = NEW_VEHICLE_ID, updated_at = NOW() WHERE case_id = CASE_ID;
-- UPDATE vehicles SET available = true WHERE id = OLD_VEHICLE_ID;
-- UPDATE vehicles SET available = false WHERE id = NEW_VEHICLE_ID;
-- COMMIT;

-- Option 3: Remove assignment completely
-- BEGIN;
-- DELETE FROM roster WHERE case_id = CASE_ID;
-- UPDATE vehicles SET available = true WHERE id = OLD_VEHICLE_ID;
-- COMMIT;

-- Option 4: Remove driver only (keep vehicle assigned)
-- UPDATE roster
-- SET driver_name = 'TBD', updated_at = NOW()
-- WHERE case_id = CASE_ID;

-- Option 5: Remove driver and mark vehicle as available (remove entire assignment)
-- BEGIN;
-- UPDATE roster SET driver_name = 'TBD', updated_at = NOW() WHERE case_id = CASE_ID;
-- UPDATE vehicles SET available = true WHERE id = (SELECT vehicle_id FROM roster WHERE case_id = CASE_ID);
-- COMMIT;

-- ============================================
-- CHECK CURRENT ASSIGNMENT:
-- ============================================
-- SELECT 
--   r.id as roster_id,
--   r.case_id,
--   c.case_number,
--   c.deceased_name,
--   r.vehicle_id,
--   v.reg_number,
--   v.type as vehicle_type,
--   v.available as vehicle_available,
--   r.driver_name,
--   r.pickup_time,
--   r.status
-- FROM roster r
-- JOIN cases c ON r.case_id = c.id
-- JOIN vehicles v ON r.vehicle_id = v.id
-- WHERE r.case_id = CASE_ID;  -- Replace with actual case ID

