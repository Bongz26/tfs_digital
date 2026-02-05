# How to Fix Wrong Vehicle/Driver Assignment

If you assigned the wrong vehicle or driver to a case, here are several ways to fix it:

## Method 1: Using SQL Script (Recommended)

### Step 1: Find the Case ID
Run this query to find your case:
```sql
SELECT id, case_number, deceased_name, funeral_date 
FROM cases 
WHERE case_number = 'THS-2025-XXX'  -- Replace with your case number
   OR deceased_name LIKE '%Name%';  -- Or search by name
```

### Step 2: Check Current Assignment
```sql
SELECT 
  r.id as roster_id,
  r.case_id,
  c.case_number,
  c.deceased_name,
  r.vehicle_id,
  v.reg_number,
  v.type as vehicle_type,
  v.available as vehicle_available,
  r.driver_name,
  r.pickup_time,
  r.status
FROM roster r
JOIN cases c ON r.case_id = c.id
JOIN vehicles v ON r.vehicle_id = v.id
WHERE r.case_id = 5;  -- Replace with your case ID
```

### Step 3: Fix the Assignment
Run this in Supabase SQL Editor (replace the values):

```sql
BEGIN;

-- Update roster with correct vehicle and driver
UPDATE roster
SET 
  vehicle_id = 7,              -- Replace with correct vehicle ID
  driver_name = 'J MOFOKENG',  -- Replace with correct driver name
  updated_at = NOW()
WHERE case_id = 5;              -- Replace with your case ID

-- Mark old vehicle as available
UPDATE vehicles
SET available = true
WHERE id = 3;                   -- Replace with old/incorrect vehicle ID

-- Mark new vehicle as unavailable
UPDATE vehicles
SET available = false
WHERE id = 7;                   -- Replace with new/correct vehicle ID

COMMIT;
```

## Method 2: Using Node.js Script

Run this command in your terminal:

```bash
node server/database/fix-vehicle-assignment.js <caseId> <newVehicleId> <newDriverName>
```

**Example:**
```bash
node server/database/fix-vehicle-assignment.js 5 7 "J MOFOKENG"
```

This will:
- Update the roster entry
- Mark the old vehicle as available
- Mark the new vehicle as unavailable

## Method 3: Quick Fixes

### Only Change Driver (Vehicle Stays Same)
```sql
UPDATE roster
SET driver_name = 'CORRECT_DRIVER_NAME', 
    updated_at = NOW()
WHERE case_id = 5;  -- Replace with case ID
```

### Only Change Vehicle (Driver Stays Same)
```sql
BEGIN;
UPDATE roster SET vehicle_id = 7, updated_at = NOW() WHERE case_id = 5;
UPDATE vehicles SET available = true WHERE id = 3;   -- Old vehicle
UPDATE vehicles SET available = false WHERE id = 7;  -- New vehicle
COMMIT;
```

### Remove Assignment Completely
```sql
BEGIN;
DELETE FROM roster WHERE case_id = 5;  -- Replace with case ID
UPDATE vehicles SET available = true WHERE id = 3;  -- Replace with vehicle ID
COMMIT;
```

### Remove Driver Only (Keep Vehicle Assigned)
```sql
UPDATE roster
SET driver_name = 'TBD', 
    updated_at = NOW()
WHERE case_id = 5;  -- Replace with case ID
```

### Remove Driver and Free Vehicle (Remove Entire Assignment)
```sql
BEGIN;
-- Remove driver assignment
UPDATE roster 
SET driver_name = 'TBD', 
    updated_at = NOW() 
WHERE case_id = 5;  -- Replace with case ID

-- Get vehicle ID and mark as available
UPDATE vehicles 
SET available = true 
WHERE id = (
  SELECT vehicle_id 
  FROM roster 
  WHERE case_id = 5  -- Replace with case ID
);

-- Optional: Delete roster entry completely
-- DELETE FROM roster WHERE case_id = 5;

COMMIT;
```

## Finding Vehicle IDs

To find vehicle IDs:
```sql
SELECT id, reg_number, type, available 
FROM vehicles 
ORDER BY reg_number;
```

## Finding Driver Names

To find available drivers:
```sql
SELECT id, name, contact, active 
FROM drivers 
WHERE active = true 
ORDER BY name;
```

## Important Notes

1. **Always use transactions** (`BEGIN` and `COMMIT`) when making multiple updates
2. **Check the assignment first** before making changes
3. **Verify vehicle availability** after fixing
4. **Test in development** before running on production database

## Removing a Driver

### Option 1: Remove Driver Only (Keep Vehicle Assigned)
The vehicle stays assigned to the case, but no driver is assigned:

```sql
UPDATE roster
SET driver_name = 'TBD', 
    updated_at = NOW()
WHERE case_id = 5;  -- Replace with case ID
```

### Option 2: Remove Driver and Free Vehicle
Remove the driver AND mark the vehicle as available:

```sql
BEGIN;
UPDATE roster SET driver_name = 'TBD', updated_at = NOW() WHERE case_id = 5;
UPDATE vehicles SET available = true WHERE id = (SELECT vehicle_id FROM roster WHERE case_id = 5);
COMMIT;
```

### Option 3: Using Node.js Script
```bash
# Remove driver only (vehicle stays assigned)
node server/database/remove-driver.js 5

# Remove driver AND free vehicle
node server/database/remove-driver.js 5 --free-vehicle
```

## Need Help?

If you're unsure about the case ID or vehicle ID, run the check queries first to verify the current state before making changes.

