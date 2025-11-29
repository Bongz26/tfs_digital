# Driver Assignment Migration Guide

## Overview

The system has been updated so that **drivers are no longer permanently assigned to vehicles**. Instead, drivers are assigned per case by the fleet manager on the frontend. This allows for more flexible vehicle and driver management.

---

## What Changed

### Before:
- Vehicles had permanent `driver_name` and `driver_contact` fields
- Drivers were tied to specific vehicles
- Limited flexibility for driver assignments

### After:
- Vehicles no longer have driver fields
- New `drivers` table stores all available drivers
- Drivers are assigned per case when assigning vehicles
- Fleet manager selects both vehicle AND driver on the frontend

---

## Database Changes

### 1. New `drivers` Table

```sql
CREATE TABLE IF NOT EXISTS drivers (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    contact VARCHAR(15),
    license_number VARCHAR(20),
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW()
);
```

### 2. Updated `vehicles` Table

The `driver_name` and `driver_contact` columns have been removed from the `vehicles` table.

### 3. `roster` Table (No Changes)

The `roster` table already has a `driver_name` field, which is where driver assignments are stored per case.

---

## Migration Steps

### For New Databases

If you're creating a new database, just run the updated `schema.sql` file. Everything is already set up correctly.

### For Existing Databases

#### Step 1: Create Drivers Table

Run this SQL:

```sql
CREATE TABLE IF NOT EXISTS drivers (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    contact VARCHAR(15),
    license_number VARCHAR(20),
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW()
);
```

#### Step 2: Migrate Existing Driver Data

Extract unique drivers from your vehicles and roster tables:

```sql
-- Insert drivers from vehicles table (if they exist)
INSERT INTO drivers (name, contact, active)
SELECT DISTINCT driver_name, driver_contact, true
FROM vehicles
WHERE driver_name IS NOT NULL AND driver_name != ''
ON CONFLICT (name) DO NOTHING;

-- Insert drivers from roster table
INSERT INTO drivers (name, active)
SELECT DISTINCT driver_name, true
FROM roster
WHERE driver_name IS NOT NULL AND driver_name != '' AND driver_name != 'TBD'
ON CONFLICT (name) DO NOTHING;
```

#### Step 3: Update Your Drivers List

Edit `server/database/drivers-data.json` with your actual drivers:

```json
[
  {
    "name": "Sipho Mthembu",
    "contact": "0821234567",
    "license_number": "DL123456",
    "active": true
  },
  {
    "name": "Thabo Nkosi",
    "contact": "0834567890",
    "license_number": "DL234567",
    "active": true
  }
]
```

Then run:
```bash
cd server
node database/insert-drivers.js
```

#### Step 4: Remove Driver Columns from Vehicles (Optional)

If you want to clean up the vehicles table:

```sql
-- First, make sure all driver data is in the drivers table
-- Then remove the columns (this is optional - they won't be used)
ALTER TABLE vehicles DROP COLUMN IF EXISTS driver_name;
ALTER TABLE vehicles DROP COLUMN IF EXISTS driver_contact;
```

**Note:** If you have existing data, you might want to keep these columns for reference, but they won't be used by the application anymore.

---

## How It Works Now

### 1. Fleet Manager Assigns Vehicle & Driver

When assigning a vehicle to a case:
1. Select a vehicle from the dropdown
2. Select a driver from the driver dropdown
3. Click "Assign Vehicle & Driver"

### 2. Driver Assignment is Stored in Roster

The driver assignment is stored in the `roster` table's `driver_name` field, not in the vehicles table.

### 3. Drivers Can Use Any Vehicle

Since drivers are not tied to vehicles, any driver can be assigned to any available vehicle for any case.

---

## API Endpoints

### Get All Active Drivers
```
GET /api/drivers
```

### Get All Drivers (including inactive)
```
GET /api/drivers/all
```

### Create New Driver
```
POST /api/drivers
Content-Type: application/json

{
  "name": "John Driver",
  "contact": "0821234567",
  "license_number": "DL123456"
}
```

### Update Driver
```
PUT /api/drivers/:id
Content-Type: application/json

{
  "name": "John Driver",
  "contact": "0821234567",
  "license_number": "DL123456",
  "active": true
}
```

---

## Frontend Changes

### Active Cases Page

- **Vehicle Selection:** Dropdown shows only vehicle type and registration number
- **Driver Selection:** New dropdown to select a driver for the assignment
- **Assignment Button:** Now says "Assign Vehicle & Driver" and requires both selections
- **Available Drivers Section:** New section showing all active drivers

### Vehicle Display

- Vehicles no longer show a permanent driver
- Only show vehicle type and registration number
- Status shows "Available" or "Assigned"

---

## Benefits

1. **Flexibility:** Any driver can use any vehicle
2. **Better Management:** Fleet manager has full control over assignments
3. **Real-world Accuracy:** Matches how fleets actually operate
4. **Scalability:** Easy to add new drivers without modifying vehicles

---

## Troubleshooting

### Error: "Driver not found in drivers table"

**Solution:** The driver name you're trying to assign doesn't exist in the `drivers` table. Add the driver first using the API or insert script.

### Error: "Please select a driver"

**Solution:** You must select both a vehicle AND a driver before assigning. The button will be disabled until both are selected.

### Drivers not showing in dropdown

**Solution:** 
1. Check that drivers exist in the database: `SELECT * FROM drivers WHERE active = true;`
2. Check the API endpoint: `GET /api/drivers`
3. Make sure the drivers route is registered in `server/index.js`

---

## Need Help?

If you encounter any issues:
1. Check that the `drivers` table exists
2. Verify drivers are inserted correctly
3. Check browser console for API errors
4. Verify the `/api/drivers` endpoint is working

