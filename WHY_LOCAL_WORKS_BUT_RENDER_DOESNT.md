# Why It Works Locally But Not on Render

## The Simple Answer

**Locally:** You ran the database setup (created tables) ✅  
**On Render:** The database tables were NEVER created ❌

## Detailed Explanation

### What Happens Locally

1. ✅ You ran `npm run init-db` OR manually ran `schema.sql` in Supabase
2. ✅ This created all the tables (`inventory`, `purchase_orders`, etc.) in your Supabase database
3. ✅ Your local code connects to the SAME Supabase database
4. ✅ Tables exist → Code works!

### What Happens on Render

1. ✅ Your code gets deployed to Render
2. ✅ Render connects to the SAME Supabase database
3. ❌ **BUT** - The tables were already created when you ran setup locally
4. ❌ **WAIT** - Actually, if you're using the SAME database, tables SHOULD exist...

## The Real Problem

You might be using **DIFFERENT Supabase databases**:

- **Local:** Connects to Database A (has tables) ✅
- **Render:** Connects to Database B (no tables) ❌

OR

- **Local:** You ran schema.sql on your Supabase project
- **Render:** Uses the SAME database, but something went wrong

## How to Check

### Step 1: Verify Database Connection

1. Go to **Supabase Dashboard** → Your Project → **Settings** → **Database**
2. Check the connection string
3. Compare it to what you have in:
   - Local: `server/.env` file (DATABASE_URL)
   - Render: Render Dashboard → Environment Variables (DATABASE_URL)

**Are they the SAME?**
- ✅ **YES** → Tables should exist, but maybe they don't (see Step 2)
- ❌ **NO** → You're using different databases! That's the problem.

### Step 2: Check if Tables Exist

1. Go to **Supabase Dashboard** → **Table Editor**
2. Do you see these tables?
   - `inventory`
   - `purchase_orders`
   - `stock_takes`
   - etc.

**If NO tables exist:**
- You need to run `schema.sql` on this database
- See solution below

**If tables DO exist:**
- The problem is something else (permissions, connection, etc.)

## The Solution

### If Tables Don't Exist (Most Likely)

**Run the schema on your production database:**

1. **Go to Supabase Dashboard**
   - https://supabase.com/dashboard
   - Select your project

2. **Open SQL Editor**
   - Click "SQL Editor" in left sidebar
   - Click "New query"

3. **Run Schema**
   - Open `server/database/schema.sql` from your project
   - Copy ALL the contents
   - Paste into Supabase SQL Editor
   - Click "Run"

4. **Verify**
   - Go to "Table Editor"
   - You should now see all tables

5. **Test Render**
   - Refresh your frontend
   - Errors should be gone!

### If You're Using Different Databases

**Option A: Use Same Database (Recommended)**
- Make sure Render's `DATABASE_URL` points to the SAME Supabase database as local
- Then run schema.sql on that database

**Option B: Set Up Production Database Separately**
- Create a new Supabase project for production
- Run schema.sql on the new database
- Update Render's `DATABASE_URL` to point to the new database

## Why This Happens

**The server code does NOT automatically create tables.**

- The code expects tables to already exist
- It's your responsibility to run the schema
- This is normal for production deployments

**Think of it like this:**
- Code = The application logic
- Database = The storage (tables, data)
- They are separate things!

## Quick Checklist

- [ ] Check if Render and Local use the SAME `DATABASE_URL`
- [ ] Check if tables exist in Supabase Table Editor
- [ ] If no tables → Run `schema.sql` in Supabase SQL Editor
- [ ] Verify tables were created
- [ ] Test Render again

## Still Not Working?

Check Render logs for the actual error:
1. Render Dashboard → Your Service → **Logs**
2. Look for the error message
3. Share the error - it will tell us exactly what's wrong

