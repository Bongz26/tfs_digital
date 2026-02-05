# Test Email Setup - Step by Step

## ✅ Step 1: Generate App Password

1. Go to: https://myaccount.google.com/apppasswords
2. Sign in with: **dtremotesup@gmail.com**
3. You should now see the App Passwords page (since 2FA is enabled)
4. Under "Select app", choose **"Mail"**
5. Under "Select device", choose **"Other (Custom name)"**
6. Type: **"TFS Digital PO System"**
7. Click **"Generate"**
8. **COPY THE 16-CHARACTER PASSWORD** (it looks like: `abcd efgh ijkl mnop`)
   - ⚠️ **You can only see this once!** Save it somewhere safe
   - Remove the spaces: `abcdefghijklmnop`

## ✅ Step 2: Add to .env File

1. Open `server/.env` file (create it if it doesn't exist)
2. Add or update these lines:

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=dtremotesup@gmail.com
SMTP_PASS=abcdefghijklmnop
```

**Replace `abcdefghijklmnop` with your actual 16-character app password (no spaces)**

## ✅ Step 3: Restart Server

1. Stop your server (Ctrl+C if running)
2. Start it again:
   ```bash
   cd server
   npm start
   ```
3. Look for any email-related errors in the console

## ✅ Step 4: Test via Purchase Order

### Option A: Quick Test (Recommended)

1. **Open your app** → Go to Purchase Orders page
2. **Create a test PO:**
   - PO Number: `TEST-001`
   - Supplier: Select one or enter manually
   - **Supplier Email:** Enter `dtremotesup@gmail.com` (to send to yourself for testing)
   - Order Date: Today's date
   - Click "Create PO"

3. **Add an item:**
   - Select an item from inventory
   - Quantity: 1
   - Unit Cost: 100.00
   - Click "Add Item"

4. **Send the PO:**
   - Click "📧 Send to Supplier" button
   - Enter your email: `dtremotesup@gmail.com` (for admin copy)
   - Click "Send"

5. **Check your email:**
   - Check inbox for `dtremotesup@gmail.com`
   - Check spam folder if not in inbox
   - You should receive 2 emails:
     - One to supplier (yourself)
     - One copy to admin (yourself)

### Option B: Test with Real Supplier Email

1. Create a PO with a real supplier email
2. Send it
3. Check if supplier receives it

## ✅ Step 5: Check Server Logs

Look at your server console for these messages:

**Success:**
```
✅ Email transporter verified
✅ Email sent to supplier: dtremotesup@gmail.com
✅ Copy sent to admin: dtremotesup@gmail.com
```

**Errors:**
```
❌ Error creating email transporter: ...
❌ Error sending email to supplier: ...
```

## 🔍 Troubleshooting

### If you see "Email configuration missing"
- Check `.env` file exists in `server/` folder
- Check all 4 variables are set (SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS)
- Restart server after adding variables

### If you see "Invalid credentials"
- Check app password has no spaces
- Verify it's exactly 16 characters
- Make sure you're using App Password, not regular password

### If emails don't arrive
- Check spam folder
- Wait 1-2 minutes (sometimes delayed)
- Check server logs for errors
- Verify email address is correct

### If "Supplier email not found"
- Make sure supplier has email in database, OR
- Use manual email entry when creating PO

## ✅ Success Indicators

You'll know it works when:
- ✅ Server starts without email errors
- ✅ "Send to Supplier" button works
- ✅ You receive email(s) in inbox
- ✅ Email has professional formatting
- ✅ PO details are correct in email

## 🎯 Quick Test Checklist

- [ ] App Password generated (16 characters, no spaces)
- [ ] Added to `server/.env` file
- [ ] Server restarted
- [ ] Created test PO
- [ ] Added item to PO
- [ ] Clicked "Send to Supplier"
- [ ] Received email(s) in inbox
- [ ] Email looks professional and correct

