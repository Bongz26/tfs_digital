-- Migration: Fix purchase_orders status constraint
-- This adds 'draft' as a valid status value

-- First, drop the existing constraint if it exists
ALTER TABLE purchase_orders DROP CONSTRAINT IF EXISTS purchase_orders_status_check;

-- Add the constraint with all valid status values
ALTER TABLE purchase_orders 
ADD CONSTRAINT purchase_orders_status_check 
CHECK (status IN ('draft', 'sent', 'received', 'partial', 'completed', 'cancelled'));

