# Authentication Setup Guide

This guide explains how to set up and use the authentication system for TFS Digital.

---

## 🔧 Prerequisites

Before you begin, make sure you have:

1. **Supabase Project** with authentication enabled
2. **Environment variables** configured in `server/.env`

---

## 📝 Environment Variables

Add these to your `server/.env` file:

```env
# Supabase Configuration (required)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key

# Service Role Key (required for admin operations)
SUPABASE_SERVICE_KEY=your-service-role-key

# Database (already configured)
DATABASE_URL=postgresql://...
```

### Where to find these keys:

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Go to **Settings → API**
4. Copy:
   - **URL** → `SUPABASE_URL`
   - **anon public** → `SUPABASE_ANON_KEY`
   - **service_role** → `SUPABASE_SERVICE_KEY` (⚠️ Keep this secret!)

---

## 🚀 Setup Steps

### Step 1: Run the Database Migration

```bash
cd server
node database/migrate-add-user-profiles.js
```

This creates:
- `user_profiles` table (stores user role, name, etc.)
- `audit_log` table (tracks all changes)
- Adds tracking columns to existing tables

### Step 2: Create Your First Admin User

**Option A: Using the script (Interactive)**

```bash
cd server
node database/create-admin-user.js
```

Follow the prompts to enter:
- Email address
- Password (min 6 characters)
- Full name
- Phone number (optional)

**Option B: Using the API (After server is running)**

```bash
# First, start the server
cd server && npm start

# Then register via API (in another terminal)
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "your-password",
    "full_name": "Admin User"
  }'
```

Then manually update the role in the database:
```sql
UPDATE user_profiles SET role = 'admin' WHERE email = 'admin@example.com';
```

### Step 3: Test the Login

1. Start the server: `cd server && npm start`
2. Start the frontend: `cd client && npm start`
3. Navigate to: `http://localhost:3000/login`
4. Login with your admin credentials

---

## 🔑 User Roles

| Role | Level | Permissions |
|------|-------|-------------|
| **admin** | 4 | Full access - manage users, all data |
| **manager** | 3 | View/edit all data, no user management |
| **staff** | 2 | View/edit cases and inventory |
| **driver** | 1 | View assigned routes only |

### Role Hierarchy

Higher roles inherit all permissions from lower roles:
```
admin > manager > staff > driver
```

---

## 🌐 API Endpoints

### Public Endpoints (No auth required)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | Login and get token |
| POST | `/api/auth/refresh` | Refresh access token |
| POST | `/api/auth/forgot-password` | Send password reset email |

### Protected Endpoints (Auth required)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/auth/me` | Get current user profile |
| PUT | `/api/auth/me` | Update own profile |
| POST | `/api/auth/logout` | Logout |
| POST | `/api/auth/reset-password` | Reset password (with token) |

### Admin-Only Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/auth/users` | Get all users |
| POST | `/api/auth/users/create` | Create new user |
| PUT | `/api/auth/users/:id/role` | Update user role |
| PUT | `/api/auth/users/:id/status` | Activate/deactivate user |

---

## 🔒 Using Authentication in API Requests

### Frontend (React)

The `AuthContext` provides authentication state:

```jsx
import { useAuth } from './context/AuthContext';

function MyComponent() {
  const { user, isAuthenticated, login, logout } = useAuth();

  if (!isAuthenticated) {
    return <p>Please login</p>;
  }

  return <p>Welcome, {user.full_name}!</p>;
}
```

### Backend (Protected Routes)

Use the auth middleware to protect routes:

```javascript
const { requireAuth, requireRole, ROLES } = require('../middleware/auth');

// Require any authenticated user
router.get('/protected', requireAuth, (req, res) => {
  res.json({ user: req.user });
});

// Require specific role
router.get('/admin-only', requireAuth, requireRole([ROLES.ADMIN]), (req, res) => {
  res.json({ message: 'Admin access granted' });
});

// Require minimum role level
router.get('/manager-plus', requireAuth, requireMinRole('manager'), (req, res) => {
  res.json({ message: 'Manager or above' });
});
```

