# Testing GRV on the Frontend

## Overview

This guide explains how to test the GRV (Goods Received Voucher) functionality directly in the web browser interface.

## Prerequisites

1. ✅ **Backend server is running**
   ```bash
   cd server
   npm run dev
   ```
   Server should be running on `http://localhost:5000`

2. ✅ **Frontend is running**
   ```bash
   cd client
   npm start
   ```
   Frontend should open at `http://localhost:3000`

3. ✅ **You have test data:**
   - At least one Purchase Order with status "sent" or "received"
   - Purchase Order should have items added to it
   - Inventory items exist in the database

## Step-by-Step Testing Guide

### Step 1: Navigate to Purchase Orders Page

1. Open your browser and go to `http://localhost:3000`
2. Click on **"Purchase Orders"** in the navigation menu
3. You should see a list of all Purchase Orders

### Step 2: Find a Purchase Order to Receive

Look for a Purchase Order that:
- Has items added to it (not empty)
- Status is either **"sent"** or **"received"**
- Has items that haven't been fully received yet

**Visual Indicators:**
- Status badge shows "sent" or "received"
- Items table shows "Received" column with quantities
- Green badge = fully received
- Yellow badge = partially received
- Gray badge = not received

### Step 3: Open the GRV Receive Form

1. Find a Purchase Order with status "sent" or "received"
2. Click the **"📦 Receive Items (GRV)"** button
3. A blue form should appear below the Purchase Order

**What you should see:**
- Blue-bordered form with title "📦 Receive Goods (GRV)"
- "Received By" text field
- List of items with quantity input fields
- Each item shows:
  - Item name
  - Ordered quantity
  - Already received quantity (if any)
  - Remaining quantity
  - Input field for new quantity to receive

### Step 4: Fill in the GRV Form

1. **Enter your name** in the "Received By" field
   - Example: "John Doe" or "Warehouse Staff"
   - This field is required

2. **Enter quantities to receive** for each item:
   - You can receive all items or just some
   - Enter the quantity you actually received
   - The form shows:
     - **Ordered**: Total quantity ordered
     - **Already Received**: Previously received (if any)
     - **Remaining**: How many you can still receive

3. **Validation rules:**
   - Cannot receive more than ordered
   - Cannot enter negative numbers
   - Must enter at least one quantity > 0
   - Fully received items are disabled

### Step 5: Submit the GRV

1. Review your entries
2. Click the **"✅ Receive Items"** button
3. Wait for the success message

**Expected Results:**
- ✅ Success alert: "GRV received successfully! Inventory has been updated."
- Form closes automatically
- Purchase Order list refreshes
- Received quantities update in the items table

### Step 6: Verify the Results

After receiving, verify:

1. **Purchase Order Status:**
   - Status should change to "received" (if all items received)
   - Or remain "sent" if partial receipt

2. **Received Quantities:**
   - Check the "Received" column in the items table
   - Should show updated quantities
   - Color coding:
     - 🟢 Green = Fully received
     - 🟡 Yellow = Partially received
     - ⚪ Gray = Not received

3. **Inventory Stock:**
   - Go to **Stock Management** page
   - Check that stock quantities increased
   - Stock should increase by the quantity you received

4. **Stock Movements:**
   - Check Stock Management for movement history
   - Should show new "purchase" movement
   - Reason: "GRV Received"

## Testing Scenarios

### Scenario 1: Full Receipt (Receive All Items)

**Steps:**
1. Find a PO with status "sent"
2. Click "📦 Receive Items (GRV)"
3. Enter your name
4. Enter the full ordered quantity for all items
5. Submit

**Expected:**
- ✅ All items marked as fully received (green badges)
- PO status changes to "received"
- Inventory stock increases by full quantities
- Success message appears

### Scenario 2: Partial Receipt (Receive Some Items)

**Steps:**
1. Find a PO with items
2. Open GRV form
3. Enter your name
4. Enter partial quantities (less than ordered)
5. Submit

**Expected:**
- ✅ Items show partial receipt (yellow badges)
- PO status may remain "sent" or change to "received"
- Inventory increases by partial amounts
- You can receive more later

### Scenario 3: Multiple Partial Receipts

**Steps:**
1. Receive partial quantities (e.g., 5 out of 10)
2. Click "📦 Receive Items (GRV)" again
3. Enter remaining quantities (e.g., 5 more)
4. Submit

**Expected:**
- ✅ Total received = sum of all receipts
- Form shows "Already Received" correctly
- Final receipt makes items fully received

### Scenario 4: Receive Only Some Items

**Steps:**
1. PO has multiple items (e.g., Item A: 10, Item B: 5)
2. Open GRV form
3. Enter quantity for Item A only (leave Item B at 0)
4. Submit

**Expected:**
- ✅ Only Item A received
- Item B remains unreceived
- Inventory updates only for Item A

### Scenario 5: Error Handling

**Test Invalid Inputs:**

