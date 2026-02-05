# 🚀 Quick Start Guide: Admin Override Feature

## What This Does

Prevents non-admin users from changing driver or vehicle assignments after a case has been submitted/scheduled. Only administrators can override these locked assignments.

---

## How to Test It Right Now

### Step 1: Check Your Current User Role
```sql
-- Run this in your database to check your role
SELECT id, username, role FROM users WHERE id = YOUR_USER_ID;

-- To make yourself an admin temporarily for testing:
UPDATE users SET role = 'admin' WHERE id = YOUR_USER_ID;
```

### Step 2: Start the Application
```bash
# Terminal 1: Start the server
cd server
npm run dev

# Terminal 2: Start the client
cd client
npm run dev
```

### Step 3: Test the Feature

#### Test A: Non-Admin User (Should be DENIED)
1. Create a test case or use existing case like "MALINGA THOKOZANI ERIC"
2. Assign a driver and vehicle to it
3. Change the case status to **"scheduled"**
4. Try to change the driver or vehicle
5. **Expected Result:** ❌ You should see an error saying "Only administrators can modify..."

#### Test B: Admin User (Should be ALLOWED with Warning)
1. Make sure you're logged in as an admin (role = 'admin')
2. Go to a case that's already **"scheduled"**
3. Look for the yellow warning box: "🔒 Locked Assignment - Admin Override Active"
4. Try to change the driver or vehicle
5. **Expected Result:** ✅ Change should succeed, and server logs should show "ADMIN OVERRIDE"

---

## Visual Indicators to Look For

### 1. Status Badge
Every case card shows a status badge in the top right:
- **Gray**: `INTAKE` (unlocked, anyone can edit)
- **Orange**: `SCHEDULED`, `IN_PROGRESS`, `COMPLETED` (locked, admin-only)

### 2. Warning Boxes
When viewing a locked case:

**Non-Admin sees:**
```
┌─────────────────────────────────────────────┐
│ 🔒 Locked Assignment                        │
│ This case has been submitted. Only          │
│ administrators can modify assignments.      │
└─────────────────────────────────────────────┘
```

**Admin sees:**
```
┌─────────────────────────────────────────────┐
│ 🔒 Locked Assignment                        │
│ ⚠️ Admin Override Active - You can modify   │
│ driver/vehicle assignments                  │
└─────────────────────────────────────────────┘
```

### 3. Error Banner (Non-Admin only)
If a non-admin tries to edit:
```
┌─────────────────────────────────────────────┐
│ 🔒 Permission Denied                    [×] │
│ This case (MALINGA...) has been submitted   │
│ and scheduled. Only administrators can      │
│ modify driver or vehicle assignments.       │
└─────────────────────────────────────────────┘
```

---

## Common Scenarios

### Scenario 1: Last-Minute Vehicle Change (Admin)
**Problem:** Vehicle breaks down, need to assign different vehicle

**Solution:**
1. Log in as admin
2. Navigate to the roster/case
3. See the yellow "Admin Override Active" warning
4. Change the vehicle
5. System logs the override and allows the change

### Scenario 2: Dispatcher Tries to Change (Non-Admin)
**Problem:** Regular dispatcher tries to "fix" an assignment

**Solution:**
1. Dispatcher sees red lock warning
2. Tries to change assignment
3. Gets "Permission Denied" error
4. Contacts admin to make the change

---

## Quick Troubleshooting

### "I'm an admin but can't edit"
✅ Check your user role in the database:
```sql
SELECT role FROM users WHERE id = YOUR_USER_ID;
```
Should return `'admin'` (lowercase)

### "No status badge showing"
✅ Make sure the case has a `status` field set:
```sql
SELECT status FROM cases WHERE id = CASE_ID;
```

### "Changes not being blocked or allowed incorrectly"
✅ **CHECK THE LOGS (NEW!)**
1. Click on the **CASE NUMBER** in the roster card.
2. Open Browser Console (F12) > check the log: `DEBUG CASE: { status: "..." }`
   - If status is missing, frontend didn't get the data.
3. Check the **Server Terminal** (where `npm run dev` is running).
   - Look for: `🔍 Checking constraints...`
   - It will show: `Case found: ..., Status: ..., Is Locked? ...`
   - This tells you exactly why the decision was made.

---

## Database Queries for Testing

### Check Case Status
```sql
SELECT id, case_number, deceased_name, status 
FROM cases 
WHERE case_number = 'CASE-001';
```

### Check Roster Assignments
```sql
SELECT r.id, r.driver_name, v.reg_number, c.status, c.deceased_name
FROM roster r
LEFT JOIN vehicles v ON r.vehicle_id = v.id
LEFT JOIN cases c ON r.case_id = c.id
WHERE c.case_number = 'CASE-001';
```

### Make a User Admin
```sql
UPDATE users SET role = 'admin' WHERE username = 'your_username';
```

### Make a User Regular
```sql
UPDATE users SET role = 'user' WHERE username = 'your_username';
```

### Change Case to Scheduled (to lock it)
```sql
UPDATE cases SET status = 'scheduled' WHERE case_number = 'CASE-001';
```

### Change Case to Intake (to unlock it)
```sql
UPDATE cases SET status = 'intake' WHERE case_number = 'CASE-001';
```

---

## Expected Server Logs

When the feature is working correctly, you should see:

### Non-Admin Attempt (Blocked)
```
⚠️ Non-admin user attempted to modify driver for case MALINGA THOKOZANI ERIC with status: scheduled
```

### Admin Attempt (Allowed)
```
⚠️ ADMIN OVERRIDE: Admin is modifying vehicle for case MALINGA THOKOZANI ERIC with status: scheduled
```

---

## Need Help?

1. **Check the full documentation:** `ADMIN_OVERRIDE_IMPLEMENTATION.md`
2. **View the flow diagram:** `ADMIN_OVERRIDE_FLOW.txt`
3. **Run the test script:**
   ```bash
   cd server
   node test_admin_override.js
   ```

---

## ✅ Success Checklist

- [ ] Server starts without errors
- [ ] Client displays status badges on case cards
- [ ] Locked cases show warning boxes
- [ ] Non-admin users are blocked from editing locked cases
- [ ] Admin users can edit with override warning
- [ ] Server logs show override messages
- [ ] Permission error banner appears on denied attempts

**If all checked, the feature is working correctly!** 🎉
