# Supabase Connection Troubleshooting

## Current Issue: ENOTFOUND Error

The hostname `db.uucjdcbtpunfsyuixsmc.supabase.co` cannot be resolved. This almost always means:

### 1. **Supabase Project is Paused** (Most Common)

**Check your project status:**
1. Go to: https://supabase.com/dashboard/project/uucjdcbtpunfsyuixsmc
2. Look at the top of the page - does it say "Paused" or "Inactive"?
3. If paused, click **"Restore"** or **"Resume"** button
4. Wait 2-3 minutes for the project to fully activate
5. Then try connecting again

### 2. **Try Pooler Connection Instead**

The pooler connection might work even if direct connection doesn't:

1. Go to: https://supabase.com/dashboard/project/uucjdcbtpunfsyuixsmc/settings/database
2. Scroll to **Connection string**
3. Select **Transaction mode** (this is the pooler)
4. Copy the connection string
5. Update your `server/.env` file

The pooler connection will look like:
```
postgresql://postgres.uucjdcbtpunfsyuixsmc:[PASSWORD]@aws-0-xx-x.pooler.supabase.com:6543/postgres
```

### 3. **Verify Project Reference ID**

Make sure your project reference `uucjdcbtpunfsyuixsmc` is correct:
- Check the URL in your Supabase dashboard
- The project reference should match exactly

### 4. **Network/DNS Check**

If the project is active but still not connecting:
- Check your internet connection
- Try accessing https://uucjdcbtpunfsyuixsmc.supabase.co in your browser
- If that doesn't load, the project is definitely paused

## Quick Fix Steps

1. ✅ Check if project is paused → Restore if needed
2. ✅ Try pooler connection string
3. ✅ Verify project reference ID matches
4. ✅ Test connection: `node test-db-connection.js`

