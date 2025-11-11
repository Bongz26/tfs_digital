# Roster Route 404 Debug Guide

## Issue
Getting 404 error when accessing `/api/roster` from frontend.

## Diagnosis Steps

### Step 1: Verify Server is Running
```bash
cd server
npm run dev
```

Check console for:
- ✅ Route registration messages
- ✅ Server started message
- Any error messages

### Step 2: Test Endpoint Directly

**In browser:**
- Open: `http://localhost:5000/api/roster`
- Should return JSON (empty array `[]` if no data)

**With curl:**
```bash
curl http://localhost:5000/api/roster
```

**With test script:**
```bash
node test-server.js
```

### Step 3: Check Server Console

When you start the server, you should see:
```
✅ Cases route registered
✅ Dashboard route registered
✅ Roster route registered
🚀 TFS API LIVE on port 5000
```

If you see an error for roster route, that's the issue.

### Step 4: Verify Route File

Check that `server/routes/roster.js` exists and exports router:
```javascript
module.exports = router;
```

### Step 5: Check for Syntax Errors

```bash
node -e "require('./routes/roster'); console.log('OK');"
```

## Common Issues

### Issue 1: Server Not Restarted
**Solution:** Restart the server after making changes
```bash
# Stop server (Ctrl+C)
# Start again
npm run dev
```

### Issue 2: Route Not Registered
**Solution:** Check server console for registration messages

### Issue 3: Port Conflict
**Solution:** Make sure port 5000 is available
```bash
# Check what's using port 5000
netstat -ano | findstr :5000
```

### Issue 4: React Dev Server Proxy
**Solution:** If using React dev server proxy, make sure it's configured correctly in `client/package.json`:
```json
{
  "proxy": "http://localhost:5000"
}
```

### Issue 5: CORS Issues
**Solution:** CORS is already enabled, but check browser console for CORS errors

## Quick Fix

1. **Stop the server** (Ctrl+C)

2. **Restart the server:**
   ```bash
   cd server
   npm run dev
   ```

3. **Check console for:**
   - ✅ Roster route registered
   - ✅ Server started on port 5000

4. **Test the endpoint:**
   - Browser: `http://localhost:5000/api/roster`
   - Should return: `[]` (empty array)

5. **If still 404:**
   - Check server console for errors
   - Verify route file exists
   - Check if server is actually running on port 5000

## Expected Behavior

### Server Console:
```
✅ Cases route registered
✅ Dashboard route registered
✅ Roster route registered
🚀 TFS API LIVE on port 5000
📍 API endpoints: http://localhost:5000/api
🏥 Health check: http://localhost:5000/api/health
📋 Roster: http://localhost:5000/api/roster
```

### Browser Response:
```json
[]
```

### If Roster Has Data:
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

## Next Steps

If the route still doesn't work after restarting:

1. Check server console for specific error messages
2. Verify Supabase connection is working
3. Test other endpoints (dashboard, cases) to see if they work
4. Check browser network tab for actual request/response

