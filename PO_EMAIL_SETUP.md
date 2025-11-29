# Purchase Order Email Setup

## Features Added

1. ✅ **Supplier Name Lookup** - Dropdown instead of ID input
2. ✅ **Email Functionality** - Send PO to supplier and copy to admin
3. ✅ **Process/Send Button** - Button to send PO via email

## Setup Required

### 1. Install Nodemailer

The package has been added to `package.json`. Run:

```bash
cd server
npm install
```

### 2. Configure Email Settings

Add these environment variables to your `.env` file (local) or Render dashboard (production):

```env
# Email Configuration (for sending POs)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
```

**For Gmail:**
1. Enable 2-Factor Authentication on your Google account
2. Generate an "App Password": https://myaccount.google.com/apppasswords
3. Use the app password (not your regular password) for `SMTP_PASS`

**For Other Email Providers:**
- **Outlook/Hotmail**: `smtp-mail.outlook.com`, port `587`
- **Yahoo**: `smtp.mail.yahoo.com`, port `587`
- **Custom SMTP**: Use your provider's SMTP settings

### 3. Add Suppliers with Email Addresses

Make sure your suppliers in the database have email addresses:

```sql
-- Update existing suppliers
UPDATE suppliers SET email = 'supplier@example.com' WHERE name = 'Supplier Name';

-- Or add new supplier
INSERT INTO suppliers (name, email, contact_person, phone)
VALUES ('New Supplier', 'supplier@example.com', 'John Doe', '1234567890');
```

## How It Works

### Creating a Purchase Order

1. Select supplier from dropdown (shows name and email)
2. Fill in PO details
3. Add items to the PO
4. Click "📧 Send to Supplier" button

### Sending Purchase Order

1. Click "📧 Send to Supplier" on a PO with items
2. Enter your email address (for copy)
3. System sends:
   - **To Supplier**: Professional HTML email with PO details
   - **To You**: Copy of the same email (as proof)
4. PO status changes to "sent"

## Email Template

The email includes:
- PO Number and Date
- Supplier Information
- Items Table (Item, Quantity, Unit Cost, Total)
- Grand Total
- Professional formatting

## Troubleshooting

### Email Not Sending

1. **Check SMTP credentials** in `.env` or Render environment variables
2. **Verify supplier has email** in database
3. **Check server logs** for email errors
4. **For Gmail**: Make sure you're using an App Password, not regular password

### "Supplier not found" Error

- Make sure supplier name matches exactly (case-sensitive)
- Check suppliers table in database
- Use the dropdown - don't type manually

### Testing Email

You can test by:
1. Creating a test PO
2. Adding items
3. Clicking "Send to Supplier"
4. Check both supplier email and your copy

## API Endpoints

- `GET /api/purchase-orders/suppliers` - Get all suppliers
- `POST /api/purchase-orders` - Create PO (accepts `supplier_name` or `supplier_id`)
- `POST /api/purchase-orders/:poId/process` - Send PO via email

## Notes

- New suppliers must be added to database first (not through the form yet)
- Email is sent to supplier's email address from database
- Admin copy is sent to email you provide when clicking "Send"
- PO status automatically changes to "sent" after email is sent

