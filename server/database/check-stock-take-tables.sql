-- Check if stock take tables exist and their structure
-- Run this to see what columns exist

-- Check if stock_takes table exists
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name IN ('stock_takes', 'stock_take_items')
ORDER BY table_name, ordinal_position;

-- Check table constraints
SELECT 
    tc.table_name,
    tc.constraint_name,
    tc.constraint_type,
    kcu.column_name
FROM information_schema.table_constraints tc
LEFT JOIN information_schema.key_column_usage kcu 
    ON tc.constraint_name = kcu.constraint_name
WHERE tc.table_schema = 'public' 
  AND tc.table_name IN ('stock_takes', 'stock_take_items')
ORDER BY tc.table_name, tc.constraint_type;

