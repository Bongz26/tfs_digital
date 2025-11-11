# Roster Endpoint Fix

## Issue
Cannot access `http://localhost:5000/api/roster`

## What Was Fixed

### 1. Updated Roster Route
- Changed from Supabase join syntax to separate queries
- Added better error handling
- Added multiple endpoints (GET, POST, PUT, DELETE)
- Returns empty array if no data (instead of error)

### 2. Added Health Check
- New endpoint: `GET /api/health`
- Test this first to verify server is running

### 3. Improved Error Messages
- Better error logging
- More descriptive error responses

## Testing Steps

### Step 1: Verify Server is Running

1. **Check if server is running:**
   ```bash
   cd server
   npm run dev
   ```

2. **Test health endpoint:**
   - Open browser: `http://localhost:5000/api/health`
   - Should return: `{"status":"OK","message":"TFS API is running"}`

### Step 2: Test Roster Endpoint

1. **Test in browser:**
   - Open: `http://localhost:5000/api/roster`
   - Should return: `[]` (empty array if no roster entries)

2. **Test with curl:**
   ```bash
   curl http://localhost:5000/api/roster
   ```

3. **Test with test script:**
   ```bash
   node test-roster.js
   ```

## Common Issues

### Issue 1: Server Not Running
**Solution:** Start the server
```bash
cd server
npm run dev
```

### Issue 2: Port Already in Use
**Solution:** Change PORT in .env file or kill the process using port 5000

### Issue 3: Supabase Connection Error
**Solution:** 
- Check `.env` file has `SUPABASE_URL` and `SUPABASE_ANON_KEY`
- Verify Supabase project is active
- Check server console for error messages

### Issue 4: Empty Response
**Solution:** 
- Empty array `[]` is normal if no roster entries exist
- Create a roster entry first using POST endpoint

### Issue 5: CORS Error
**Solution:** 
- CORS is already enabled in `server/index.js`
- If still having issues, check browser console

## Available Endpoints

### GET /api/roster
Get all roster entries with vehicle and case details

**Response:**
```json
[
  {
    "id": 1,
    "case_id": 1,
    "vehicle_id": 1,
    "reg_number": "ABC 123 FS",
    "driver_name": "John Driver",
    "vehicle_type": "hearse",
    "case_number": "THS-2025-001",
    "plan_name": "single",
    "funeral_date": "2025-12-01",
    "funeral_time": "10:00:00",
    "venue_name": "St. Mary's Church",
    "pickup_time": "2025-12-01T08:00:00Z",
    "status": "scheduled",
    "sms_sent": false
  }
]
```

### GET /api/roster/case/:caseId
Get roster entries for a specific case

### GET /api/roster/today
Get today's roster entries

### POST /api/roster
Create a new roster entry

**Request:**
```json
{
  "case_id": 1,
  "vehicle_id": 1,
  "driver_name": "John Driver",
  "pickup_time": "2025-12-01T08:00:00Z",
  "status": "scheduled"
}
```

### PUT /api/roster/:id
Update a roster entry

### DELETE /api/roster/:id
Delete a roster entry

## Next Steps

1. **Start the server:**
   ```bash
   cd server
   npm run dev
   ```

2. **Test the endpoint:**
   - Browser: `http://localhost:5000/api/roster`
   - Should return empty array `[]` if no data

3. **Create test data:**
   - Use POST endpoint to create a roster entry
   - Or insert data directly in Supabase

4. **Verify it works:**
   - Check browser/API client
   - Check server console for errors

## Debugging

If still having issues:

1. **Check server console:**
   - Look for error messages
   - Check if Supabase connection is working

2. **Check browser console:**
   - Look for CORS errors
   - Check network tab for response

3. **Test health endpoint:**
   - `http://localhost:5000/api/health`
   - Should work if server is running

4. **Check .env file:**
   - Verify `SUPABASE_URL` and `SUPABASE_ANON_KEY` are set
   - Verify values are correct

5. **Check Supabase:**
   - Verify `roster` table exists
   - Verify table has data (if expecting data)
   - Check table permissions

