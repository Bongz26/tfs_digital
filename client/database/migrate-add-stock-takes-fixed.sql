-- Migration: Add Stock Take tables (with proper error handling)
-- Run this to add stock_takes and stock_take_items tables
-- This version handles existing tables gracefully

-- Drop existing tables if they exist (CAREFUL: This will delete data!)
-- Uncomment the next two lines if you want to recreate from scratch
-- DROP TABLE IF EXISTS stock_take_items CASCADE;
-- DROP TABLE IF EXISTS stock_takes CASCADE;

-- 13. Stock Takes
CREATE TABLE IF NOT EXISTS stock_takes (
    id SERIAL PRIMARY KEY,
    taken_by VARCHAR(100) NOT NULL,
    status VARCHAR(20) DEFAULT 'in_progress', -- 'in_progress', 'completed', 'cancelled'
    created_at TIMESTAMP DEFAULT NOW(),
    completed_at TIMESTAMP
);

-- 14. Stock Take Items
-- First, drop the table if it exists with wrong structure
DROP TABLE IF EXISTS stock_take_items CASCADE;

CREATE TABLE stock_take_items (
    id SERIAL PRIMARY KEY,
    stock_take_id INT NOT NULL REFERENCES stock_takes(id) ON DELETE CASCADE,
    inventory_id INT NOT NULL REFERENCES inventory(id),
    system_quantity INT NOT NULL, -- Quantity in system when stock take started
    physical_quantity INT, -- Actual counted quantity (nullable until counted)
    difference INT, -- Calculated as physical_quantity - system_quantity
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_stock_takes_status ON stock_takes(status);
CREATE INDEX IF NOT EXISTS idx_stock_takes_created_at ON stock_takes(created_at);
CREATE INDEX IF NOT EXISTS idx_stock_take_items_stock_take_id ON stock_take_items(stock_take_id);
CREATE INDEX IF NOT EXISTS idx_stock_take_items_inventory_id ON stock_take_items(inventory_id);

