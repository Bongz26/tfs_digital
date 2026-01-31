-- Complete Data Cleanup for All Constraints
-- Run this entire script BEFORE applying 001_add_database_constraints.sql

-- ========================================
-- 1. FIX CASE STATUSES
-- ========================================

-- See what invalid case statuses exist
SELECT 'Invalid Case Statuses:' as info;
SELECT DISTINCT status, COUNT(*) as count
FROM cases 
WHERE status NOT IN ('intake', 'preparation', 'scheduled', 'confirmed', 'in_progress', 'completed', 'archived', 'cancelled')
   OR status IS NULL
GROUP BY status;

-- Fix them
UPDATE cases SET status = 'completed' WHERE status = 'scheduled';
UPDATE cases SET status = 'confirmed' WHERE status IS NULL;
UPDATE cases SET status = LOWER(status) WHERE status IS NOT NULL;
UPDATE cases SET status = 'confirmed'
WHERE status NOT IN ('intake', 'preparation', 'scheduled', 'confirmed', 'in_progress', 'completed', 'archived', 'cancelled');

-- ========================================
-- 2. FIX PURCHASE ORDER STATUSES
-- ========================================

-- See what invalid PO statuses exist
SELECT 'Invalid PO Statuses:' as info;
SELECT DISTINCT status, COUNT(*) as count
FROM purchase_orders 
WHERE status NOT IN ('pending', 'approved', 'ordered', 'received', 'cancelled')
   OR status IS NULL
GROUP BY status;

-- Fix them
UPDATE purchase_orders SET status = 'pending' WHERE status IS NULL;
UPDATE purchase_orders SET status = LOWER(status) WHERE status IS NOT NULL;
UPDATE purchase_orders SET status = 'received' WHERE status IN ('delivered', 'complete', 'completed');
UPDATE purchase_orders SET status = 'cancelled' WHERE status IN ('canceled', 'void', 'rejected');
UPDATE purchase_orders SET status = 'pending'
WHERE status NOT IN ('pending', 'approved', 'ordered', 'received', 'cancelled');

-- ========================================
-- 3. FIX ROSTER STATUSES
-- ========================================

-- See what invalid roster statuses exist
SELECT 'Invalid Roster Statuses:' as info;
SELECT DISTINCT status, COUNT(*) as count
FROM roster 
WHERE status NOT IN ('scheduled', 'in_progress', 'completed', 'cancelled')
   OR status IS NULL
GROUP BY status;

-- Fix them
UPDATE roster SET status = 'completed' WHERE status IS NULL;
UPDATE roster SET status = LOWER(status) WHERE status IS NOT NULL;
UPDATE roster SET status = 'completed'
WHERE status NOT IN ('scheduled', 'in_progress', 'completed', 'cancelled');

-- ========================================
-- 4. FIX AIRTIME REQUEST STATUSES
-- ========================================

SELECT 'Invalid Airtime Statuses:' as info;
SELECT DISTINCT status, COUNT(*) as count
FROM airtime_requests 
WHERE status NOT IN ('pending', 'approved', 'sent', 'rejected')
   OR status IS NULL
GROUP BY status;

UPDATE airtime_requests SET status = 'pending' WHERE status IS NULL;
UPDATE airtime_requests SET status = LOWER(status) WHERE status IS NOT NULL;
UPDATE airtime_requests SET status = 'pending'
WHERE status NOT IN ('pending', 'approved', 'sent', 'rejected');

-- ========================================
-- 5. FIX LIVESTOCK STATUSES
-- ========================================

SELECT 'Invalid Livestock Statuses:' as info;
SELECT DISTINCT status, COUNT(*) as count
FROM livestock 
WHERE status NOT IN ('available', 'assigned', 'sold', 'deceased')
   OR status IS NULL
GROUP BY status;

UPDATE livestock SET status = 'available' WHERE status IS NULL;
UPDATE livestock SET status = LOWER(status) WHERE status IS NOT NULL;
UPDATE livestock SET status = 'available'
WHERE status NOT IN ('available', 'assigned', 'sold', 'deceased');

-- ========================================
-- 6. FIX SERVICE TYPES
-- ========================================

SELECT 'Invalid Service Types:' as info;
SELECT DISTINCT service_type, COUNT(*) as count
FROM cases 
WHERE service_type NOT IN ('book', 'cash', 'private')
   OR service_type IS NULL
GROUP BY service_type;

UPDATE cases SET service_type = 'private' WHERE service_type IS NULL;
UPDATE cases SET service_type = LOWER(service_type) WHERE service_type IS NOT NULL;
UPDATE cases SET service_type = 'private'
WHERE service_type NOT IN ('book', 'cash', 'private');

-- ========================================
-- 7. FINAL VERIFICATION
-- ========================================

SELECT '=== FINAL VERIFICATION ===' as info;

-- All should return 0 rows
SELECT 'Cases with invalid status:' as check, COUNT(*) as count
FROM cases 
WHERE status NOT IN ('intake', 'preparation', 'scheduled', 'confirmed', 'in_progress', 'completed', 'archived', 'cancelled');

SELECT 'POs with invalid status:' as check, COUNT(*) as count
FROM purchase_orders 
WHERE status NOT IN ('pending', 'approved', 'ordered', 'received', 'cancelled');

SELECT 'Roster with invalid status:' as check, COUNT(*) as count
FROM roster 
WHERE status NOT IN ('scheduled', 'in_progress', 'completed', 'cancelled');

SELECT 'Airtime with invalid status:' as check, COUNT(*) as count
FROM airtime_requests 
WHERE status NOT IN ('pending', 'approved', 'sent', 'rejected');

SELECT 'Livestock with invalid status:' as check, COUNT(*) as count
FROM livestock 
WHERE status NOT IN ('available', 'assigned', 'sold', 'deceased');

SELECT 'Cases with invalid service_type:' as check, COUNT(*) as count
FROM cases 
WHERE service_type NOT IN ('book', 'cash', 'private');

-- If all counts are 0, you're ready to apply the constraints!
