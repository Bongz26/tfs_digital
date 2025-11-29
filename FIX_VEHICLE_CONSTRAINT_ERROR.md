# Fix Vehicle Constraint Error

## Problem

You're getting this error:
```
ERROR: 23514: check constraint "vehicles_type_check" of relation "vehicles" is violated by some row
```

This happens because your database has vehicles with **old vehicle types** that don't match the new constraint.

---

## Solution

### Step 1: Find Vehicles with Invalid Types

Run this script to see which vehicles have invalid types:

```bash
cd server
node database/fix-vehicle-types.js
```

This will show you:
- Which vehicles have invalid types
- What their current types are
- Example SQL commands to fix them

### Step 2: Update Invalid Vehicles

Update each vehicle to use a valid type. The valid types are:
- `fortuner`
- `vito`
- `v_class`
- `truck`
- `q7`
- `hilux`

**Example SQL:**

```sql
-- Update a vehicle to use a valid type
UPDATE vehicles SET type = 'fortuner' WHERE reg_number = 'HPS835FS';
UPDATE vehicles SET type = 'vito' WHERE reg_number = 'ABC 123 FS';
-- etc.
```

**Important:** Choose the correct type for each vehicle based on what it actually is!

### Step 3: Run the Migration

After updating all vehicles, run the migration:

```bash
cd server
node database/migrate-vehicles-remove-drivers.js
```

This will:
- ✅ Verify all vehicles have valid types
- ✅ Update the constraint
- ✅ Remove driver columns

---

## Quick Fix Script

If you want to update all vehicles to a default type (e.g., 'fortuner'), you can run:

```sql
-- WARNING: This updates ALL vehicles to 'fortuner'
-- Only use this if all your vehicles are actually Fortuners!
UPDATE vehicles 
SET type = 'fortuner' 
WHERE type NOT IN ('fortuner', 'vito', 'v_class', 'truck', 'q7', 'hilux')
   OR type IS NULL;
```

**⚠️ Only do this if you're sure all vehicles should be the same type!**

---

## Common Old Types

If you see these old types, here are suggested mappings:

| Old Type | Suggested New Type |
|----------|-------------------|
| `hearse` | `fortuner` or `v_class` |
| `family_car` | `vito` or `q7` |
| `bus` | `truck` or `v_class` |
| `backup` | `hilux` or `fortuner` |

**Choose based on what the vehicle actually is!**

---

## Still Having Issues?

1. **Check all vehicles:**
   ```sql
   SELECT id, reg_number, type FROM vehicles;
   ```

2. **Find invalid ones:**
   ```sql
   SELECT id, reg_number, type 
   FROM vehicles 
   WHERE type NOT IN ('fortuner', 'vito', 'v_class', 'truck', 'q7', 'hilux')
      OR type IS NULL;
   ```

3. **Update them one by one:**
   ```sql
   UPDATE vehicles SET type = 'fortuner' WHERE id = 16;
   ```

4. **Then run migration again**

---

## Need Help?

If you're not sure what type a vehicle should be:
- Check the vehicle registration
- Look at the vehicle physically
- Ask the fleet manager
- Use a generic type like `truck` if unsure

