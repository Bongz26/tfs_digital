# Gmail Setup for Purchase Order Emails

## Your Email: dtremotesup@gmail.com

## Step-by-Step Setup

### Step 1: Enable 2-Factor Authentication (Required)

1. Go to: https://myaccount.google.com/security
2. Sign in with: **dtremotesup@gmail.com**
3. Under "Signing in to Google", find **"2-Step Verification"**
4. Click **"Get Started"** and follow the prompts
5. You'll need to verify your phone number

**Why?** Gmail requires 2FA to generate App Passwords (for security)

### Step 2: Generate App Password

1. Go to: https://myaccount.google.com/apppasswords
2. Sign in with: **dtremotesup@gmail.com**
3. You might be asked to sign in again
4. Under "Select app", choose **"Mail"**
5. Under "Select device", choose **"Other (Custom name)"**
6. Type: **"TFS Digital PO System"**
7. Click **"Generate"**
8. **COPY THE 16-CHARACTER PASSWORD** (it looks like: `abcd efgh ijkl mnop`)
   - ⚠️ **You can only see this once!** Save it somewhere safe
   - Remove the spaces when using it (should be 16 characters total)

### Step 3: Add to Local .env File

1. Open `server/.env` file
2. Add these lines (or update if they exist):

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=dtremotesup@gmail.com
SMTP_PASS=your-16-character-app-password-here
```

**Replace `your-16-character-app-password-here` with the actual password from Step 2**

### Step 4: Add to Render (Production)

1. Go to Render Dashboard: https://dashboard.render.com
2. Select your backend service
3. Click **"Environment"** in left sidebar
4. Add these environment variables:

   - **Key:** `SMTP_HOST`
   - **Value:** `smtp.gmail.com`
   - Click "Save"

   - **Key:** `SMTP_PORT`
   - **Value:** `587`
   - Click "Save"

   - **Key:** `SMTP_USER`
   - **Value:** `dtremotesup@gmail.com`
   - Click "Save"

   - **Key:** `SMTP_PASS`
   - **Value:** `your-16-character-app-password-here` (same as Step 3)
   - Click "Save"

5. Render will automatically redeploy

### Step 5: Test the Setup

1. Restart your local server:
   ```bash
   cd server
   npm start
   ```

2. Create a test Purchase Order
3. Add items
4. Click "Send to Supplier"
5. Check your email inbox

## Important Notes

⚠️ **App Password Format:**
- It's 16 characters, might have spaces
- Remove spaces when using: `abcd efgh ijkl mnop` → `abcdefghijklmnop`
- It's different from your regular Gmail password

⚠️ **Security:**
- Never commit `.env` file to Git (it's already in `.gitignore`)
- App Password is safe to use in code (it's designed for this)
- If compromised, you can revoke it and generate a new one

⚠️ **Troubleshooting:**
- If "Less secure app access" error → You need 2FA + App Password
- If "Invalid credentials" → Check password (no spaces, correct)
- If emails go to spam → Check spam folder, mark as "Not Spam"

## Quick Checklist

- [ ] 2-Factor Authentication enabled
- [ ] App Password generated
- [ ] App Password copied (16 characters, no spaces)
- [ ] Added to `server/.env` file
- [ ] Added to Render environment variables
- [ ] Server restarted
- [ ] Test email sent

## Next Steps After Setup

1. Test sending a PO email
2. Verify email arrives in inbox
3. Check spam folder if not received
4. Test with a real supplier email

