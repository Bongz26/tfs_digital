# TFS Digital Server Setup Guide

## Database Configuration

### 1. Create `.env` file in the `server` directory

Create a file named `.env` in the `server` folder with the following content:

```env
# Database Configuration
DATABASE_URL=postgresql://postgres:[YOUR_PASSWORD]@db.uucjdcbtpunfsyuixsmc.supabase.co:5432/postgres

# Server Configuration
PORT=5000
NODE_ENV=development

# Supabase API (optional, for direct API calls)
SUPABASE_URL=https://uucjdcbtpunfsyuixsmc.supabase.co
SUPABASE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV1Y2pkY2J0cHVuZnN5dWl4c21jIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI3ODE0MzIsImV4cCI6MjA3ODM1NzQzMn0.2Pfe6Z4mhkJn5d1HlnDd8ACMpydNO1a_CSw_qQvYQsI
```

**Important:** Replace `[YOUR_PASSWORD]` with your actual Supabase database password.

### 2. Install Dependencies

Make sure all dependencies are installed:

```bash
cd server
npm install
```

### 3. Database Setup

Ensure your Supabase database has all the required tables. Run the SQL schema provided in your database setup script to create all tables.

### 4. Run the Server

#### Development mode (with auto-reload):
```bash
npm run dev
```

#### Production mode:
```bash
npm start
```

The server will start on port 5000 (or the port specified in your `.env` file).

## API Endpoints

### Cases
- `GET /api/cases` - Get all cases
- `GET /api/cases/:id` - Get single case
- `POST /api/cases` - Create new case
- `PUT /api/cases/:id` - Update case
- `DELETE /api/cases/:id` - Delete case

### Dashboard
- `GET /api/dashboard` - Get dashboard statistics and data

### Vehicles
- `GET /api/vehicles` - Get all vehicles
- `GET /api/vehicles/available` - Get available vehicles
- `GET /api/vehicles/:id` - Get single vehicle
- `PATCH /api/vehicles/:id/availability` - Update vehicle availability
- `PUT /api/vehicles/:id` - Update vehicle

### Inventory
- `GET /api/inventory` - Get all inventory items
- `GET /api/inventory/low-stock` - Get low stock items
- `GET /api/inventory/:id` - Get single inventory item
- `PATCH /api/inventory/:id/stock` - Update inventory stock
- `POST /api/inventory/:id/reserve` - Create reservation

### Health Check
- `GET /api/health` - Check server status

## Troubleshooting

### Database Connection Issues

If you see database connection errors:

1. Verify your `.env` file exists in the `server` directory
2. Check that `DATABASE_URL` is correctly set with your password
3. Ensure your Supabase database is accessible
4. Verify the database tables exist by running the schema SQL

### Port Already in Use

If port 5000 is already in use:

1. Change the `PORT` in your `.env` file
2. Or stop the process using port 5000

### Module Not Found Errors

If you see module not found errors:

1. Run `npm install` in the server directory
2. Verify all dependencies in `package.json` are installed

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `DATABASE_URL` | PostgreSQL connection string | Yes |
| `PORT` | Server port (default: 5000) | No |
| `NODE_ENV` | Environment (development/production) | No |
| `SUPABASE_URL` | Supabase project URL | No |
| `SUPABASE_KEY` | Supabase API key | No |

