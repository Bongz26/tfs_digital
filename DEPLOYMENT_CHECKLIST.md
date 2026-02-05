# Deployment Checklist for Render

## 🚀 Pre-Deployment Checklist

### 1. Code Changes to Push
- ✅ Fixed API configuration (`client/src/api/config.js`)
- ✅ Registered missing routes (`server/index.js`):
  - `/api/vehicles` - Fleet management
  - `/api/roster` - Vehicle calendar/assignments
  - `/api/livestock` - Cow management
  - `/api/checklist` - Case task tracking
  - `/api/sms` - SMS logging
- ✅ Fixed Dashboard API calls (`client/src/pages/Dashboard.jsx`)
- ✅ Updated production API URL to `admintfs.onrender.com`

### 2. Environment Variables for Render

#### Backend Service (if separate)
Set these in Render Dashboard → Your Backend Service → Environment:

```env
DATABASE_URL=postgresql://postgres:[PASSWORD]@db.uucjdcbtpunfsyuixsmc.supabase.co:5432/postgres
PORT=5000
NODE_ENV=production
SUPABASE_URL=https://uucjdcbtpunfsyuixsmc.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV1Y2pkY2J0cHVuZnN5dWl4c21jIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI3ODE0MzIsImV4cCI6MjA3ODM1NzQzMn0.2Pfe6Z4mhkJn5d1HlnDd8ACMpydNO1a_CSw_qQvYQsI
FRONTEND_URL=https://admintfs.onrender.com
```

#### Frontend Service (if separate)
Set these in Render Dashboard → Your Frontend Service → Environment:

```env
REACT_APP_API_URL=https://admintfs.onrender.com
```

**Note:** If your frontend and backend are on the same Render service, you may not need `REACT_APP_API_URL` as the config will automatically detect the production hostname.

### 3. Database Setup
Make sure your Supabase database has all required tables:
- ✅ Run `server/database/schema.sql` if not already done
- ✅ Ensure `suppliers` table exists (for Purchase Orders)
- ✅ Ensure `purchase_orders` and `purchase_order_items` tables exist
- ✅ Ensure `inventory` table has `created_at` and `updated_at` columns

### 4. Build Commands (if needed)

#### Backend
```bash
cd server && npm install && npm start
```

#### Frontend
```bash
cd client && npm install && npm run build
```

### 5. After Deployment

1. **Test Health Endpoint:**
   ```
   https://admintfs.onrender.com/api/health
   ```
   Should return: `{"status":"ok","timestamp":"..."}`

2. **Test Dashboard:**
   ```
   https://admintfs.onrender.com/api/dashboard
   ```

3. **Test Purchase Orders:**
   ```
   https://admintfs.onrender.com/api/purchase-orders
   ```

4. **Check Browser Console:**
   - Open `https://admintfs.onrender.com`
   - Check console for API config logs
   - Should show: `🌐 [API Config] Final API_HOST: https://admintfs.onrender.com`

## 🔍 Troubleshooting

### Issue: API calls failing in production
- Check that `REACT_APP_API_URL` is set correctly in Render
- Verify CORS is allowing your frontend domain
- Check server logs in Render dashboard

### Issue: Database connection errors
- Verify `DATABASE_URL` is correct in Render environment variables
- Check that Supabase project is not paused
- Verify password is URL-encoded if it contains special characters

### Issue: Missing routes (404 errors)
- Ensure all route files are pushed to Git
- Check that `server/index.js` has all routes registered
- Restart the Render service after code changes

## 📝 Git Commands to Push

```bash
# Check what files have changed
git status

# Add all changes
git add .

# Commit with descriptive message
git commit -m "Fix: Register missing API routes and update production config

- Register vehicles, roster, livestock, checklist, and sms routes
- Fix Dashboard API configuration to use shared config
- Update production API URL to admintfs.onrender.com
- Ensure all frontend components use centralized API config"

# Push to your repository
git push origin main
# (or your branch name)
```

## ✅ Post-Deployment Verification

After pushing and Render redeploys:

1. ✅ Dashboard loads without errors
2. ✅ Active Cases page works
3. ✅ Stock Management works
4. ✅ Purchase Orders work
5. ✅ Vehicle Calendar works (roster endpoint)
6. ✅ Case creation works
7. ✅ All API endpoints return data (not 404)

---

**Last Updated:** After fixing route registrations and API configuration

