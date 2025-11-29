# Render Deployment Fix

## The Problem

Your Render deployment is failing because:
1. **Build command** `npm install` runs at the root, but there was no root `package.json`
2. **Start command** is not configured properly - Render doesn't know how to start the server

## The Solution

I've created two files to fix this:

### 1. `render.yaml` (Preferred Method)
This is Render's standard configuration file. It tells Render to:
- Use `server/` as the root directory
- Run `npm install` in the server directory
- Run `npm start` to start the server

**To use this:**
1. In your Render dashboard, go to your service settings
2. Make sure "Auto-Deploy" is enabled (or it will use render.yaml automatically)
3. Or manually select the render.yaml file in your service configuration

### 2. Root `package.json` (Fallback Method)
This allows the root-level `npm install` and `npm start` commands to work by delegating to the server folder.

**To use this:**
In your Render dashboard service settings:
- **Build Command:** `cd server && npm install` (must use this, not just `npm install`)
- **Start Command:** `npm start` (this will delegate to server)
- **Root Directory:** (leave empty or set to `.`)

**Note:** The root `package.json` doesn't have dependencies, so `npm install` at root won't install server dependencies. You must use `cd server && npm install` for the build command.

## Required Environment Variables

Make sure these are set in your Render Dashboard → Environment:

### Required:
- `DATABASE_URL` - Your Supabase PostgreSQL connection string
  - Format: `postgresql://postgres:[PASSWORD]@db.xxxxx.supabase.co:5432/postgres`
  - **Important:** Use Connection Pooling URL if you had IPv6 errors (port 6543)
  - Get it from: Supabase Dashboard → Settings → Database → Connection string

### Recommended:
- `SUPABASE_URL` - Your Supabase project URL
  - Format: `https://xxxxx.supabase.co`
  - Get it from: Supabase Dashboard → Settings → API → Project URL

- `SUPABASE_ANON_KEY` - Your Supabase anonymous key
  - Get it from: Supabase Dashboard → Settings → API → Project API keys → `anon` `public`

- `FRONTEND_URL` - Your frontend URL (for CORS)
  - Example: `https://admintfs.onrender.com`
  - Defaults to `https://admintfs.onrender.com` if not set

- `NODE_ENV` - Set to `production`
  - Render may set this automatically

### Optional (for email features):
- `SMTP_HOST` - SMTP server host (e.g., `smtp.gmail.com`)
- `SMTP_PORT` - SMTP port (e.g., `587`)
- `SMTP_USER` - SMTP username
- `SMTP_PASS` - SMTP password

## Next Steps

1. **Choose your deployment method:**
   - Option A: Use `render.yaml` (recommended)
     - Render should automatically detect it
     - Or configure it in your service settings
   
   - Option B: Configure manually in Render Dashboard
     - Build Command: `npm install`
     - Start Command: `npm start`
     - Root Directory: (leave empty, or set to `server`)

2. **Verify environment variables:**
   - Go to Render Dashboard → Your Service → Environment
   - Make sure `DATABASE_URL` is set (this is critical!)
   - Add other variables as needed

3. **Commit and push:**
   ```bash
   git add render.yaml package.json
   git commit -m "Fix: Add Render deployment configuration"
   git push origin main
   ```

4. **Wait for redeploy:**
   - Render will automatically redeploy after you push
   - Watch the logs to verify it starts successfully
   - You should see: `🚀 Server running on port 5000`

5. **Test the deployment:**
   - Health check: `https://your-service.onrender.com/api/health`
   - Should return: `{"status":"ok","timestamp":"..."}`

## Troubleshooting

### Still failing?
1. **Check Render logs:**
   - Render Dashboard → Your Service → Logs
   - Look for error messages

2. **Common issues:**
   - **Missing DATABASE_URL:** Server will start but database queries will fail
   - **Wrong build/start command:** Make sure commands match what's in package.json
   - **Port conflicts:** Render sets PORT automatically, don't hardcode it

3. **Verify server starts locally:**
   ```bash
   cd server
   npm install
   npm start
   ```
   Should see: `🚀 Server running on port 5000`

## Summary

✅ **Fixed:**
- Created `render.yaml` for proper Render configuration
- Created root `package.json` for root-level npm commands
- Both methods will work - choose one

⚠️ **Still need to:**
- Set `DATABASE_URL` environment variable in Render Dashboard
- Optionally set other environment variables
- Commit and push these changes