1. **Negative Quantity:**
   - Try entering -5
   - Should show error: "Quantity cannot be negative"

2. **More Than Ordered:**
   - Try entering 20 when ordered is 10
   - Should show error: "Cannot receive more than ordered (10)"

3. **Empty Name:**
   - Leave "Received By" empty
   - Should show error: "Please enter your name"

4. **All Quantities Zero:**
   - Leave all quantities at 0
   - Should show error: "Please enter at least one quantity to receive"

## Visual Testing Checklist

### UI Elements to Verify

- [ ] GRV button appears for POs with status "sent" or "received"
- [ ] Form opens when button is clicked
- [ ] Form has blue styling and clear title
- [ ] "Received By" field is visible and required
- [ ] All PO items are listed in the form
- [ ] Each item shows:
  - [ ] Item name
  - [ ] Ordered quantity
  - [ ] Already received (if any)
  - [ ] Remaining quantity
  - [ ] Quantity input field
- [ ] Fully received items are disabled
- [ ] Error messages appear for invalid inputs
- [ ] Submit button is enabled/disabled correctly
- [ ] Cancel button works (if present)

### After Receiving

- [ ] Success alert appears
- [ ] Form closes automatically
- [ ] PO list refreshes
- [ ] Received quantities update in table
- [ ] Status badges update (green/yellow/gray)
- [ ] PO status updates if needed

## Browser Developer Tools Testing

### Check Network Requests

1. Open browser DevTools (F12)
2. Go to **Network** tab
3. Submit GRV form
4. Look for POST request to `/api/purchase-orders/:poId/receive`

**Verify Request:**
```json
{
  "received_by": "Your Name",
  "received_items": [
    {
      "inventory_id": 2,
      "quantity_received": 10
    }
  ]
}
```

**Verify Response:**
```json
{
  "success": true,
  "message": "GRV processed and inventory updated"
}
```

### Check Console for Errors

1. Open **Console** tab in DevTools
2. Submit GRV form
3. Check for any JavaScript errors
4. Look for API error messages

### Verify State Updates

1. Check React DevTools (if installed)
2. Verify component state updates
3. Check that `onReload` is called after success

## Common Issues & Troubleshooting

### Issue: "Receive Items" Button Not Showing

**Possible Causes:**
- PO status is "draft" (button only shows for "sent" or "received")
- PO has no items
- Frontend not refreshed

**Solutions:**
- Send the PO to supplier first (changes status to "sent")
- Add items to the PO
- Refresh the page

### Issue: Form Doesn't Submit

**Possible Causes:**
- Validation errors (check error messages)
- Network error (check DevTools Network tab)
- Backend server not running

**Solutions:**
- Fix validation errors
- Check backend is running on port 5000
- Check browser console for errors

### Issue: Quantities Don't Update After Receiving

**Possible Causes:**
- Page not refreshing
- API call failed silently
- Backend error

**Solutions:**
- Manually refresh the page
- Check Network tab for failed requests
- Check backend logs for errors
- Verify database directly

### Issue: Inventory Not Updating

**Possible Causes:**
- Backend transaction failed
- Inventory ID mismatch
- Database error

**Solutions:**
- Check backend server logs
- Verify inventory items exist
- Check database directly
- Test API endpoint manually

## Best Practices for Testing

1. **Test with Real Data:**
   - Use actual inventory items
   - Use realistic quantities
   - Test with multiple items

2. **Test Edge Cases:**
   - Full receipt
   - Partial receipt
   - Multiple partial receipts
   - Receiving only some items
   - Invalid inputs

3. **Verify Data Integrity:**
   - Check inventory stock after receiving
   - Verify stock movements recorded
   - Confirm PO status updates
   - Check received quantities are correct

4. **Test User Experience:**
   - Form is easy to use
   - Error messages are clear
   - Success feedback is visible
   - Page refreshes correctly

5. **Test Across Browsers:**
   - Chrome
   - Firefox
   - Safari
   - Edge

## Quick Test Checklist

Use this checklist for quick testing:

- [ ] Navigate to Purchase Orders page
- [ ] Find a PO with status "sent" or "received"
- [ ] Click "📦 Receive Items (GRV)" button
- [ ] Form opens correctly
- [ ] Enter name in "Received By" field
- [ ] Enter quantities to receive
- [ ] Submit form
- [ ] Success message appears
- [ ] Form closes
- [ ] PO list refreshes
- [ ] Received quantities update
- [ ] Status badges update
- [ ] Inventory stock increases (verify in Stock Management)

## Summary

Frontend GRV testing involves:
1. ✅ Navigating to Purchase Orders page
2. ✅ Finding a PO ready to receive
3. ✅ Opening the GRV form
4. ✅ Entering received quantities
5. ✅ Submitting the form
6. ✅ Verifying updates in the UI
7. ✅ Checking inventory and stock movements

The main UI element is the **"📦 Receive Items (GRV)"** button that appears for Purchase Orders with status "sent" or "received".

