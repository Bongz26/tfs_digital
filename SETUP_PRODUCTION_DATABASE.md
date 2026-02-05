# Setup Production Database on Supabase

## The Problem
Your backend is getting 500 errors because the database tables don't exist in your production Supabase database.

## Solution: Run the Schema on Supabase

### Option 1: Using Supabase SQL Editor (Easiest)

1. **Go to Supabase Dashboard**
   - Visit: https://supabase.com/dashboard
   - Select your project

2. **Open SQL Editor**
   - Click **"SQL Editor"** in the left sidebar
   - Click **"New query"**

3. **Copy and Run Schema**
   - Open `server/database/schema.sql` in your local project
   - Copy the **entire contents** of the file
   - Paste it into the Supabase SQL Editor
   - Click **"Run"** (or press Ctrl+Enter)

4. **Verify Tables Created**
   - Go to **"Table Editor"** in Supabase
   - You should see tables like:
     - `inventory`
     - `cases`
     - `purchase_orders`
     - `stock_takes`
     - etc.

### Option 2: Using psql Command Line

If you have `psql` installed locally:

1. **Get your connection string from Supabase**
   - Supabase Dashboard → Settings → Database
   - Copy the connection string (URI format)

2. **Run the schema**
   ```bash
   psql "your-connection-string" -f server/database/schema.sql
   ```

### Option 3: Using Supabase CLI (Advanced)

If you have Supabase CLI installed:

```bash
supabase db push
```

## After Running Schema

1. **Test the API**
   - Visit: `https://tfs-digital.onrender.com/api/inventory`
   - Should return: `{"success":true,"inventory":[]}` (empty array is fine if no data)

2. **Add Test Data (Optional)**
   - You can run `server/database/seed.sql` to add sample data
   - Or add data manually through Supabase Table Editor

## Required Tables

The schema creates these tables:
- ✅ `inventory` - Stock items
- ✅ `cases` - Funeral cases
- ✅ `purchase_orders` - Purchase orders
- ✅ `purchase_order_items` - PO line items
- ✅ `suppliers` - Supplier information
- ✅ `stock_movements` - Stock change history
- ✅ `stock_takes` - Stock take records
- ✅ `stock_take_items` - Stock take line items
- ✅ `vehicles` - Vehicle fleet
- ✅ `livestock` - Livestock records
- And more...

## Troubleshooting

### "relation already exists" errors
- This is fine! It means tables already exist
- The schema uses `CREATE TABLE IF NOT EXISTS` so it's safe to run multiple times

### "permission denied" errors
- Make sure you're using the correct database user
- Check your connection string has the right credentials

### Still getting 500 errors after running schema?
1. Check Render logs for the actual error message
2. Verify the table exists in Supabase Table Editor
3. Make sure you ran the **entire** schema.sql file, not just part of it

