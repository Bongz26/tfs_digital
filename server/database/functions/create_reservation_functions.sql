-- Function: reserve_stock
-- Description: Increases reserved_quantity for an item. Checks availability.
CREATE OR REPLACE FUNCTION reserve_stock(item_id INT, amount INT, reason_text TEXT)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    current_stock INT;
    current_reserved INT;
    new_reserved INT;
    item_name TEXT;
BEGIN
    -- Get current state
    SELECT stock_quantity, COALESCE(reserved_quantity, 0), name 
    INTO current_stock, current_reserved, item_name
    FROM inventory WHERE id = item_id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Item not found');
    END IF;

    -- Check availability (Stock - Reserved >= Amount)
    IF (current_stock - current_reserved) < amount THEN
         RETURN jsonb_build_object('success', false, 'message', 'Insufficient available stock for reservation. Item: ' || item_name);
    END IF;

    -- Update reservation
    new_reserved := current_reserved + amount;
    
    UPDATE inventory 
    SET reserved_quantity = new_reserved,
        updated_at = NOW()
    WHERE id = item_id;

    -- Return result
    RETURN jsonb_build_object(
        'success', true, 
        'message', 'Stock reserved successfully',
        'new_reserved', new_reserved,
        'available', current_stock - new_reserved
    );
END;
$$;

-- Function: release_stock
-- Description: Decreases reserved_quantity (cancels reservation).
CREATE OR REPLACE FUNCTION release_stock(item_id INT, amount INT, reason_text TEXT)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    current_reserved INT;
    new_reserved INT;
BEGIN
    SELECT COALESCE(reserved_quantity, 0) INTO current_reserved
    FROM inventory WHERE id = item_id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Item not found');
    END IF;

    new_reserved := GREATEST(0, current_reserved - amount);

    UPDATE inventory 
    SET reserved_quantity = new_reserved,
        updated_at = NOW()
    WHERE id = item_id;

    RETURN jsonb_build_object(
        'success', true, 
        'message', 'Reservation released',
        'new_reserved', new_reserved
    );
END;
$$;

-- Function: commit_stock
-- Description: Converts reservation to actual deduction (Sold/Used).
-- Decreases BOTH stock_quantity and reserved_quantity.
-- Logs to stock_movements.
CREATE OR REPLACE FUNCTION commit_stock(item_id INT, amount INT, case_id_val INT, reason_text TEXT)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    current_stock INT;
    current_reserved INT;
    new_stock INT;
    new_reserved INT;
BEGIN
    SELECT stock_quantity, COALESCE(reserved_quantity, 0) 
    INTO current_stock, current_reserved
    FROM inventory WHERE id = item_id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Item not found');
    END IF;

    -- Calculate new values
    -- Deduct from stock
    new_stock := current_stock - amount;
    -- Deduct from reserved (ensure we don't go negative if reservation wasn't synced perfectly, though it should be)
    new_reserved := GREATEST(0, current_reserved - amount);

    UPDATE inventory 
    SET stock_quantity = new_stock,
        reserved_quantity = new_reserved,
        updated_at = NOW()
    WHERE id = item_id;

    -- Log Movement
    INSERT INTO stock_movements (inventory_id, movement_type, quantity_change, previous_quantity, new_quantity, reason, case_id, created_at)
    VALUES (item_id, 'out', -amount, current_stock, new_stock, reason_text, case_id_val, NOW());

    RETURN jsonb_build_object(
        'success', true, 
        'message', 'Stock committed and deducted',
        'new_stock', new_stock,
        'new_reserved', new_reserved
    );
END;
$$;
