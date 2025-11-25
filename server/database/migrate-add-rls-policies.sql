-- Enable Row Level Security and add policies aligned to app roles

-- Helper: ensure user_profiles exists with role column
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_profiles' AND column_name = 'role'
  ) THEN
    RAISE EXCEPTION 'user_profiles.role column missing';
  END IF;
END $$;

-- Enable RLS on core tables
ALTER TABLE cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Utility: role check via user_profiles
-- admin > manager > staff > driver
CREATE OR REPLACE FUNCTION app_has_min_role(required_role text)
RETURNS boolean LANGUAGE sql AS $$
  WITH levels AS (
    SELECT * FROM (VALUES ('driver',1),('staff',2),('manager',3),('admin',4)) AS r(role, level)
  ),
  me AS (
    SELECT COALESCE(up.role, 'staff') AS role
    FROM user_profiles up
    WHERE up.user_id = auth.uid()
  )
  SELECT COALESCE(m.level,0) >= COALESCE(r.level,0)
  FROM me
  LEFT JOIN levels m ON m.role = me.role
  LEFT JOIN levels r ON r.role = required_role;
$$;

-- Cases policies
DROP POLICY IF EXISTS cases_select_policy ON cases;
CREATE POLICY cases_select_policy ON cases
FOR SELECT USING ( app_has_min_role('staff') );

DROP POLICY IF EXISTS cases_insert_policy ON cases;
CREATE POLICY cases_insert_policy ON cases
FOR INSERT WITH CHECK ( app_has_min_role('staff') );

DROP POLICY IF EXISTS cases_update_policy ON cases;
CREATE POLICY cases_update_policy ON cases
FOR UPDATE USING ( app_has_min_role('manager') ) WITH CHECK ( app_has_min_role('manager') );

-- Inventory policies
DROP POLICY IF EXISTS inventory_select_policy ON inventory;
CREATE POLICY inventory_select_policy ON inventory
FOR SELECT USING ( app_has_min_role('staff') );

DROP POLICY IF EXISTS inventory_insert_policy ON inventory;
CREATE POLICY inventory_insert_policy ON inventory
FOR INSERT WITH CHECK ( app_has_min_role('manager') );

DROP POLICY IF EXISTS inventory_update_policy ON inventory;
CREATE POLICY inventory_update_policy ON inventory
FOR UPDATE USING ( app_has_min_role('manager') ) WITH CHECK ( app_has_min_role('manager') );

-- Purchase orders policies
DROP POLICY IF EXISTS po_select_policy ON purchase_orders;
CREATE POLICY po_select_policy ON purchase_orders
FOR SELECT USING ( app_has_min_role('staff') );

DROP POLICY IF EXISTS po_insert_policy ON purchase_orders;
CREATE POLICY po_insert_policy ON purchase_orders
FOR INSERT WITH CHECK ( app_has_min_role('manager') );

DROP POLICY IF EXISTS po_update_policy ON purchase_orders;
CREATE POLICY po_update_policy ON purchase_orders
FOR UPDATE USING ( app_has_min_role('manager') ) WITH CHECK ( app_has_min_role('manager') );

-- PO items policies
DROP POLICY IF EXISTS poi_select_policy ON purchase_order_items;
CREATE POLICY poi_select_policy ON purchase_order_items
FOR SELECT USING ( app_has_min_role('staff') );

DROP POLICY IF EXISTS poi_insert_policy ON purchase_order_items;
CREATE POLICY poi_insert_policy ON purchase_order_items
FOR INSERT WITH CHECK ( app_has_min_role('manager') );

-- Stock movements
DROP POLICY IF EXISTS sm_select_policy ON stock_movements;
CREATE POLICY sm_select_policy ON stock_movements
FOR SELECT USING ( app_has_min_role('staff') );

DROP POLICY IF EXISTS sm_insert_policy ON stock_movements;
CREATE POLICY sm_insert_policy ON stock_movements
FOR INSERT WITH CHECK ( app_has_min_role('manager') );

-- User profiles
DROP POLICY IF EXISTS up_select_self ON user_profiles;
CREATE POLICY up_select_self ON user_profiles
FOR SELECT USING (
  user_id = auth.uid() OR app_has_min_role('admin')
);

DROP POLICY IF EXISTS up_update_admin ON user_profiles;
CREATE POLICY up_update_admin ON user_profiles
FOR UPDATE USING ( app_has_min_role('admin') ) WITH CHECK ( app_has_min_role('admin') );

-- Notes:
-- 1) Run this in Supabase SQL editor or via `npm run init-db` after adding to schema pipeline.
-- 2) Ensure auth.uid() is available (use PostgREST and Supabase auth).
-- 3) Adjust policies if additional roles are introduced.
