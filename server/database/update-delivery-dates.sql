-- Update delivery date and time for specific cases
-- Date: 14 November 2025
-- Time: Between 12:00 PM and 16:00 (4:00 PM)

-- Case ID 1
UPDATE cases 
SET delivery_date = '2025-11-14', 
    delivery_time = '12:00:00'
WHERE id = 1;

-- Case ID 2
UPDATE cases 
SET delivery_date = '2025-11-14', 
    delivery_time = '12:30:00'
WHERE id = 2;

-- Case ID 3
UPDATE cases 
SET delivery_date = '2025-11-14', 
    delivery_time = '13:00:00'
WHERE id = 3;

-- Case ID 4
UPDATE cases 
SET delivery_date = '2025-11-14', 
    delivery_time = '13:30:00'
WHERE id = 4;

-- Case ID 5
UPDATE cases 
SET delivery_date = '2025-11-14', 
    delivery_time = '14:00:00'
WHERE id = 5;

-- Case ID 6
UPDATE cases 
SET delivery_date = '2025-11-14', 
    delivery_time = '14:30:00'
WHERE id = 6;

-- Case ID 7
UPDATE cases 
SET delivery_date = '2025-11-14', 
    delivery_time = '15:00:00'
WHERE id = 7;

-- Case ID 8
UPDATE cases 
SET delivery_date = '2025-11-14', 
    delivery_time = '15:30:00'
WHERE id = 8;

-- Case ID 9
UPDATE cases 
SET delivery_date = '2025-11-14', 
    delivery_time = '16:00:00'
WHERE id = 9;

-- Case ID 10
UPDATE cases 
SET delivery_date = '2025-11-14', 
    delivery_time = '12:15:00'
WHERE id = 10;

-- Case ID 11
UPDATE cases 
SET delivery_date = '2025-11-14', 
    delivery_time = '13:45:00'
WHERE id = 11;

-- Case ID 12
UPDATE cases 
SET delivery_date = '2025-11-14', 
    delivery_time = '15:15:00'
WHERE id = 12;

-- Verify the updates
SELECT 
    id,
    case_number,
    deceased_name,
    delivery_date,
    delivery_time,
    funeral_date,
    funeral_time
FROM cases
WHERE id IN (1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12)
ORDER BY id;