---

## 📱 Frontend Protected Routes

To protect a route (require login):

```jsx
import ProtectedRoute from './components/ProtectedRoute';

// In App.js routes:
<Route path="/dashboard" element={
  <ProtectedRoute>
    <Dashboard />
  </ProtectedRoute>
} />

// With role requirement:
<Route path="/admin" element={
  <ProtectedRoute requiredRole="admin">
    <AdminPanel />
  </ProtectedRoute>
} />
```

---

## 🧪 Testing Authentication

### Test Login API

```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@example.com", "password": "your-password"}'
```

Response:
```json
{
  "success": true,
  "session": {
    "access_token": "eyJ...",
    "refresh_token": "...",
    "expires_at": 1234567890
  },
  "user": {
    "id": "uuid",
    "email": "admin@example.com",
    "full_name": "Admin User",
    "role": "admin"
  }
}
```

### Test Protected Endpoint

```bash
curl http://localhost:5000/api/auth/me \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

---

## ⚙️ Enabling Route Protection

Currently, routes are **NOT protected** (for testing). To enable protection:

1. Open `client/src/App.js`
2. Find the routes section
3. Uncomment the "Option 2" protected routes
4. Comment out the "Option 1" unprotected routes

```jsx
// Change from:
<Route path="/dashboard" element={<Dashboard />} />

// To:
<Route path="/dashboard" element={
  <ProtectedRoute>
    <Dashboard />
  </ProtectedRoute>
} />
```

---

## 🔧 Troubleshooting

### "Authentication service unavailable"

- Check `SUPABASE_URL` and `SUPABASE_ANON_KEY` are set
- Verify the keys are correct in Supabase dashboard

### "Invalid or expired token"

- Token may have expired (default: 1 hour)
- Use the refresh endpoint to get a new token
- Or login again

### "Access denied"

- User doesn't have the required role
- Check `user_profiles` table for the user's role
- Admin can update roles via `/api/auth/users/:id/role`

### "Cannot create user" (Admin)

- Ensure `SUPABASE_SERVICE_KEY` is set (not just anon key)
- Service key is required for admin user creation

---

## 📊 Database Tables

### user_profiles
```sql
- id (SERIAL PRIMARY KEY)
- user_id (UUID, links to Supabase auth.users)
- email (VARCHAR)
- full_name (VARCHAR)
- phone (VARCHAR)
- role (VARCHAR: admin/manager/staff/driver)
- active (BOOLEAN)
- last_login (TIMESTAMP)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
```

### audit_log
```sql
- id (SERIAL PRIMARY KEY)
- user_id (UUID)
- user_email (VARCHAR)
- action (VARCHAR: CREATE/UPDATE/DELETE/LOGIN)
- resource_type (VARCHAR: case/inventory/etc.)
- resource_id (INT)
- old_values (JSONB)
- new_values (JSONB)
- ip_address (VARCHAR)
- user_agent (TEXT)
- created_at (TIMESTAMP)
```

---

## 🚀 Next Steps

1. **Create admin user** using the script
2. **Test login** via the frontend
3. **Enable route protection** in App.js when ready
4. **Add auth headers** to other API calls
5. **Create additional users** via admin panel

---

## 📚 Related Files

- Backend:
  - `server/middleware/auth.js` - Auth middleware
  - `server/routes/auth.js` - Auth API routes
  - `server/database/migrate-add-user-profiles.js` - Migration
  - `server/database/create-admin-user.js` - Admin setup script

- Frontend:
  - `client/src/context/AuthContext.jsx` - Auth state management
  - `client/src/api/auth.js` - Auth API functions
  - `client/src/pages/Login.jsx` - Login page
  - `client/src/components/ProtectedRoute.jsx` - Route protection

---

**Last Updated:** November 2025

