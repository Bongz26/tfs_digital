# Quick Start - Add Real Vehicle Data

## Step 1: Edit Vehicle Data File

Open `server/database/vehicles-data.json` and replace the placeholder data with your real vehicle information.

### Example Format:

```json
[
  {
    "reg_number": "ABC 123 FS",
    "type": "hearse",
    "driver_name": "Driver Full Name",
    "driver_contact": "0821234567",
    "available": true,
    "current_location": "Manekeng",
    "last_service": "2025-10-15"
  }
]
```

### Required Fields:
- `reg_number` - Vehicle registration number (e.g., "ABC 123 FS")
- `type` - Vehicle type: `hearse`, `family_car`, `bus`, or `backup`

### Optional Fields:
- `driver_name` - Driver's name
- `driver_contact` - Driver's phone number
- `available` - true or false (default: true)
- `current_location` - Current location
- `last_service` - Last service date (YYYY-MM-DD format)

## Step 2: Insert Vehicles

Run this command in the `server` directory:

```bash
npm run insert-vehicles
```

You should see output like:
```
🚗 Starting vehicle data insertion...
📁 Loaded 6 vehicles from vehicles-data.json

✅ ABC 123 FS - hearse (Driver Name)
✅ DEF 456 FS - family_car (Driver Name)
...

📊 Summary: 6 successful, 0 errors
✅ Vehicle data insertion completed!
```

## Step 3: Verify Vehicles

Start the server:
```bash
npm run dev
```

Then check the vehicles:
- Browser: `http://localhost:5000/api/vehicles`
- Or use curl: `curl http://localhost:5000/api/vehicles`

## Step 4: Test with Real Data

1. **Create a case** via API or frontend
2. **Assign vehicles** to cases via roster
3. **Check dashboard** for statistics
4. **Manage inventory** and reservations

## Need Help?

See `TESTING.md` for detailed testing instructions.

## Vehicle Types Reference

- **hearse** - Hearse vehicle for transporting the deceased
- **family_car** - Family car for transporting family members
- **bus** - Bus for transporting mourners
- **backup** - Backup/standby vehicle

## Tips

- Registration numbers must be unique
- Empty strings will be converted to null
- Dates should be in YYYY-MM-DD format
- Phone numbers should be in South African format (0XXXXXXXXX)

