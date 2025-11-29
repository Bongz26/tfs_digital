# Environment File Setup Guide

## Step 1: Create the `.env` file

Create a new file named `.env` (exactly that name, starting with a dot) in the `server` directory.

**Location:** `server/.env`

## Step 2: Add the following content

Copy and paste this into your `.env` file:

```env
# Database Configuration
# Replace [YOUR_PASSWORD] with your actual Supabase database password
DATABASE_URL=postgresql://postgres:[YOUR_PASSWORD]@db.uucjdcbtpunfsyuixsmc.supabase.co:5432/postgres

# Server Configuration
PORT=5000
NODE_ENV=development

# Supabase API (optional, for direct API calls)
SUPABASE_URL=https://uucjdcbtpunfsyuixsmc.supabase.co
SUPABASE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV1Y2pkY2J0cHVuZnN5dWl4c21jIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI3ODE0MzIsImV4cCI6MjA3ODM1NzQzMn0.2Pfe6Z4mhkJn5d1HlnDd8ACMpydNO1a_CSw_qQvYQsI
```

## Step 3: Replace the password

**Important:** Replace `[YOUR_PASSWORD]` with your actual Supabase database password.

For example, if your password is `MySecurePassword123`, your DATABASE_URL should look like:

```env
DATABASE_URL=postgresql://postgres:MySecurePassword123@db.uucjdcbtpunfsyuixsmc.supabase.co:5432/postgres
```

## Step 4: How to find your Supabase password

1. Go to your Supabase project dashboard
2. Navigate to **Settings** → **Database**
3. Look for **Connection string** or **Database password**
4. If you don't have the password, you may need to reset it in Supabase

## Important Notes

- **Never commit the `.env` file to Git** - it's already in `.gitignore`
- **Keep your password secure** - don't share it publicly
- **The `.env` file must be in the `server` directory** (same level as `index.js`)
- **No spaces around the `=` sign** in the `.env` file
- **No quotes needed** around values (unless the value itself contains spaces)

## Example of correct `.env` file location:

```
tfs_digital/
└── server/
    ├── .env          ← Create it here
    ├── index.js
    ├── package.json
    └── ...
```

## Verify the setup

After creating the `.env` file:

1. Make sure it's in the `server` directory
2. Make sure you replaced `[YOUR_PASSWORD]` with your actual password
3. Start the server: `npm run dev`
4. Check the console - you should see: `✅ Database connection test successful`

If you see an error, double-check:
- The file is named exactly `.env` (not `.env.txt` or `env`)
- The password is correct (no extra spaces or characters)
- The file is in the `server` directory

