-- Atomic Stock Increment Function
-- Purpose: Thread-safe stock increment (for restocking, returns, etc.)
-- Returns: Success status, new quantity, and message

CREATE OR REPLACE FUNCTION increment_stock(
  item_id INT,
  amount INT DEFAULT 1,
  recorded_by_name VARCHAR DEFAULT 'system',
  reason_text TEXT DEFAULT 'Stock replenishment',
  reference_num VARCHAR DEFAULT NULL
) RETURNS TABLE(
  success BOOLEAN,
  new_quantity INT,
  message TEXT
) AS $$
DECLARE
  current_qty INT;
  previous_qty INT;
BEGIN
  -- Lock the row for update to prevent race conditions
  SELECT stock_quantity INTO previous_qty
  FROM inventory
  WHERE id = item_id
  FOR UPDATE;
  
  -- Check if item exists
  IF previous_qty IS NULL THEN
    RETURN QUERY SELECT FALSE, 0, 'Item not found';
    RETURN;
  END IF;
  
  -- Perform atomic increment
  UPDATE inventory
  SET 
    stock_quantity = stock_quantity + amount,
    updated_at = NOW()
  WHERE id = item_id
  RETURNING stock_quantity INTO current_qty;
  
  -- Log the stock movement
  INSERT INTO stock_movements (
    inventory_id,
    movement_type,
    quantity_change,
    previous_quantity,
    new_quantity,
    reason,
    recorded_by,
    reference_number,
    movement_date
  ) VALUES (
    item_id,
    'purchase',
    amount,
    previous_qty,
    current_qty,
    reason_text,
    recorded_by_name,
    reference_num,
    NOW()
  );
  
  RETURN QUERY SELECT TRUE, current_qty, 'Stock incremented successfully';
END;
$$ LANGUAGE plpgsql;

-- Usage example:
-- SELECT * FROM increment_stock(1, 10, 'admin@example.com', 'PO delivery', 'PO-2026-001');

-- To drop this function:
-- DROP FUNCTION IF EXISTS increment_stock(INT, INT, VARCHAR, TEXT, VARCHAR);
