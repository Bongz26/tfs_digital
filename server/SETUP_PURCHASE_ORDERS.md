# Purchase Orders Setup Guide

## Quick Setup Steps

### 1. Database Setup

Run the database initialization to create all required tables:

```bash
cd server
npm run init-db
```

Or manually run the SQL in `server/database/schema.sql` in your Supabase SQL Editor.

**Required Tables:**
- `suppliers` - Must have at least one supplier
- `purchase_orders` - Main purchase order table
- `purchase_order_items` - Items in each purchase order
- `stock_movements` - For tracking inventory changes
- `inventory` - Must have `created_at` and `updated_at` columns

### 2. Add Sample Suppliers

If you don't have suppliers yet, run:

```bash
cd server
npm run insert-test-data
```

Or manually insert a supplier in Supabase:

```sql
INSERT INTO suppliers (name, contact_person, phone) 
VALUES ('Test Supplier', 'John Doe', '1234567890')
ON CONFLICT (name) DO NOTHING;
```

### 3. Start the Server

```bash
cd server
npm start
```

The server should start on port 5000 and show:
```
🚀 Server running on port 5000
📍 API endpoints: http://localhost:5000/api
🧪 Test endpoint: http://localhost:5000/api/purchase-orders/test
🏥 Health check: http://localhost:5000/api/health
```

### 4. Start the Frontend

In a separate terminal:

```bash
cd client
npm start
```

The frontend should start on port 3001 and automatically use `http://localhost:5000` for API calls.

### 5. Test the Setup

1. Open `http://localhost:3001/purchase` in your browser
2. Check the browser console - you should see:
   - `🔧 Using local API: http://localhost:5000`
   - `🌐 API_HOST configured as: http://localhost:5000`
3. The page should load without errors
4. Try creating a purchase order with:
   - PO Number: `PO-001`
   - Supplier ID: `1` (must exist in suppliers table)
   - Order Date: Any date

## Troubleshooting

### Error: "Table does not exist"
**Solution:** Run `npm run init-db` or manually create tables from `schema.sql`

### Error: "supplier_id does not exist"
**Solution:** Add at least one supplier to the `suppliers` table

### Error: "column updated_at does not exist"
**Solution:** Run the migration script `migrate-add-inventory-timestamps.sql` or update your inventory table

### Error: 404 from Render URL
**Solution:** The frontend should automatically use localhost. Check browser console for API_HOST logs.

### Error: CORS error
**Solution:** Make sure the server is running and CORS is configured (already done in `index.js`)

## API Endpoints

- `GET /api/purchase-orders` - Get all purchase orders
- `POST /api/purchase-orders` - Create a new purchase order
- `POST /api/purchase-orders/:poId/items` - Add item to purchase order
- `POST /api/purchase-orders/:poId/receive` - Receive GRV (Goods Received Voucher)
- `GET /api/purchase-orders/test` - Test endpoint

## Environment Variables

Make sure your `server/.env` file has:

```env
DATABASE_URL=postgresql://postgres:password@host:5432/postgres
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_anon_key
# OR
SUPABASE_KEY=your_key
PORT=5000
```

