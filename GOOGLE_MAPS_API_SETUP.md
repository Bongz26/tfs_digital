# Google Maps API Key Setup - Quick Guide

## ⚠️ Current Issue

You're seeing this warning:
```
⚠️  GOOGLE_MAPS_API_KEY not set - directions will not work
```

This means the Google Maps API key is not configured yet. Follow these steps to fix it.

## Step 1: Get a Google Maps API Key

### Quick Steps:

1. **Go to Google Cloud Console:**
   - Visit: https://console.cloud.google.com/
   - Sign in with your Google account

2. **Create or Select a Project:**
   - Click the project dropdown at the top
   - Click "New Project" or select an existing one
   - Give it a name like "TFS Digital Maps"
   - Click "Create"

3. **Enable Required APIs:**
   - Go to "APIs & Services" → "Library"
   - Search for and enable these APIs:
     - ✅ **Maps JavaScript API** (for displaying maps)
     - ✅ **Directions API** (for getting routes)
   - Click "Enable" for each one

4. **Create API Key:**
   - Go to "APIs & Services" → "Credentials"
   - Click "Create Credentials" → "API Key"
   - Copy the API key (you'll see it in a popup)

5. **(Recommended) Restrict the API Key:**
   - Click "Restrict Key" in the popup
   - Under "API restrictions":
     - Select "Restrict key"
     - Check only: Maps JavaScript API and Directions API
   - Under "Application restrictions":
     - For local testing: Select "None" (for now)
     - For production: Select "HTTP referrers" and add your domain
   - Click "Save"

## Step 2: Add API Key to Server `.env` File

### Find or Create the `.env` File:

The `.env` file should be in: `server/.env`

If it doesn't exist:
1. Go to your `server` folder
2. Create a new file named `.env` (with the dot at the beginning)

### Add the API Key:

Open `server/.env` and add this line:

```env
GOOGLE_MAPS_API_KEY=your-api-key-here
```

**Replace `your-api-key-here` with your actual API key from Step 1.**

### Example `.env` File:

```env
# Database Configuration
DATABASE_URL=postgresql://postgres:yourpassword@db.xxxxx.supabase.co:5432/postgres

# Server Configuration
PORT=5000
NODE_ENV=development

# Supabase API
SUPABASE_URL=https://uucjdcbtpunfsyuixsmc.supabase.co
SUPABASE_KEY=your-supabase-key

# Google Maps API (NEW - ADD THIS)
GOOGLE_MAPS_API_KEY=AIzaSyBxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

## Step 3: Add API Key to Frontend `.env` File (Optional for now)

If you want the map component to work on the frontend too, create `client/.env`:

```env
REACT_APP_GOOGLE_MAPS_API_KEY=your-api-key-here
```

**Same API key or create a separate one - both work!**

## Step 4: Restart Your Server

After adding the API key:

1. **Stop your server** (Ctrl+C in the terminal)
2. **Start it again:**
   ```bash
   cd server
   npm start
   ```

3. You should **NOT** see the warning anymore:
   - ✅ If you see: `✅ Server running on port 5000` without warnings → Success!
   - ❌ If you still see the warning → Check the `.env` file location and spelling

## Step 5: Test It

1. Go to your test page: http://localhost:3000/test-navigation
2. Try getting a route
3. You should see a map with directions!

## Troubleshooting

### ❌ Still seeing the warning after adding API key?

**Check:**
1. Is the `.env` file in the `server` folder? (not `client` folder)
2. Is the variable name exactly `GOOGLE_MAPS_API_KEY`? (no typos)
3. Is there a space around the `=` sign? (should be: `KEY=value`, not `KEY = value`)
4. Did you restart the server after adding it?
5. Is the API key on its own line? (not commented out with `#`)

### ❌ API key not working / Getting errors?

**Check:**
1. Is the API key correct? (copy-paste it again)
2. Are both APIs enabled? (Maps JavaScript API and Directions API)
3. Check Google Cloud Console → APIs & Services → Dashboard
4. Check if you have billing enabled (Google requires a billing account, but gives $200 free credit/month)

### ❌ "Quota exceeded" error?

- Check your API usage in Google Cloud Console
- Free tier: $200 credit per month
- Directions API: ~$5 per 1000 requests
- You might have exceeded the free tier

## Quick Checklist

- [ ] Google Maps API key created in Google Cloud Console
- [ ] Maps JavaScript API enabled
- [ ] Directions API enabled
- [ ] API key added to `server/.env` file
- [ ] Server restarted
- [ ] Warning is gone
- [ ] Test page works

## Need Help?

If you're still having issues:

1. Check the server terminal for detailed error messages
2. Check browser console (F12) for frontend errors
3. Verify your API key is active in Google Cloud Console
4. Make sure both APIs are enabled

## Notes

- **Free Tier:** Google gives $200 free credit per month - usually more than enough for testing
- **Billing:** You need a credit card on file, but won't be charged unless you exceed the free tier
- **Security:** For production, restrict your API key to only your domain
- **Cost:** Directions API costs about $5 per 1000 requests

