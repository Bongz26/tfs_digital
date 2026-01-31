-- Atomic Case Creation Function
-- Purpose: Create a case with all related records in a single transaction
-- Returns: Complete case data with warnings

CREATE OR REPLACE FUNCTION create_case_atomic(
  case_data JSONB,
  inventory_item_id INT DEFAULT NULL,
  draft_policy_number VARCHAR DEFAULT NULL,
  user_email VARCHAR DEFAULT 'system',
  user_id_val UUID DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
  new_case_id INT;
  result JSONB;
  stock_result RECORD;
  stock_warning TEXT := NULL;
BEGIN
  -- 1. Insert the case
  INSERT INTO cases (
    case_number, deceased_name, deceased_id, nok_name, nok_contact, nok_relation,
    plan_category, plan_name, plan_members, plan_age_bracket,
    funeral_date, funeral_time, service_date, service_time,
    church_date, church_time, cleansing_date, cleansing_time,
    venue_name, venue_address, venue_lat, venue_lng,
    requires_cow, requires_sheep, requires_tombstone, requires_catering, requires_grocery, requires_bus,
    service_type, total_price, casket_type, casket_colour,
    delivery_date, delivery_time, intake_day,
    programs, top_up_amount, top_up_type, top_up_reference,
    airtime, airtime_network, airtime_number,
    cover_amount, cashback_amount, amount_to_bank,
    legacy_plan_name, benefit_mode, burial_place, branch,
    tombstone_type, collection_type, collection_note, is_yard_burial,
    claim_date, policy_number, status,
    created_by_user_id, created_at
  )
  SELECT
    (case_data->>'case_number')::VARCHAR,
    (case_data->>'deceased_name')::VARCHAR,
    (case_data->>'deceased_id')::VARCHAR,
    (case_data->>'nok_name')::VARCHAR,
    (case_data->>'nok_contact')::VARCHAR,
    (case_data->>'nok_relation')::VARCHAR,
    (case_data->>'plan_category')::VARCHAR,
    (case_data->>'plan_name')::VARCHAR,
    (case_data->>'plan_members')::INT,
    (case_data->>'plan_age_bracket')::VARCHAR,
    (case_data->>'funeral_date')::DATE,
    (case_data->>'funeral_time')::TIME,
    (case_data->>'service_date')::DATE,
    (case_data->>'service_time')::TIME,
    (case_data->>'church_date')::DATE,
    (case_data->>'church_time')::TIME,
    (case_data->>'cleansing_date')::DATE,
    (case_data->>'cleansing_time')::TIME,
    (case_data->>'venue_name')::VARCHAR,
    (case_data->>'venue_address')::TEXT,
    (case_data->>'venue_lat')::NUMERIC,
    (case_data->>'venue_lng')::NUMERIC,
    (case_data->>'requires_cow')::BOOLEAN,
    (case_data->>'requires_sheep')::BOOLEAN,
    (case_data->>'requires_tombstone')::BOOLEAN,
    (case_data->>'requires_catering')::BOOLEAN,
    (case_data->>'requires_grocery')::BOOLEAN,
    (case_data->>'requires_bus')::BOOLEAN,
    (case_data->>'service_type')::VARCHAR,
    (case_data->>'total_price')::NUMERIC,
    (case_data->>'casket_type')::VARCHAR,
    (case_data->>'casket_colour')::VARCHAR,
    (case_data->>'delivery_date')::DATE,
    (case_data->>'delivery_time')::TIME,
    (case_data->>'intake_day')::DATE,
    (case_data->>'programs')::INT,
    (case_data->>'top_up_amount')::NUMERIC,
    (case_data->>'top_up_type')::VARCHAR,
    (case_data->>'top_up_reference')::VARCHAR,
    (case_data->>'airtime')::BOOLEAN,
    (case_data->>'airtime_network')::VARCHAR,
    (case_data->>'airtime_number')::VARCHAR,
    (case_data->>'cover_amount')::NUMERIC,
    (case_data->>'cashback_amount')::NUMERIC,
    (case_data->>'amount_to_bank')::NUMERIC,
    (case_data->>'legacy_plan_name')::VARCHAR,
    (case_data->>'benefit_mode')::VARCHAR,
    (case_data->>'burial_place')::VARCHAR,
    COALESCE((case_data->>'branch')::VARCHAR, 'Head Office'),
    (case_data->>'tombstone_type')::VARCHAR,
    COALESCE((case_data->>'collection_type')::VARCHAR, 'vehicle'),
    (case_data->>'collection_note')::VARCHAR,
    (case_data->>'is_yard_burial')::BOOLEAN,
    (case_data->>'claim_date')::DATE,
    (case_data->>'policy_number')::VARCHAR,
    COALESCE((case_data->>'status')::VARCHAR, 'confirmed'),
    user_id_val,
    NOW()
  RETURNING id INTO new_case_id;

  -- 2. Decrement inventory if provided
  IF inventory_item_id IS NOT NULL THEN
    SELECT * INTO stock_result
    FROM decrement_stock(
      inventory_item_id,
      1,
      user_email,
      'Case consumption: ' || (case_data->>'case_number')
    );
    
    IF NOT stock_result.success THEN
      RAISE EXCEPTION 'Stock decrement failed: %', stock_result.message;
    END IF;
    
    -- Store warning if stock is low/negative
    IF stock_result.message LIKE 'WARNING%' THEN
      stock_warning := stock_result.message;
    END IF;
    
    -- Update the stock movement with case_id
    UPDATE stock_movements
    SET case_id = new_case_id
    WHERE id = (
      SELECT id FROM stock_movements
      WHERE inventory_id = inventory_item_id
        AND case_id IS NULL
        AND movement_date >= NOW() - INTERVAL '1 second'
      ORDER BY movement_date DESC
      LIMIT 1
    );
  END IF;

  -- 3. Delete draft if policy number provided
  IF draft_policy_number IS NOT NULL THEN
    DELETE FROM claim_drafts 
    WHERE policy_number = draft_policy_number;
  END IF;

  -- 4. Create audit log entry
  INSERT INTO audit_log (
    user_id,
    user_email,
    action,
    resource_type,
    resource_id,
    new_values,
    created_at
  ) VALUES (
    user_id_val,
    user_email,
    'case_create',
    'case',
    new_case_id,
    case_data,
    NOW()
  );

  -- 5. Return the created case with warning if applicable
  SELECT jsonb_build_object(
    'id', c.id,
    'case_number', c.case_number,
    'deceased_name', c.deceased_name,
    'status', c.status,
    'created_at', c.created_at,
    'stock_warning', COALESCE(stock_warning, NULL)
  ) INTO result
  FROM cases c
  WHERE c.id = new_case_id;

  RETURN result;
  
EXCEPTION
  WHEN OTHERS THEN
    -- Rollback happens automatically
    RAISE EXCEPTION 'Case creation failed: %', SQLERRM;
END;
$$ LANGUAGE plpgsql;

-- To drop this function:
-- DROP FUNCTION IF EXISTS create_case_atomic(JSONB, INT, VARCHAR, VARCHAR, UUID);
