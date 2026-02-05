# Vehicle Types Migration Guide

## Overview

The vehicle types have been updated from the old system to match your actual fleet:
- **Old types:** `hearse`, `family_car`, `bus`, `backup`
- **New types:** `fortuner`, `vito`, `v_class`, `truck`, `q7`, `hilux`

---

## What Has Been Updated

✅ **Schema file** (`server/database/schema.sql`) - Updated table definition
✅ **Seed data** - Updated example vehicles in schema.sql
✅ **Insert script** (`server/database/insert-vehicles.js`) - Updated validation
✅ **Vehicle data** (`server/database/vehicles-data.json`) - Updated example data

---

## For New Databases

If you're creating a new database, just run the updated `schema.sql` file. The new vehicle types are already included.

---

## For Existing Databases

**⚠️ IMPORTANT:** If you're getting constraint errors when updating/deleting vehicles, run the migration script first!

### Quick Fix for Constraint Errors

If you see errors like:
```
ERROR: 23514: new row for relation "vehicles" violates check constraint "vehicles_type_check"
```

Run this migration script:
```bash
cd server
node database/migrate-vehicles-remove-drivers.js
```

This will:
- Update the vehicle type constraint
- Remove old driver columns from vehicles table
- Verify all vehicles have valid types

---

### Manual Migration Steps

If you already have vehicles in your database, follow these steps:

### Step 1: Update Existing Vehicle Records

First, update all your existing vehicles to use the new types. You need to map each vehicle to the correct new type.

**Example SQL commands:**

```sql
-- Update each vehicle individually based on what it actually is
UPDATE vehicles SET type = 'fortuner' WHERE reg_number = 'HVR 607 FS';
UPDATE vehicles SET type = 'vito' WHERE reg_number = 'TSF 145 FS';
UPDATE vehicles SET type = 'v_class' WHERE reg_number = 'THS 001 FS';
UPDATE vehicles SET type = 'truck' WHERE reg_number = 'THS 002 FS';
UPDATE vehicles SET type = 'q7' WHERE reg_number = 'THS 003 FS';
UPDATE vehicles SET type = 'hilux' WHERE reg_number = 'THS 004 FS';
```

**Important:** Replace the registration numbers and types with your actual vehicles!

### Step 2: Run the Migration Script

After updating all vehicles, run the migration script:

```bash
cd server
node database/migrate-vehicle-types.js
```

This will:
- Drop the old constraint
- Add the new constraint with the new vehicle types
- Verify no vehicles have old types

### Alternative: Manual SQL Migration

If you prefer to run SQL directly:

```sql
-- Drop old constraint
ALTER TABLE vehicles DROP CONSTRAINT IF EXISTS vehicles_type_check;

-- Add new constraint
ALTER TABLE vehicles 
ADD CONSTRAINT vehicles_type_check 
CHECK (type IN ('fortuner', 'vito', 'v_class', 'truck', 'q7', 'hilux'));
```

---

## New Vehicle Types

The following vehicle types are now valid:

1. **`fortuner`** - Toyota Fortuner
2. **`vito`** - Mercedes Vito
3. **`v_class`** - Mercedes V-Class
4. **`truck`** - Truck
5. **`q7`** - Audi Q7
6. **`hilux`** - Toyota Hilux

---

## Adding New Vehicles

When adding new vehicles, use one of the new types:

```json
{
  "reg_number": "ABC 123 FS",
  "type": "fortuner",
  "driver_name": "Driver Name",
  "driver_contact": "0821234567",
  "available": true,
  "current_location": "Manekeng",
  "last_service": "2025-10-15"
}
```

Valid types: `fortuner`, `vito`, `v_class`, `truck`, `q7`, `hilux`

---

## Frontend Display

The frontend will automatically display vehicle types. The system will:
- Show the type in uppercase (e.g., "FORTUNER", "V CLASS")
- Replace underscores with spaces (e.g., "V CLASS" instead of "V_CLASS")

---

## Troubleshooting

### Error: "Invalid type for vehicle"

**Solution:** Make sure you're using one of the new types: `fortuner`, `vito`, `v_class`, `truck`, `q7`, `hilux`

### Error: "Constraint violation" when running migration

**Solution:** You still have vehicles with old types. Update them first using Step 1 above.

### Error: "Vehicles with old types found"

**Solution:** The migration script found vehicles still using old types. Update them manually:
```sql
SELECT id, reg_number, type FROM vehicles WHERE type IN ('hearse', 'family_car', 'bus', 'backup');
```
Then update each one to use a new type.

---

## Need Help?

If you encounter any issues:
1. Check that all vehicles use the new types
2. Verify the constraint was updated correctly
3. Check the console logs for specific error messages

