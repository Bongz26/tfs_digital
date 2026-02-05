# How to Start the Backend API

## Quick Start

### Step 1: Navigate to Server Directory
```bash
cd server
```

### Step 2: Install Dependencies (if not already installed)
```bash
npm install
```

### Step 3: Start the Server

**For Development (with auto-reload):**
```bash
npm run dev
```

**For Production:**
```bash
npm start
```

## What You Should See

When the server starts successfully, you should see:

```
✅ Cases route registered
✅ Dashboard route registered
✅ Roster route registered
🚀 TFS API LIVE on port 5000
📍 API endpoints: http://localhost:5000/api
🏥 Health check: http://localhost:5000/api/health
📋 Roster: http://localhost:5000/api/roster
📊 Dashboard: http://localhost:5000/api/dashboard

✅ All routes registered. Server ready!
```

## Verify Server is Running

1. **Check Health Endpoint:**
   - Open browser: `http://localhost:5000/api/health`
   - Should return: `{"status":"OK","message":"TFS API is running"}`

2. **Test Roster Endpoint:**
   - Open browser: `http://localhost:5000/api/roster`
   - Should return: `[]` (empty array if no data)

3. **Test Dashboard Endpoint:**
   - Open browser: `http://localhost:5000/api/dashboard`
   - Should return dashboard statistics

## Troubleshooting

### Issue 1: Port Already in Use
**Error:** `EADDRINUSE: address already in use :::5000`

**Solution:**
```bash
# Find process using port 5000
netstat -ano | findstr :5000

# Kill the process (replace PID with actual process ID)
taskkill /PID <PID> /F

# Or change port in .env file
PORT=5001
```

### Issue 2: Missing .env File
**Error:** Database connection errors

**Solution:**
1. Create `.env` file in `server` directory
2. Add your Supabase credentials:
```env
DATABASE_URL=postgresql://postgres:[PASSWORD]@db.uucjdcbtpunfsyuixsmc.supabase.co:5432/postgres
PORT=5000
NODE_ENV=development
SUPABASE_URL=https://uucjdcbtpunfsyuixsmc.supabase.co
SUPABASE_ANON_KEY=your_anon_key_here
```

### Issue 3: Dependencies Not Installed
**Error:** `Cannot find module 'express'`

**Solution:**
```bash
cd server
npm install
```

### Issue 4: Database Connection Failed
**Error:** Supabase connection errors

**Solution:**
1. Verify `.env` file has correct credentials
2. Check Supabase project is active (not paused)
3. Verify SUPABASE_URL and SUPABASE_ANON_KEY are correct

## Available Scripts

- `npm start` - Start server in production mode
- `npm run dev` - Start server in development mode (with auto-reload)
- `npm run init-db` - Initialize database (create tables)
- `npm run insert-vehicles` - Insert vehicle data
- `npm run insert-test-data` - Insert test data

## Environment Variables

Make sure your `.env` file has:
- `DATABASE_URL` - PostgreSQL connection string (if using direct connection)
- `SUPABASE_URL` - Supabase project URL
- `SUPABASE_ANON_KEY` - Supabase anonymous key
- `PORT` - Server port (default: 5000)
- `NODE_ENV` - Environment (development/production)

## Next Steps

Once server is running:
1. Test API endpoints in browser or Postman
2. Start frontend: `cd client && npm start`
3. Frontend will connect to API at `http://localhost:5000`

