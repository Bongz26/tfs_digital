# Fix ENETUNREACH IPv6 Connection Error on Render

## The Problem

You're getting this error:
```
connect ENETUNREACH 2a05:d018:135e:162d:ff4c:d18b:d895:5382:5432
```

**This is NOT a table issue - it's a network connectivity problem!**

Render's network cannot reach Supabase using IPv6 addresses. Your `DATABASE_URL` is using an IPv6 address, which Render can't connect to.

## The Solution

**Use Supabase Connection Pooling instead of Direct Connection**

### Step 1: Get Connection Pooling String

1. Go to **Supabase Dashboard** → Your Project → **Settings** → **Database**
2. Scroll to **"Connection string"** section
3. Select **"Connection pooling"** tab (NOT "URI" or "Direct connection")
4. Select **"Session mode"** or **"Transaction mode"**
5. Copy the connection string
6. It should look like:
   ```
   postgresql://postgres.[PROJECT_REF]:[PASSWORD]@aws-0-[region].pooler.supabase.com:6543/postgres
   ```
   OR
   ```
   postgresql://postgres:[PASSWORD]@aws-0-[region].pooler.supabase.com:6543/postgres
   ```

### Step 2: Update Render Environment Variable

1. Go to **Render Dashboard** → Your Service → **Environment**
2. Find `DATABASE_URL` environment variable
3. Click to edit it
4. Replace the value with the **Connection Pooling** string from Step 1
5. Make sure to replace `[PASSWORD]` with your actual password
6. Click **"Save Changes"**
7. Render will automatically redeploy

### Step 3: Verify

After redeploy, check the logs:
- ✅ Should see: `✅ Database connected successfully`
- ❌ Should NOT see: `ENETUNREACH` errors

## Why This Happens

- **Direct connection** uses IPv6 addresses (like `2a05:d018:...`)
- **Connection pooling** uses IPv4 addresses (like `aws-0-us-east-1.pooler.supabase.com`)
- Render's network supports IPv4 but has issues with IPv6
- Connection pooling is also better for production (handles more connections)

## Alternative: Use Transaction Pooler

If Session mode doesn't work, try **Transaction mode**:
- Same steps as above
- But select "Transaction mode" instead of "Session mode"
- Port might be different (check Supabase dashboard)

## Quick Checklist

- [ ] Get connection pooling string from Supabase
- [ ] Update `DATABASE_URL` in Render environment variables
- [ ] Use port `6543` (pooler) instead of `5432` (direct)
- [ ] Replace `[PASSWORD]` with actual password
- [ ] Save and wait for redeploy
- [ ] Check logs for connection success

## Still Not Working?

1. **Check Supabase project status**
   - Make sure project is not paused
   - Go to Supabase Dashboard → Project Settings

2. **Try different pooler mode**
   - Try Transaction mode if Session mode doesn't work
   - Or vice versa

3. **Verify password**
   - Make sure password is correct
   - Special characters in password might need URL encoding

4. **Check Render logs**
   - Look for any other error messages
   - Share the full error if still failing

