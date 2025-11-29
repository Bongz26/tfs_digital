# Testing Navigation Components - Quick Guide

This guide will help you test the new vehicle navigation and routing features.

## Quick Start Testing

### Step 1: Set Up Google Maps API Keys

1. **Get a Google Maps API Key:**
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create a project or select an existing one
   - Enable **Maps JavaScript API** and **Directions API**
   - Create an API key in "Credentials"
   - (Optional but recommended) Restrict the key to only these APIs

2. **Add to Backend (`server/.env`):**
   ```env
   GOOGLE_MAPS_API_KEY=your-google-maps-api-key-here
   ```

3. **Add to Frontend (`client/.env`):**
   ```env
   REACT_APP_GOOGLE_MAPS_API_KEY=your-google-maps-api-key-here
   ```

   **Note:** Create `client/.env` if it doesn't exist.

### Step 2: Restart Servers

```bash
# Terminal 1 - Backend
cd server
npm start

# Terminal 2 - Frontend  
cd client
npm start
```

### Step 3: Open Test Page

Navigate to: **http://localhost:3000/test-navigation**

Or add a link in your navigation menu (temporarily for testing).

## Testing Options

### Option 1: Test Simple Route Map

1. Go to the test page
2. Click "Test Simple Route Map" tab
3. Enter two locations (e.g., "Manekeng, Free State" and "QwaQwa, Free State")
4. Click "🗺️ Get Route"
5. You should see:
   - A map showing the route
   - Distance and duration
   - Route visualization

**Quick Test Locations:**
- Manekeng, Free State, South Africa
- QwaQwa, Free State, South Africa
- Bloemfontein, Free State, South Africa
- Welkom, Free State, South Africa

### Option 2: Test Case Route

1. Go to the test page
2. Click "Test Case Route" tab
3. Enter a **Case ID** that has venue coordinates set
4. (Optional) Enter vehicle location
5. You should see:
   - Complete route information
   - Interactive map
   - Turn-by-turn directions
   - Distance and duration
   - "Open in Google Maps" button

**Important:** The case must have `venue_lat` and `venue_lng` set in the database.

## Testing Checklist

- [ ] API keys added to both `.env` files
- [ ] Servers restarted
- [ ] Test page loads (http://localhost:3000/test-navigation)
- [ ] Simple route map works (can see route between two locations)
- [ ] Case route works (can see route for a case with venue coordinates)
- [ ] Map displays correctly
- [ ] Distance and duration show correctly
- [ ] Turn-by-turn directions appear (for case route)
- [ ] "Open in Google Maps" button works

## Troubleshooting

### ❌ "Google Maps API key not configured"

**Backend Error:**
- Check `server/.env` has `GOOGLE_MAPS_API_KEY`
- Restart backend server

**Frontend Error:**
- Check `client/.env` has `REACT_APP_GOOGLE_MAPS_API_KEY`
- Restart frontend (React) server
- Make sure the `.env` file is in the `client` folder (not `server`)

### ❌ "Failed to load Google Maps API"

- Check your API key is correct
- Check API restrictions aren't blocking localhost
- Check Maps JavaScript API is enabled in Google Cloud Console
- Check browser console for detailed error

### ❌ "Unable to get directions"

- Check Directions API is enabled in Google Cloud Console
- Check your API key has access to Directions API
- Verify locations are valid addresses
- Check API quota/usage limits in Google Cloud Console

### ❌ "Venue coordinates not set"

- The case doesn't have `venue_lat` and `venue_lng` in database
- Update the case to include venue location
- Or use the simple route map test instead

### ❌ Map shows but no route

- Check browser console for errors
- Verify both origin and destination are valid
- Try different locations (some may not have routes available)
- Check that Directions API returned a successful response

## Testing with Real Data

### Test with a Real Case:

1. Find a case ID from your database:
   ```sql
   SELECT id, case_number, venue_name, venue_lat, venue_lng 
   FROM cases 
   WHERE venue_lat IS NOT NULL AND venue_lng IS NOT NULL 
   LIMIT 1;
   ```

2. Use that Case ID in the test page

3. You should see the route from your default location (or specified vehicle location) to the case venue

## Manual API Testing

You can also test the API directly:

### Test Backend API:

```bash
# Simple route
curl "http://localhost:5000/api/directions?origin=Manekeng&destination=QwaQwa"

# With API key configured, should return JSON with route data
```

### Test Case Route API:

```bash
curl -X POST http://localhost:5000/api/directions/route \
  -H "Content-Type: application/json" \
  -d '{"caseId": 1}'
```

## Next Steps After Testing

Once testing works:

1. ✅ Integrate into roster/vehicle assignment views
2. ✅ Add to case details page
3. ✅ Show routes when assigning vehicles
4. ✅ Add route history/storage

## Quick Test Commands

```bash
# Check if backend is running
curl http://localhost:5000/api/health

# Check if directions endpoint is accessible (will fail without API key, but should not 404)
curl http://localhost:5000/api/directions?origin=test&destination=test

# Check frontend can access backend
curl http://localhost:5000/api/health
# Should return: {"status":"ok","timestamp":"..."}
```

## Need Help?

- Check `NAVIGATION_SETUP.md` for detailed setup instructions
- Check browser console for errors (F12)
- Check backend terminal for API errors
- Verify API keys are correct in `.env` files
- Make sure all required Google APIs are enabled

