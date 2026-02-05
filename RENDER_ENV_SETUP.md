# Render Environment Variables Setup

## Required Environment Variables

### 1. DATABASE_URL (REQUIRED)
**This is the one causing your current error!**

1. Go to your Render dashboard
2. Select your backend service (the one that's failing)
3. Click on **"Environment"** in the left sidebar
4. Click **"Add Environment Variable"**
5. Set:
   - **Key:** `DATABASE_URL`
   - **Value:** Your Supabase connection string
6. To get your connection string:
   - Go to Supabase Dashboard → Your Project → Settings → Database
   - Under "Connection string", select **"URI"** or **"Connection pooling"**
   - Copy the connection string
   - Replace `[YOUR-PASSWORD]` with your actual database password
   - Example format: `postgresql://postgres:yourpassword@db.xxxxx.supabase.co:5432/postgres`
7. Click **"Save Changes"**
8. Render will automatically redeploy your service

## Optional Environment Variables (for full functionality)

### 2. SUPABASE_URL
**Needed for:** Dashboard and Active Cases features

1. In Render → Environment → Add Environment Variable
2. **Key:** `SUPABASE_URL`
3. **Value:** Your Supabase project URL
   - Found in: Supabase Dashboard → Settings → API → Project URL
   - Format: `https://xxxxx.supabase.co`

### 3. SUPABASE_ANON_KEY
**Needed for:** Dashboard and Active Cases features

1. In Render → Environment → Add Environment Variable
2. **Key:** `SUPABASE_ANON_KEY`
3. **Value:** Your Supabase anonymous key
   - Found in: Supabase Dashboard → Settings → API → Project API keys → `anon` `public`
   - This is safe to expose (it's the public key)

### 4. FRONTEND_URL (Optional)
**Needed for:** CORS configuration in production

1. In Render → Environment → Add Environment Variable
2. **Key:** `FRONTEND_URL`
3. **Value:** Your frontend URL (e.g., `https://admintfs.onrender.com`)
   - Defaults to `https://admintfs.onrender.com` if not set

### 5. NODE_ENV (Optional)
**Render may set this automatically, but you can set it manually:**

1. In Render → Environment → Add Environment Variable
2. **Key:** `NODE_ENV`
3. **Value:** `production`

## Quick Setup Checklist

- [ ] Set `DATABASE_URL` (REQUIRED - fixes your current error)
- [ ] Set `SUPABASE_URL` (if using Dashboard/Active Cases)
- [ ] Set `SUPABASE_ANON_KEY` (if using Dashboard/Active Cases)
- [ ] Set `FRONTEND_URL` (optional, for CORS)
- [ ] Set `NODE_ENV=production` (optional)

## After Setting Environment Variables

1. Render will automatically redeploy when you save environment variables
2. Check the logs to verify the server starts successfully
3. Test your API endpoints

## Security Notes

- ✅ `SUPABASE_ANON_KEY` is safe to expose (it's public)
- ❌ Never commit `.env` files to Git
- ✅ Render environment variables are encrypted at rest
- ✅ Use Render's environment variables instead of `.env` files in production

## Troubleshooting

### Still getting "DATABASE_URL is not set"?
1. Make sure you saved the environment variable in Render
2. Wait for the redeploy to complete
3. Check the logs - the variable should be available after redeploy

### Connection errors after setting DATABASE_URL?
1. Verify your password is correct (no special characters need URL encoding)
2. Try using the "Connection pooling" connection string instead of direct
3. Check if your Supabase project is paused (unpause it in Supabase dashboard)

