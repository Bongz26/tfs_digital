# Quick Email Setup - dtremotesup@gmail.com

## ✅ Your Email Configuration

**Email:** `dtremotesup@gmail.com`

## 🚀 Quick Setup Steps

### 1. Get Gmail App Password

1. Go to: https://myaccount.google.com/apppasswords
2. Sign in with: **dtremotesup@gmail.com**
3. Select **"Mail"** → **"Other (Custom name)"** → Type **"TFS Digital"**
4. Click **"Generate"**
5. **Copy the 16-character password** (remove spaces)

### 2. Add to Local .env File

Create or edit `server/.env` file:

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=dtremotesup@gmail.com
SMTP_PASS=your-16-char-app-password-here
```

**Replace `your-16-char-app-password-here` with the password from Step 1**

### 3. Restart Server

```bash
cd server
npm start
```

### 4. Test It

1. Create a Purchase Order
2. Add items
3. Click "📧 Send to Supplier"
4. Check email inbox

## ⚠️ Important

- **App Password** is different from your regular Gmail password
- You need **2-Factor Authentication** enabled first
- Remove spaces from the app password (16 characters total)
- Never share or commit the `.env` file

## 🔧 If It Doesn't Work

1. **Check server logs** - Look for email errors
2. **Verify 2FA is enabled** - Required for app passwords
3. **Check password format** - No spaces, exactly 16 characters
4. **Check spam folder** - Emails might go there first

## 📧 For Production (Render)

Add these same variables to Render Dashboard → Your Service → Environment:
- `SMTP_HOST=smtp.gmail.com`
- `SMTP_PORT=587`
- `SMTP_USER=dtremotesup@gmail.com`
- `SMTP_PASS=your-app-password`

