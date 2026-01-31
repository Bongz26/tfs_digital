-- Migration 001: Add Database Constraints
-- Purpose: Add foreign keys, check constraints, and unique constraints for data integrity
-- Date: 2026-01-31
-- Author: System Architecture Refactor

-- ========================================
-- FOREIGN KEY CONSTRAINTS
-- ========================================

-- Roster table foreign keys
ALTER TABLE roster 
  ADD CONSTRAINT fk_roster_case 
  FOREIGN KEY (case_id) REFERENCES cases(id) ON DELETE CASCADE;

ALTER TABLE roster 
  ADD CONSTRAINT fk_roster_vehicle 
  FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE SET NULL;

ALTER TABLE roster 
  ADD CONSTRAINT fk_roster_driver 
  FOREIGN KEY (driver_id) REFERENCES drivers(id) ON DELETE SET NULL;

-- Stock movements foreign keys
ALTER TABLE stock_movements 
  ADD CONSTRAINT fk_stock_inventory 
  FOREIGN KEY (inventory_id) REFERENCES inventory(id) ON DELETE CASCADE;

ALTER TABLE stock_movements 
  ADD CONSTRAINT fk_stock_case 
  FOREIGN KEY (case_id) REFERENCES cases(id) ON DELETE SET NULL;

-- Checklist foreign key
ALTER TABLE checklist 
  ADD CONSTRAINT fk_checklist_case 
  FOREIGN KEY (case_id) REFERENCES cases(id) ON DELETE CASCADE;

-- Livestock foreign key
ALTER TABLE livestock 
  ADD CONSTRAINT fk_livestock_case 
  FOREIGN KEY (assigned_case_id) REFERENCES cases(id) ON DELETE SET NULL;

-- Purchase order items
ALTER TABLE purchase_order_items 
  ADD CONSTRAINT fk_po_items_po 
  FOREIGN KEY (po_id) REFERENCES purchase_orders(id) ON DELETE CASCADE;

ALTER TABLE purchase_order_items 
  ADD CONSTRAINT fk_po_items_inventory 
  FOREIGN KEY (inventory_id) REFERENCES inventory(id) ON DELETE CASCADE;

-- Repatriation trips
ALTER TABLE repatriation_trips 
  ADD CONSTRAINT fk_repat_case 
  FOREIGN KEY (case_id) REFERENCES cases(id) ON DELETE CASCADE;

ALTER TABLE repatriation_trips 
  ADD CONSTRAINT fk_repat_vehicle 
  FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE SET NULL;

ALTER TABLE repatriation_trips 
  ADD CONSTRAINT fk_repat_driver 
  FOREIGN KEY (driver_id) REFERENCES drivers(id) ON DELETE SET NULL;

-- Airtime requests
ALTER TABLE airtime_requests 
  ADD CONSTRAINT fk_airtime_case 
  FOREIGN KEY (case_id) REFERENCES cases(id) ON DELETE SET NULL;

-- ========================================
-- CHECK CONSTRAINTS
-- ========================================

-- Cases status check
ALTER TABLE cases 
  ADD CONSTRAINT check_cases_status 
  CHECK (status IN ('intake', 'preparation', 'scheduled', 'confirmed', 'in_progress', 'completed', 'archived', 'cancelled'));

-- Purchase orders status check
ALTER TABLE purchase_orders 
  ADD CONSTRAINT check_po_status 
  CHECK (status IN ('pending', 'approved', 'ordered', 'received', 'cancelled'));

-- Roster status check
ALTER TABLE roster 
  ADD CONSTRAINT check_roster_status 
  CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled'));

-- Airtime requests status check
ALTER TABLE airtime_requests 
  ADD CONSTRAINT check_airtime_status 
  CHECK (status IN ('pending', 'approved', 'sent', 'rejected'));

-- Livestock status check
ALTER TABLE livestock 
  ADD CONSTRAINT check_livestock_status 
  CHECK (status IN ('available', 'assigned', 'sold', 'deceased'));

-- Service type check
ALTER TABLE cases 
  ADD CONSTRAINT check_service_type 
  CHECK (service_type IN ('book', 'cash', 'private'));

-- Stock quantity cannot be negative (soft limit, warnings allowed)
ALTER TABLE inventory 
  ADD CONSTRAINT check_stock_not_extremely_negative 
  CHECK (stock_quantity > -100);

-- ========================================
-- UNIQUE CONSTRAINTS
-- ========================================

-- Case number must be unique
ALTER TABLE cases 
  ADD CONSTRAINT unique_case_number 
  UNIQUE (case_number);

-- Vehicle registration must be unique
ALTER TABLE vehicles 
  ADD CONSTRAINT unique_vehicle_reg 
  UNIQUE (reg_number);

-- Driver names should be unique (helps prevent duplicates)
ALTER TABLE drivers 
  ADD CONSTRAINT unique_driver_name 
  UNIQUE (name);

-- Livestock tag ID must be unique
ALTER TABLE livestock 
  ADD CONSTRAINT unique_tag_id 
  UNIQUE (tag_id);

-- PO number must be unique
ALTER TABLE purchase_orders 
  ADD CONSTRAINT unique_po_number 
  UNIQUE (po_number);

-- User profile - one profile per user
ALTER TABLE user_profiles 
  ADD CONSTRAINT unique_user_id 
  UNIQUE (user_id);

-- ========================================
-- NOTES
-- ========================================
-- To rollback this migration:
-- ALTER TABLE [table_name] DROP CONSTRAINT [constraint_name];

-- Verification query:
-- SELECT conname, conrelid::regclass, contype 
-- FROM pg_constraint 
-- WHERE conname LIKE 'fk_%' OR conname LIKE 'check_%' OR conname LIKE 'unique_%'
-- ORDER BY conrelid::regclass::text, conname;
