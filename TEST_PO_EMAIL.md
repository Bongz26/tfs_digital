# How to Test Purchase Order Email Functionality

## Prerequisites

### 1. Install Dependencies
```bash
cd server
npm install
```
This installs `nodemailer` for email functionality.

### 2. Configure Email Settings

**For Local Testing:**

Add to `server/.env`:
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
```

**For Gmail:**
1. Go to https://myaccount.google.com/apppasswords
2. Generate an "App Password" (not your regular password)
3. Use that as `SMTP_PASS`

**For Render (Production):**
1. Go to Render Dashboard → Your Service → Environment
2. Add these environment variables:
   - `SMTP_HOST=smtp.gmail.com`
   - `SMTP_PORT=587`
   - `SMTP_USER=your-email@gmail.com`
   - `SMTP_PASS=your-app-password`

### 3. Ensure Suppliers Have Email Addresses

Check your database:
```sql
SELECT id, name, email FROM suppliers;
```

If suppliers don't have emails, add them:
```sql
UPDATE suppliers SET email = 'supplier@example.com' WHERE name = 'Supplier Name';
```

Or add a test supplier:
```sql
INSERT INTO suppliers (name, email, contact_person, phone)
VALUES ('Test Supplier', 'test-supplier@example.com', 'John Doe', '1234567890');
```

## Step-by-Step Testing

### Step 1: Start Your Servers

**Terminal 1 - Backend:**
```bash
cd server
npm start
```
Should see: `🚀 Server running on port 5000`

**Terminal 2 - Frontend:**
```bash
cd client
npm start
```
Should open at `http://localhost:3000` or `http://localhost:3001`

### Step 2: Navigate to Purchase Orders Page

1. Open your browser
2. Go to the Purchase Orders page (usually `/purchase` or `/purchase-orders`)
3. You should see the PO form

### Step 3: Create a Test Purchase Order

1. **Fill in PO Form:**
   - **PO Number:** `PO-TEST-001`
   - **Supplier:** Select from dropdown (should show suppliers with emails)
   - **Order Date:** Today's date
   - **Expected Delivery:** A future date
   - Click **"Create PO"**

2. **Verify PO Created:**
   - You should see the new PO appear in the list
   - Status should be "draft"

### Step 4: Add Items to the PO

1. **Find your test PO** in the list
2. **Add items using the form:**
   - **Inventory ID:** Enter an inventory item ID (e.g., `1`)
   - **Quantity:** `5`
   - **Unit Cost:** `100.00`
   - Click **"Add Item"**

3. **Add 2-3 more items** to make it realistic

4. **Verify items appear:**
   - Items should show in the table
   - Line totals should calculate automatically
   - Grand total should show at bottom

### Step 5: Send the PO via Email

1. **Click "📧 Send to Supplier" button** on your test PO
2. **Enter your email address** when prompted (for the copy)
   - Example: `your-email@gmail.com`
3. **Confirm** when asked

### Step 6: Check Results

**Check Browser:**
- Should see success alert:
  ```
  Purchase Order processed!
  Supplier email: ✅ Sent
  Your copy: ✅ Sent
  ```
- PO status should change to "sent"

**Check Your Email:**
1. Check your inbox (the email you entered)
2. Check supplier's email inbox
3. Both should receive professional HTML emails

**Check Server Logs:**
Look in your terminal (where server is running):
```
✅ Email sent to supplier: supplier@example.com
✅ Copy sent to admin: your-email@gmail.com
```

## What to Verify in the Email

### Email Content Check:
- ✅ Company name: "THUSANANG FUNERAL SERVICES"
- ✅ PO Number displayed clearly
- ✅ Order date and expected delivery date
- ✅ Supplier information
- ✅ Items table with:
  - Item descriptions
  - Quantities
  - Unit prices
  - Line totals
- ✅ Grand total
- ✅ Delivery instructions
- ✅ Payment terms
- ✅ Professional formatting

### Email Formatting Check:
- ✅ Professional design
- ✅ Colors and styling look good
- ✅ Table is readable
- ✅ All information is clear

## Troubleshooting

### Email Not Sending?

**Check 1: SMTP Configuration**
```bash
# Verify .env file has correct values
cat server/.env | grep SMTP
```

**Check 2: Server Logs**
Look for errors in terminal:
```
❌ Error sending email to supplier: ...
```

**Check 3: Gmail App Password**
- Make sure you're using App Password, not regular password
- App Password is 16 characters (no spaces)

**Check 4: Supplier Email**
```sql
-- Check if supplier has email
SELECT name, email FROM suppliers WHERE name = 'Your Supplier Name';
```

### "Supplier not found" Error?

- Make sure supplier name matches exactly (case-sensitive)
- Use the dropdown, don't type manually
- Check suppliers table in database

### "Purchase order has no items" Error?

- Add items to the PO before sending
- Items must be added using the "Add Item" form

### Email Goes to Spam?

- Check spam/junk folder
- For Gmail, might need to mark as "Not Spam"
- Consider using a business email instead of personal Gmail

## Testing Checklist

- [ ] Server starts without errors
- [ ] Frontend loads Purchase Orders page
- [ ] Suppliers dropdown shows suppliers
- [ ] Can create a new PO
- [ ] Can add items to PO
- [ ] Items display correctly with totals
- [ ] "Send to Supplier" button appears
- [ ] Email prompt works
- [ ] Email sends successfully
- [ ] Supplier receives email
- [ ] You receive copy
- [ ] Email looks professional
- [ ] All PO details are correct in email
- [ ] PO status changes to "sent"

## Quick Test Script

If you want to test the email endpoint directly:

```bash
# Test email endpoint (replace PO_ID with actual ID)
curl -X POST http://localhost:5000/api/purchase-orders/1/process \
  -H "Content-Type: application/json" \
  -d '{"admin_email": "your-email@gmail.com"}'
```

## Next Steps After Testing

1. **If everything works:**
   - Add real suppliers with real email addresses
   - Start using for actual purchase orders

2. **If issues:**
   - Check server logs for specific errors
   - Verify SMTP settings
   - Test with different email providers
   - Check spam folders

## Production Testing

When deploying to Render:
1. Add SMTP environment variables in Render dashboard
2. Test with a real supplier email
3. Verify emails are received
4. Check that emails look professional on mobile devices too

