# Testing with Real Data

## Step 1: Add Your Real Vehicle Data

### Option A: Edit the JSON file (Recommended)

1. Open `server/database/vehicles-data.json`
2. Replace the placeholder data with your real vehicle information
3. Save the file

### Vehicle Data Format

Each vehicle should have the following structure:

```json
{
  "reg_number": "ABC 123 FS",
  "type": "hearse",
  "driver_name": "Driver Name",
  "driver_contact": "0821234567",
  "available": true,
  "current_location": "Manekeng",
  "last_service": "2025-10-01"
}
```

### Vehicle Types

Valid types are:
- `hearse` - Hearse vehicle
- `family_car` - Family car
- `bus` - Bus
- `backup` - Backup vehicle

### Example with Real Data

```json
[
  {
    "reg_number": "HVR 607 FS",
    "type": "hearse",
    "driver_name": "Sipho Mthembu",
    "driver_contact": "0821234567",
    "available": true,
    "current_location": "Manekeng",
    "last_service": "2025-10-15"
  },
  {
    "reg_number": "TSF 145 FS",
    "type": "family_car",
    "driver_name": "Thabo Nkosi",
    "driver_contact": "0834567890",
    "available": true,
    "current_location": "Manekeng",
    "last_service": "2025-09-20"
  }
]
```

## Step 2: Insert Vehicles into Database

Run the following command:

```bash
cd server
npm run insert-vehicles
```

This will:
- Read vehicles from `vehicles-data.json`
- Insert or update vehicles in the database
- Show success/error messages for each vehicle

## Step 3: Verify Vehicles Were Inserted

### Option A: Check via API

Start the server:
```bash
npm run dev
```

Then visit or use curl:
```bash
# Get all vehicles
curl http://localhost:5000/api/vehicles

# Get available vehicles
curl http://localhost:5000/api/vehicles/available
```

### Option B: Check via Browser

1. Start the server: `npm run dev`
2. Open browser: `http://localhost:5000/api/vehicles`
3. You should see all your vehicles in JSON format

## Step 4: Insert Test Data (Optional)

To test the full system with sample cases, inventory, and livestock:

```bash
npm run insert-test-data
```

This will insert:
- A test case
- Sample inventory items
- Sample livestock

## Step 5: Test API Endpoints

### Test Cases API

```bash
# Create a new case
curl -X POST http://localhost:5000/api/cases \
  -H "Content-Type: application/json" \
  -d '{
    "deceased_name": "John Doe",
    "nok_name": "Jane Doe",
    "nok_contact": "0821234567",
    "nok_relation": "Spouse",
    "plan_category": "single",
    "funeral_date": "2025-12-01",
    "funeral_time": "10:00:00",
    "venue_name": "St. Mary Church",
    "venue_address": "123 Main St",
    "status": "intake",
    "intake_day": "2025-11-12"
  }'

# Get all cases
curl http://localhost:5000/api/cases
```

### Test Dashboard API

```bash
curl http://localhost:5000/api/dashboard
```

### Test Vehicles API

```bash
# Get all vehicles
curl http://localhost:5000/api/vehicles

# Get available vehicles
curl http://localhost:5000/api/vehicles/available

# Update vehicle availability
curl -X PATCH http://localhost:5000/api/vehicles/1/availability \
  -H "Content-Type: application/json" \
  -d '{"available": false}'
```

## Step 6: Test with Frontend

1. Start the backend server: `cd server && npm run dev`
2. Start the frontend: `cd client && npm start`
3. Open `http://localhost:3000` in your browser
4. Test the dashboard and forms with real data

## Troubleshooting

### Vehicles not inserting

1. Check that `vehicles-data.json` is valid JSON
2. Verify vehicle types are correct (`hearse`, `family_car`, `bus`, `backup`)
3. Check that reg_number is unique
4. Check database connection in `.env` file

### Database connection errors

1. Verify `.env` file exists in `server` directory
2. Check that DATABASE_URL is correct with your password
3. Ensure database tables are created (run `npm run init-db`)

### API not responding

1. Check that server is running on port 5000
2. Verify CORS is enabled (should be automatic)
3. Check server console for errors

## Next Steps

After inserting real vehicle data:

1. **Test Case Creation**: Create real cases via API or frontend
2. **Test Roster**: Assign vehicles to cases
3. **Test Inventory**: Add real inventory items
4. **Test Dashboard**: View statistics with real data
5. **Test Checklist**: Create and manage checklists for cases

## Data Validation

The system validates:
- Vehicle registration numbers must be unique
- Vehicle types must be valid
- Case numbers are auto-generated
- Intake days must be Wednesdays
- Phone numbers are validated
- Dates are validated

## Updating Vehicle Data

To update vehicle data:

1. Edit `vehicles-data.json` with new data
2. Run `npm run insert-vehicles` again
3. The script will update existing vehicles (by reg_number) or insert new ones

## Adding More Data

You can also add data directly via API:

```bash
# Add a vehicle via API
curl -X POST http://localhost:5000/api/vehicles \
  -H "Content-Type: application/json" \
  -d '{
    "reg_number": "NEW 123 FS",
    "type": "hearse",
    "driver_name": "New Driver",
    "driver_contact": "0821234567",
    "available": true
  }'
```

Note: The vehicles API doesn't have a POST endpoint by default. You can add one or use the insert script.

