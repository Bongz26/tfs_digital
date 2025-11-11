# TFS Digital Server

Express.js backend server for Thusanang Funeral Services digital system.

## Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment
Create a `.env` file in the server directory:
```env
DATABASE_URL=postgresql://postgres:[YOUR_PASSWORD]@db.uucjdcbtpunfsyuixsmc.supabase.co:5432/postgres
PORT=5000
NODE_ENV=development
```

**Replace `[YOUR_PASSWORD]` with your actual Supabase database password.**

### 3. Run the Server

**Development mode (with auto-reload):**
```bash
npm run dev
```

**Production mode:**
```bash
npm start
```

## API Endpoints

### Cases
- `GET /api/cases` - Get all cases
- `GET /api/cases/:id` - Get single case
- `POST /api/cases` - Create new case
- `PUT /api/cases/:id` - Update case
- `DELETE /api/cases/:id` - Delete case

### Dashboard
- `GET /api/dashboard` - Get dashboard statistics

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

## Database

The server connects to a PostgreSQL database hosted on Supabase. Make sure all tables are created using the provided SQL schema.

## Project Structure

```
server/
├── config/
│   └── db.js          # Database connection configuration
├── routes/
│   ├── cases.js       # Case management routes
│   ├── dashboard.js   # Dashboard data routes
│   ├── vehicles.js    # Vehicle management routes
│   └── inventory.js   # Inventory management routes
├── index.js           # Server entry point
├── package.json       # Dependencies
└── .env               # Environment variables (create this)
```

## Troubleshooting

See `SETUP.md` for detailed setup instructions and troubleshooting guide.

