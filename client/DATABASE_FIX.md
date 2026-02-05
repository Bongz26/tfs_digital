# Database Connection Fix

## Problem
The error `getaddrinfo ENOTFOUND db.uucjdcbtpunfsyuixsmc.supabase.co` indicates a DNS/connection issue.

## Solution: URL-encode the password

Your password `Thusanang@2025` contains special characters that need to be URL-encoded in the connection string.

### Special Characters That Need Encoding:
- `@` → `%40`
- `:` → `%3A`
- `/` → `%2F`
- `?` → `%3F`
- `#` → `%23`
- `[` → `%5B`
- `]` → `%5D`

## Fix Your .env File

### Current (Incorrect):
```env
DATABASE_URL=postgresql://postgres:Thusanang@2025@db.uucjdcbtpunfsyuixsmc.supabase.co:5432/postgres
```

### Fixed (Correct):
```env
DATABASE_URL=postgresql://postgres:Thusanang%402025@db.uucjdcbtpunfsyuixsmc.supabase.co:5432/postgres
```

Notice: `@` in the password is now `%40`

## Steps to Fix

1. **Open `server/.env` file**

2. **Update the DATABASE_URL line:**
   - Replace `Thusanang@2025` with `Thusanang%402025`
   - The `@` symbol must be URL-encoded as `%40`

3. **Save the file**

4. **Restart the server:**
   ```bash
   npm run dev
   ```

## Alternative: Get Correct Connection String from Supabase

1. Go to your Supabase project dashboard
2. Navigate to **Settings** → **Database**
3. Find **Connection string** section
4. Copy the **Connection pooling** or **Direct connection** string
5. Replace the DATABASE_URL in your `.env` file

The connection string from Supabase should already be properly encoded.

## Verify Connection String Format

A correct Supabase connection string should look like:
```
postgresql://postgres.xxxxx:[YOUR-PASSWORD]@aws-0-xx-x.pooler.supabase.com:6543/postgres
```

Or for direct connection:
```
postgresql://postgres:[YOUR-PASSWORD]@db.xxxxx.supabase.co:5432/postgres
```

## SSL Configuration

Supabase requires SSL connections. The database configuration has been updated to:
- Enable SSL with `rejectUnauthorized: false` (for Supabase's self-signed certificates)
- This is already configured in `server/config/db.js`

## Test Connection

After fixing the `.env` file, test the connection:

```bash
cd server
npm run dev
```

You should see:
```
✅ Database connection test successful
```

Instead of:
```
❌ Database connection test failed
```

## Still Having Issues?

1. **Verify Supabase project is active:**
   - Check Supabase dashboard
   - Ensure project is not paused

2. **Check network connection:**
   - Ensure you can access Supabase dashboard
   - Check firewall settings

3. **Verify database hostname:**
   - The hostname `db.uucjdcbtpunfsyuixsmc.supabase.co` should be correct
   - Check Supabase project settings for the correct hostname

4. **Try connection pooling URL:**
   - Supabase provides a connection pooling URL that might work better
   - Format: `postgresql://postgres.xxxxx:[PASSWORD]@aws-0-xx-x.pooler.supabase.com:6543/postgres`

5. **Check password:**
   - Verify the password is correct in Supabase
   - Reset password if needed

## Quick Fix Command

You can use this PowerShell command to URL-encode your password:

```powershell
[System.Web.HttpUtility]::UrlEncode("Thusanang@2025")
```

This will output: `Thusanang%402025`

