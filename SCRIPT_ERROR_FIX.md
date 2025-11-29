# Fixing Script Errors - Quick Guide

## The Error

You're seeing:
```
ERROR Script error.
```

This is a generic browser error that happens when:
1. The Google Maps API script fails to load
2. API key is invalid or restricted
3. The script is being loaded multiple times

## Quick Fixes

### Fix 1: Check API Key in client/.env

1. Make sure `client/.env` exists and has:
   ```env
   REACT_APP_GOOGLE_MAPS_API_KEY=your-actual-api-key-here
   ```

2. **Important:** Restart your React server after creating/updating `.env`:
   ```bash
   # Stop server (Ctrl+C)
   cd client
   npm start
   ```

### Fix 2: Check API Key Restrictions

If your API key is restricted, make sure:

1. **For local testing:** Set "Application restrictions" to **"None"** in Google Cloud Console
2. **OR** add these to allowed HTTP referrers:
   - `http://localhost:*`
   - `http://127.0.0.1:*`

### Fix 3: Verify APIs Are Enabled

In Google Cloud Console:
- ✅ Maps JavaScript API - **Enabled**
- ✅ Directions API - **Enabled**

### Fix 4: Check Browser Console

Open browser console (F12) and look for:
- Specific error messages about the API key
- CORS errors
- API quota errors

## Temporary Workaround

If you just want to test the backend API (without the map):

1. **Don't open the test-navigation page** (this tries to load Google Maps)
2. Test the backend API directly:
   ```bash
   curl "http://localhost:5000/api/directions?origin=Manekeng&destination=QwaQwa"
   ```

3. Or use the RouteDirections component without showing the map:
   ```jsx
   <RouteDirections caseId={123} showMap={false} />
   ```

## Step-by-Step Fix

1. **Verify client/.env exists:**
   - Location: `client/.env` (same folder as `package.json`)
   - Content: `REACT_APP_GOOGLE_MAPS_API_KEY=your-key`

2. **Check your API key is correct:**
   - Copy from Google Cloud Console → Credentials
   - Make sure no extra spaces

3. **Restart React server:**
   - Stop (Ctrl+C)
   - Start: `cd client && npm start`

4. **Clear browser cache:**
   - Hard refresh: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)

5. **Check browser console (F12):**
   - Look for specific error messages
   - Check Network tab for failed requests

## Common Issues

### ❌ "This API key is not authorized"

**Fix:** Check API restrictions in Google Cloud Console. For testing, disable restrictions temporarily.

### ❌ "RefererNotAllowedMapError"

**Fix:** Add `http://localhost:*` to allowed HTTP referrers in API key settings.

### ❌ "Quota exceeded"

**Fix:** Check your API usage in Google Cloud Console. Free tier: $200/month.

### ❌ Script loads but map doesn't show

**Fix:** 
- Check browser console for JavaScript errors
- Make sure both Maps JavaScript API and Directions API are enabled
- Verify API key has access to both APIs

## Still Having Issues?

1. **Check if API key works:**
   - Try loading Google Maps directly: `https://maps.googleapis.com/maps/api/js?key=YOUR_KEY`
   - Should load without errors

2. **Test backend only:**
   - Use curl or Postman to test `/api/directions` endpoint
   - If backend works, issue is frontend API key

3. **Check React server terminal:**
   - Look for any error messages
   - Verify `.env` file is being read

## Alternative: Use Backend-Only Mode

If you just want directions without the map component:

```jsx
// Just show directions text, no map
import RouteDirections from '../components/RouteDirections';

<RouteDirections 
  caseId={123} 
  showMap={false}  // Don't load map component
/>
```

This will show the route information and turn-by-turn directions without loading the Google Maps JavaScript API.

