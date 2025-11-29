# Vehicle Navigation & Routing Setup Guide

This guide explains how to set up and use the vehicle navigation and routing features in your TFS Digital system.

## Features Added

✅ **Backend API for Directions** - Get routes using Google Maps Directions API
✅ **Route Map Component** - Display routes on interactive Google Maps
✅ **Route Directions Component** - Show turn-by-turn directions with map
✅ **Case-Based Routing** - Get routes directly for cases with venue locations

## Setup Instructions

### 1. Get Google Maps API Key

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing project
3. Enable **Maps JavaScript API** and **Directions API**
4. Go to "Credentials" and create an API Key
5. (Recommended) Restrict the API key to only the APIs you need

### 2. Configure Backend

Add to your `server/.env` file:

```env
GOOGLE_MAPS_API_KEY=your-google-maps-api-key-here
```

### 3. Configure Frontend

Add to your `client/.env` file (or create it):

```env
REACT_APP_GOOGLE_MAPS_API_KEY=your-google-maps-api-key-here
```

**Note:** Frontend key can be the same as backend, but Google recommends separate keys for better security.

### 4. Restart Servers

After adding the API keys:

```bash
# Backend
cd server
npm start

# Frontend (in another terminal)
cd client
npm start
```

## How It Works

### Backend API Endpoints

#### 1. Get Directions (General)
```http
GET /api/directions?origin=<address>&destination=<address>
```

**Query Parameters:**
- `origin` - Starting location (address or lat,lng)
- `destination` - Ending location (address or lat,lng)
- `waypoints` - Optional intermediate points (pipe-separated: "point1|point2")

**Example:**
```bash
curl "http://localhost:5000/api/directions?origin=Manekeng&destination=QwaQwa"
```

#### 2. Get Route for Case
```http
POST /api/directions/route
Content-Type: application/json

{
  "caseId": 1,
  "vehicleLocation": "Manekeng, Free State" // Optional
}
```

**Response:**
```json
{
  "success": true,
  "distance": "45.2 km",
  "distanceMeters": 45200,
  "duration": "1 hour 15 mins",
  "durationSeconds": 4500,
  "startAddress": "Manekeng, Free State, South Africa",
  "endAddress": "QwaQwa, Free State, South Africa",
  "venueName": "Community Hall",
  "venueAddress": "Main Street, QwaQwa",
  "steps": [...],
  "polyline": "...",
  "bounds": {...}
}
```

### Frontend Components

#### 1. RouteMap Component

Display a route on an interactive Google Map:

```jsx
import RouteMap from './components/RouteMap';

<RouteMap
  origin="Manekeng, Free State"
  destination="-28.5, 28.0"
  height="400px"
  zoom={10}
/>
```

**Props:**
- `origin` - Starting location (required)
- `destination` - Ending location (required)
- `waypoints` - Array of intermediate points (optional)
- `routeData` - Pre-fetched route data (optional, avoids duplicate API call)
- `height` - Map height (default: "400px")
- `zoom` - Initial zoom level (default: 10)

#### 2. RouteDirections Component

Show complete route information with map and turn-by-turn directions:

```jsx
import RouteDirections from './components/RouteDirections';

<RouteDirections
  caseId={123}
  vehicleLocation="Manekeng, Free State" // Optional
  showMap={true} // Optional, default: true
/>
```

**Props:**
- `caseId` - Case ID (required)
- `vehicleLocation` - Current vehicle location (optional)
- `showMap` - Whether to show map (default: true)

## Usage Examples

### Example 1: Show Route in Case Details

```jsx
import RouteDirections from './components/RouteDirections';

function CaseDetails({ case }) {
  return (
    <div>
      <h2>Case: {case.case_number}</h2>
      <p>Venue: {case.venue_name}</p>
      
      {/* Show route to venue */}
      <RouteDirections caseId={case.id} />
    </div>
  );
}
```

### Example 2: Show Route in Roster/Vehicle Assignment

```jsx
import RouteDirections from './components/RouteDirections';

function RosterItem({ rosterItem }) {
  return (
    <div>
      <h3>Vehicle: {rosterItem.reg_number}</h3>
      <p>Case: {rosterItem.case_number}</p>
      
      {/* Show route for this assignment */}
      <RouteDirections 
        caseId={rosterItem.case_id}
        vehicleLocation={rosterItem.vehicle.current_location}
      />
    </div>
  );
}
```

### Example 3: Simple Route Map

```jsx
import RouteMap from './components/RouteMap';

function SimpleMap() {
  return (
    <RouteMap
      origin="Manekeng, Free State"
      destination="QwaQwa, Free State"
    />
  );
}
```

## Database Schema

The system uses existing database fields:

- **cases.venue_lat, venue_lng** - Venue coordinates (for destination)
- **cases.venue_address** - Venue address
- **vehicles.current_location** - Current vehicle location (for origin)
- **roster.route_json** - Stores route data (currently TEXT, can store full response)

## Important Notes

### API Key Security

1. **Backend Key:** Keep secure, never expose to frontend
2. **Frontend Key:** Can be visible in browser, but should be restricted:
   - Restrict by HTTP referrer (your domain)
   - Restrict by API (only Maps JavaScript API and Directions API)
   - Set usage quotas

### Rate Limits

Google Maps API has usage limits:
- Free tier: $200 credit per month
- Directions API: ~$5 per 1000 requests
- Maps JavaScript API: Free (with restrictions)

Monitor usage in Google Cloud Console.

### Venue Coordinates

For routes to work, cases must have venue coordinates:
- Set `venue_lat` and `venue_lng` when creating/editing cases
- Or the system will try to geocode from `venue_address`

## Troubleshooting

### "Google Maps API key not configured"
- Check `.env` file has `GOOGLE_MAPS_API_KEY`
- Restart server after adding to `.env`

### "Failed to load Google Maps API"
- Check frontend `.env` has `REACT_APP_GOOGLE_MAPS_API_KEY`
- Restart React dev server
- Check API key restrictions don't block your domain

### "Venue coordinates not set"
- Cases need `venue_lat` and `venue_lng` set
- Update case to include venue location
- Or use venue address (system will try to geocode)

### "Unable to get directions"
- Check internet connection
- Verify Google Maps API is enabled in Cloud Console
- Check API key has Directions API enabled
- Verify API key hasn't exceeded quota

## Next Steps

1. ✅ Set up Google Maps API key
2. ✅ Add API key to backend `.env`
3. ✅ Add API key to frontend `.env`
4. ✅ Restart servers
5. ✅ Test with a case that has venue coordinates
6. ✅ Integrate into roster/case views

## Future Enhancements

- Real-time vehicle tracking
- Multi-stop route optimization
- Route history and analytics
- Traffic-aware routing
- SMS route notifications to drivers

