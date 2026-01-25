# Admin-Only Override for Driver & Vehicle Assignment Changes

## Overview
This implementation adds security controls to ensure that only administrators can modify driver and vehicle assignments after a case has been submitted and scheduled.

## What's Protected
Once a case reaches any of these statuses:
- **`scheduled`** - Case has been scheduled for service
- **`in_progress`** - Service is currently underway  
- **`completed`** - Service has been completed

The driver and vehicle assignments become **locked** and can only be modified by administrators.

## Implementation Details

### Backend Security (`server/routes/roster.js`)

#### 1. Admin-Only Override Check (Lines 107-161)
When a PATCH request tries to update `driver_name` or `vehicle_id`:
1. Fetches the case status associated with the roster entry
2. Checks if the case is in a locked status (`scheduled`, `in_progress`, or `completed`)
3. If locked and user is NOT an admin → **Returns 403 Forbidden**
4. If locked and user IS an admin → **Logs override** and allows the change

**Error Response Example:**
```json
{
  "success": false,
  "error": "This case (MALINGA THOKOZANI ERIC) has been submitted and scheduled. Only administrators can modify driver or vehicle assignments after submission.",
  "case_status": "scheduled",
  "requires_admin": true
}
```

#### 2. Enhanced Roster Data (Lines 10-72)
Added `case_status` to the roster API response:
- Fetches `status` from the `cases` table
- Includes it in the flattened roster data as `case_status`
- Frontend can now determine if a case is locked

### Frontend UI (`client/src/components/VehicleCalendar.jsx`)

#### 1. Case Status Badge (Lines 213-222)
Each case card now displays a status badge:
- **Orange** for locked statuses (`scheduled`, `in_progress`, `completed`)
- **Gray** for unlocked statuses (default/`intake`)

#### 2. Locked Assignment Warning (Lines 225-241)
Visual indicator shown for locked cases:
- **Non-Admin Users**: Red warning box stating only admins can modify
- **Admin Users**: Yellow box with "Admin Override Active" message

#### 3. Permission Error Banner (Lines 152-167)
Displays at the top when a non-admin attempts to modify a locked assignment:
- Shows a clear "Permission Denied" message
- Includes the specific error from the backend
- Can be dismissed by clicking the × button

#### 4. Enhanced Data Model (Line 118)
Added `case_status` to the grouped case data structure so all components have access to this information.

## User Experience

### For Non-Admin Users
1. **Before Submission**: Can freely assign and modify drivers/vehicles
2. **After Submission**: 
   - See 🔒 Locked Assignment warning
   - Assignment cards are visible but editing is blocked
   - Attempting to edit shows "Permission Denied" error

### For Admin Users
1. **Before Submission**: Same as non-admin users
2. **After Submission**:
   - See ⚠️ Admin Override Active warning (yellow)
   - Can still modify assignments
   - Changes are logged with "ADMIN OVERRIDE" prefix in server console

## Example Scenario

**Case**: MALINGA THOKOZANI ERIC
**Status**: Scheduled
**Original Vehicle**: REG-123 (Toyota Hearse)
**New Vehicle**: REG-456 (Mercedes Hearse)

### Non-Admin Attempt:
```
❌ Request to change vehicle rejected
📋 Error shown: "This case (MALINGA THOKOZANI ERIC) has been submitted and scheduled. 
    Only administrators can modify driver or vehicle assignments after submission."
```

### Admin Attempt:
```
✅ Request to change vehicle accepted
📋 Server log: "⚠️ ADMIN OVERRIDE: Admin is modifying vehicle for case 
    MALINGA THOKOZANI ERIC with status: scheduled"
```

## Security Benefits

1. **Prevents Unauthorized Changes**: Regular users cannot modify locked assignments
2. **Audit Trail**: All admin overrides are logged in the server console
3. **Clear Communication**: Users understand why they cannot make changes
4. **Flexibility**: Admins retain full control for legitimate last-minute changes

## Testing Checklist

- [ ] Non-admin user CANNOT modify driver on scheduled case
- [ ] Non-admin user CANNOT modify vehicle on scheduled case  
- [ ] Admin user CAN modify driver on scheduled case
- [ ] Admin user CAN modify vehicle on scheduled case
- [ ] Status badge displays correctly for all case statuses
- [ ] Locked warning shows for scheduled/in_progress/completed cases
- [ ] Permission error displays when non-admin attempts modification
- [ ] Server logs show "ADMIN OVERRIDE" for admin changes

## Configuration

To modify which statuses are locked, edit:

**Backend**: `server/routes/roster.js` line 146
```javascript
const lockedStatuses = ['scheduled', 'in_progress', 'completed'];
```

**Frontend**: `client/src/components/VehicleCalendar.jsx` lines 213-214, 228
```javascript
group.case_status === 'scheduled' || 
group.case_status === 'in_progress' || 
group.case_status === 'completed'
```

## Related Files Modified

1. **`server/routes/roster.js`**
   - Added admin override check
   - Enhanced roster query to include case status
   - Added case_status to response

2. **`client/src/components/VehicleCalendar.jsx`**
   - Added permission error state
   - Enhanced UI with status badges
   - Added locked assignment warnings
   - Updated data grouping to include case_status

## Future Enhancements

- Add audit log table to track all override events
- Email notifications when admins perform overrides
- More granular permissions (e.g., "can_override_scheduled_assignments")
- Case history view showing all assignment changes
