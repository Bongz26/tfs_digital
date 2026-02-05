# Database Connection Troubleshooting Guide

## Current Error
```
getaddrinfo ENOTFOUND db.uucjdcbtpunfsyuixsmc.supabase.co
```

This means your computer cannot find/resolve the database hostname. This is typically not a password issue, but a hostname/DNS issue.

## Step 1: Verify Supabase Project Status

1. **Go to Supabase Dashboard:**
   - Visit: https://supabase.com/dashboard
   - Log in to your account

2. **Check Project Status:**
   - Find your project: `uucjdcbtpunfsyuixsmc`
   - Verify the project is **ACTIVE** (not paused)
   - Free tier projects can be paused after inactivity

3. **If Project is Paused:**
   - Click "Restore" or "Resume" to activate it
   - Wait a few minutes for the project to start

## Step 2: Get the Correct Connection String

### Method 1: Connection Pooling (Recommended)

1. Go to **Settings** → **Database**
2. Scroll to **Connection string** section
3. Select **Connection pooling** tab
4. Choose **Transaction** mode
5. Copy the connection string
6. It should look like:
   ```
   postgresql://postgres.xxxxx:[YOUR-PASSWORD]@aws-0-xx-x.pooler.supabase.com:6543/postgres
   ```

### Method 2: Direct Connection

1. Go to **Settings** → **Database**
2. Scroll to **Connection string** section
3. Select **URI** tab
4. Copy the connection string
5. It should look like:
   ```
   postgresql://postgres:[YOUR-PASSWORD]@db.xxxxx.supabase.co:5432/postgres
   ```

## Step 3: Update Your .env File

1. **Open `server/.env`**

2. **Replace the DATABASE_URL** with the connection string from Supabase

3. **Important:** If your password contains special characters:
   - `@` → `%40`
   - `:` → `%3A`
   - `/` → `%2F`
   - `#` → `%23`
   - ` ` (space) → `%20`

4. **Example:**
   ```env
   # Connection Pooling (Recommended)
   DATABASE_URL=postgresql://postgres.xxxxx:Thusanang%402025@aws-0-xx-x.pooler.supabase.com:6543/postgres
   
   # OR Direct Connection
   DATABASE_URL=postgresql://postgres:Thusanang%402025@db.xxxxx.supabase.co:5432/postgres
   ```

## Step 4: Test the Connection

Run the test script:
```bash
cd server
node database/test-connection.js
```

Or start the server:
```bash
npm run dev
```

## Common Issues and Solutions

### Issue 1: Project is Paused
**Solution:** Restore the project in Supabase dashboard

### Issue 2: Wrong Hostname
**Solution:** Get the correct hostname from Supabase Settings → Database

### Issue 3: Password Not URL-encoded
**Solution:** URL-encode special characters in the password
- Use: `Thusanang%402025`
- Instead of: `Thusanang@2025`

### Issue 4: Using Wrong Port
**Solution:** 
- Connection pooling uses port **6543**
- Direct connection uses port **5432**

### Issue 5: SSL Not Enabled
**Solution:** SSL is already enabled in `server/config/db.js`

## Alternative: Use Supabase Connection Pooling

Connection pooling is recommended for serverless/cloud deployments:

1. **Get pooling URL from Supabase:**
   - Settings → Database → Connection string → Connection pooling
   - Use **Transaction** mode

2. **Update .env:**
   ```env
   DATABASE_URL=postgresql://postgres.xxxxx:[PASSWORD]@aws-0-xx-x.pooler.supabase.com:6543/postgres
   ```

3. **Benefits:**
   - Better connection management
   - Handles more concurrent connections
   - More reliable for production

## Verify Connection String Format

Your connection string should match one of these patterns:

### Pattern 1: Connection Pooling
```
postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres
```

### Pattern 2: Direct Connection
```
postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres
```

## Quick Check List

- [ ] Supabase project is active (not paused)
- [ ] Connection string copied from Supabase dashboard
- [ ] Password is URL-encoded (special characters)
- [ ] Using correct port (6543 for pooling, 5432 for direct)
- [ ] SSL is enabled (already configured)
- [ ] Internet connection is working
- [ ] Firewall is not blocking the connection

## Still Having Issues?

1. **Check Supabase Status Page:**
   - Visit: https://status.supabase.com/
   - Check for any ongoing issues

2. **Try Different Connection Method:**
   - If direct connection doesn't work, try connection pooling
   - If pooling doesn't work, try direct connection

3. **Verify Network:**
   - Try accessing Supabase dashboard
   - Check if you can ping the hostname (might not work due to firewall)

4. **Contact Supabase Support:**
   - If project is active and connection string is correct
   - There might be an issue with your Supabase project

## Test Connection Script

Use the provided test script to diagnose issues:
```bash
node database/test-connection.js
```

This will show:
- Connection string (masked)
- SSL status
- Connection test results
- Database tables
- Detailed error messages

## Next Steps

Once connection is working:
1. Run database initialization: `npm run init-db`
2. Insert vehicle data: `npm run insert-vehicles`
3. Start testing the API endpoints

