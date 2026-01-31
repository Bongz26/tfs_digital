# Database Architecture Fixes - README

## Overview

This directory contains SQL migrations and database functions that fix critical architecture issues in the TFS Digital system.

## Files

### Migrations
- **`migrations/001_add_database_constraints.sql`** - Adds foreign keys, check constraints, and unique constraints

### Functions
- **`functions/decrement_stock.sql`** - Atomic stock decrement with race condition protection
- **`functions/increment_stock.sql`** - Atomic stock increment for restocking
- **`functions/create_case_atomic.sql`** - Atomic case creation (not yet fully implemented in code)

### Scripts
- **`apply-migrations.js`** - Node.js script to apply all migrations and functions

## How to Apply Migrations

### Prerequisites
1. Ensure `.env` file has correct `DATABASE_URL`
2. Backup your database before applying migrations

### Apply All Migrations

```bash
cd server/database
node apply-migrations.js
```

This will:
- Create/update database functions
- Add constraints to existing tables
- Show progress and any errors

### Expected Output

```
🚀 Database Migration Runner
════════════════════════════════════════════════════════════
📍 Database: db.uucjdcbtpunfsyuixsmc.supabase.co:5432
⏰ Started: 2026-01-31T09:00:00.000Z
✅ Database connection successful

📄 Executing: decrement_stock.sql
────────────────────────────────────────────────────────────
✅ SUCCESS: decrement_stock.sql applied

📄 Executing: increment_stock.sql
────────────────────────────────────────────────────────────
✅ SUCCESS: increment_stock.sql applied

... (more files) ...

════════════════════════════════════════════════════════════
📊 Migration Summary
────────────────────────────────────────────────────────────
✅ Successful: 4
❌ Failed: 0
⏰ Completed: 2026-01-31T09:01:30.000Z

✨ All migrations completed successfully!
```

## What Changed

### Before
- Stock updates had race conditions (two users could decrement same item simultaneously)
- No database constraints (orphaned records, invalid statuses allowed)
- Multi-step operations could fail partially (inconsistent data)

### After
- ✅ **Atomic operations** - Stock changes use row-level locking
- ✅ **Foreign keys** - Can't create orphaned roster/stock_movements
- ✅ **Check constraints** - Only valid status values allowed
- ✅ **Unique constraints** - No duplicate case numbers or vehicle registrations

## Testing

### Test Atomic Stock Decrement

```javascript
// In Node.js console or test file
const { decrementStock } = require('./utils/dbUtils');

// Decrement stock
const result = await decrementStock(
  1, // inventory item ID
  1, // amount
  'test@example.com', // user
  'Testing'
);

console.log(result);
// { success: true, newQuantity: 49, message: 'Stock decremented successfully' }
```

### Test Concurrent Updates

```bash
# Run concurrent stock decrement test
node database/test-concurrent-stock.js
```

## Rollback Instructions

If you need to rollback these changes:

```sql
-- Drop functions
DROP FUNCTION IF EXISTS decrement_stock(INT, INT, VARCHAR, TEXT);
DROP FUNCTION IF EXISTS increment_stock(INT, INT, VARCHAR, TEXT, VARCHAR);
DROP FUNCTION IF EXISTS create_case_atomic(JSONB, INT, VARCHAR, VARCHAR, UUID);

-- Remove constraints (example)
ALTER TABLE cases DROP CONSTRAINT IF EXISTS check_cases_status;
ALTER TABLE cases DROP CONSTRAINT IF EXISTS unique_case_number;
ALTER TABLE roster DROP CONSTRAINT IF EXISTS fk_roster_case;

-- See migrations/001_add_database_constraints.sql for full list
```

## Troubleshooting

### "Constraint already exists"
This is normal if re-running migrations. The script will skip existing constraints.

### "Foreign key violation"
You may have orphaned records. Clean them before applying migrations:

```sql
-- Find orphaned roster entries
SELECT r.* FROM roster r
LEFT JOIN cases c ON r.case_id = c.id
WHERE c.id IS NULL;

-- Delete orphans (BE CAREFUL!)
DELETE FROM roster WHERE case_id NOT IN (SELECT id FROM cases);
```

### "Check constraint violated"
You have invalid status values. Fix them first:

```sql
-- Find invalid statuses
SELECT DISTINCT status FROM cases 
WHERE status NOT IN ('intake', 'preparation', 'confirmed', 'in_progress', 'completed', 'archived', 'cancelled');

-- Fix (example)
UPDATE cases SET status = 'confirmed' WHERE status = 'pending';
```

## Impact on Existing Code

### ✅ No Breaking Changes
The migrations don't change the API or existing functionality. They add protections at the database level.

### ⚠️ Code Updates Required
To benefit from atomic operations, update controllers to use:

```javascript
// Old way (has race conditions)
const qty = item.stock_quantity - 1;
await supabase.from('inventory').update({ stock_quantity: qty });

// New way (atomic, safe)  
const { decrementStock } = require('../utils/dbUtils');
const result = await decrementStock(item.id, 1, user.email, 'reason');
```

## Next Steps

1. ✅ Apply migrations using `node apply-migrations.js`
2. ✅ Test in development environment
3. ⏳ Update remaining controllers to use atomic functions
4. ⏳ Run concurrent update tests
5. ⏳ Apply to production (after thorough testing)

## Questions?

See `implementation_plan.md` in the artifacts directory for full technical details.
