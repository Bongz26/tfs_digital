# Quick Fix: Add Google Maps API Key

## The Problem

You're seeing: `⚠️  GOOGLE_MAPS_API_KEY not set - directions will not work`

## Quick Solution

### Step 1: Get Your API Key (5 minutes)

1. Go to: https://console.cloud.google.com/
2. Create/Select a project
3. Go to "APIs & Services" → "Library"
4. Enable:
   - ✅ Maps JavaScript API
   - ✅ Directions API
5. Go to "APIs & Services" → "Credentials"
6. Click "Create Credentials" → "API Key"
7. **Copy your API key** (looks like: `AIzaSyBxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`)

### Step 2: Add to `.env` File

**Location:** `server/.env` (create it if it doesn't exist)

Add this line:
```env
GOOGLE_MAPS_API_KEY=your-api-key-here
```

**Replace `your-api-key-here` with your actual key from Step 1.**

### Step 3: Restart Server

```bash
# Stop server (Ctrl+C)
# Then start again:
cd server
npm start
```

## Example `.env` File

If you're creating a new `.env` file, here's a template:

```env
# Database Configuration
DATABASE_URL=postgresql://postgres:yourpassword@db.xxxxx.supabase.co:5432/postgres

# Server Configuration
PORT=5000
NODE_ENV=development

# Supabase API
SUPABASE_URL=https://uucjdcbtpunfsyuixsmc.supabase.co
SUPABASE_KEY=your-supabase-key

# Google Maps API (ADD THIS LINE)
GOOGLE_MAPS_API_KEY=AIzaSyBxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

## Verify It Works

After restarting:
1. Check terminal - warning should be gone ✅
2. Go to: http://localhost:3000/test-navigation
3. Try getting a route - should work! 🗺️

## Need More Help?

See `GOOGLE_MAPS_API_SETUP.md` for detailed instructions with screenshots.

