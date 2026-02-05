-- Migration: Add Stock Take tables
-- Run this to add stock_takes and stock_take_items tables

-- 13. Stock Takes
CREATE TABLE IF NOT EXISTS stock_takes (
    id SERIAL PRIMARY KEY,
    taken_by VARCHAR(100) NOT NULL,
    status VARCHAR(20) DEFAULT 'in_progress', -- 'in_progress', 'completed', 'cancelled'
    created_at TIMESTAMP DEFAULT NOW(),
    completed_at TIMESTAMP
);

-- 14. Stock Take Items
CREATE TABLE IF NOT EXISTS stock_take_items (
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

