# TFS Digital Server - File Structure

## Project Files Created

### Core Server Files
- `index.js` - Main server entry point
- `package.json` - Dependencies and scripts
- `.gitignore` - Git ignore rules
- `README.md` - Quick start guide
- `SETUP.md` - Detailed setup instructions
- `API.md` - Complete API documentation

### Database Files
- `database/schema.sql` - Database schema (tables, indexes)
- `database/seed.sql` - Sample seed data
- `database/init.js` - Database initialization script
- `config/db.js` - Database connection configuration

### Route Files
- `routes/cases.js` - Case management routes (CRUD)
- `routes/dashboard.js` - Dashboard data routes
- `routes/vehicles.js` - Vehicle management routes
- `routes/inventory.js` - Inventory management routes
- `routes/roster.js` - Driver roster management routes
- `routes/livestock.js` - Livestock management routes
- `routes/checklist.js` - Checklist management routes
- `routes/sms.js` - SMS log management routes

### Utility Files
- `utils/validators.js` - Validation utility functions
- `utils/helpers.js` - Helper utility functions

## Environment File

**Important:** You need to create a `.env` file in the `server` directory with the following content:

```env
DATABASE_URL=postgresql://postgres:[YOUR_PASSWORD]@db.uucjdcbtpunfsyuixsmc.supabase.co:5432/postgres
PORT=5000
NODE_ENV=development
```

Replace `[YOUR_PASSWORD]` with your actual Supabase database password.

## File Descriptions

### Database Schema (`database/schema.sql`)
Contains all table definitions, constraints, indexes, and default data (vehicles).

### Database Seed (`database/seed.sql`)
Contains sample data for testing (inventory items, livestock).

### Database Initialization (`database/init.js`)
Script to initialize the database by running schema and seed files.

### Database Configuration (`config/db.js`)
PostgreSQL connection pool configuration and query helpers.

### Route Files
Each route file handles CRUD operations for its respective resource:
- Cases: Funeral case management
- Dashboard: Aggregate data and statistics
- Vehicles: Vehicle fleet management
- Inventory: Stock management and reservations
- Roster: Driver and vehicle assignments
- Livestock: Cow management and assignments
- Checklist: Case task tracking
- SMS: SMS logging and tracking

### Utility Files
- Validators: Input validation functions
- Helpers: Common utility functions (formatting, date calculations, etc.)

## Next Steps

1. Create `.env` file with your database credentials
2. Run `npm install` to install dependencies
3. Run `npm run init-db` to initialize database (optional, if schema not already created)
4. Run `npm run dev` to start development server
5. Test API endpoints using the API documentation

## API Endpoints Summary

- `/api/cases` - Case management
- `/api/dashboard` - Dashboard data
- `/api/vehicles` - Vehicle management
- `/api/inventory` - Inventory management
- `/api/roster` - Roster management
- `/api/livestock` - Livestock management
- `/api/checklist` - Checklist management
- `/api/sms` - SMS log management
- `/api/health` - Health check

See `API.md` for detailed API documentation.

