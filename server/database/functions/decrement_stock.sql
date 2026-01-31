-- Atomic Stock Decrement Function
-- Purpose: Thread-safe stock decrement with validation
-- Returns: Success status, new quantity, and message

CREATE OR REPLACE FUNCTION decrement_stock(
  item_id INT,
  amount INT DEFAULT 1,
  recorded_by_name VARCHAR DEFAULT 'system',
  reason_text TEXT DEFAULT 'Stock usage'
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
  
  -- Perform atomic decrement
  UPDATE inventory
  SET 
    stock_quantity = stock_quantity - amount,
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
    movement_date
  ) VALUES (
    item_id,
    'sale',
    -amount,
    previous_qty,
    current_qty,
    reason_text,
    recorded_by_name,
    NOW()
  );
  
  -- Return result with warning if stock is negative
  IF current_qty < 0 THEN
    RETURN QUERY SELECT TRUE, current_qty, 'WARNING: Stock is now negative (' || current_qty || ')';
  ELSIF current_qty <= (SELECT low_stock_threshold FROM inventory WHERE id = item_id) THEN
    RETURN QUERY SELECT TRUE, current_qty, 'WARNING: Stock is at or below threshold (' || current_qty || ')';
  ELSE
    RETURN QUERY SELECT TRUE, current_qty, 'Stock decremented successfully';
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Usage example:
-- SELECT * FROM decrement_stock(1, 1, 'john@example.com', 'Case #THS-2026-001');

-- To drop this function:
-- DROP FUNCTION IF EXISTS decrement_stock(INT, INT, VARCHAR, TEXT);
