-- THUSANANG FUNERAL SYSTEM - DATABASE SCHEMA
-- Generated: 10 Nov 2025 | QwaQwa, Free State

-- 1. Clients & Cases
CREATE TABLE IF NOT EXISTS cases (
    id SERIAL PRIMARY KEY,
    case_number VARCHAR(15) UNIQUE NOT NULL, -- THS-2025-001
    deceased_name VARCHAR(100) NOT NULL,
    deceased_id VARCHAR(13),
    nok_name VARCHAR(100) NOT NULL,
    nok_contact VARCHAR(15) NOT NULL,
    nok_relation VARCHAR(50),
    plan_category VARCHAR(20) CHECK (plan_category IN ('motjha', 'single', 'family', 'colour_grade')),
    plan_name VARCHAR(20),
    plan_members INT,
    plan_age_bracket VARCHAR(20),
    funeral_date DATE NOT NULL,
    funeral_time TIME,
    venue_name VARCHAR(100),
    venue_address TEXT,
    venue_lat DECIMAL(10, 8),
    venue_lng DECIMAL(11, 8),
    requires_cow BOOLEAN DEFAULT FALSE,
    requires_tombstone BOOLEAN DEFAULT FALSE,
    status VARCHAR(20) DEFAULT 'intake', -- intake, confirmed, preparation, scheduled, in_progress, completed, archived, cancelled
    intake_day DATE CHECK (EXTRACT(DOW FROM intake_day) = 3), -- Wednesday = 3
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 2. Vehicles
CREATE TABLE IF NOT EXISTS vehicles (
    id SERIAL PRIMARY KEY,
    reg_number VARCHAR(12) UNIQUE NOT NULL,
    type VARCHAR(20) CHECK (type IN ('fortuner', 'vito', 'v_class', 'truck', 'q7', 'hilux')),
    available BOOLEAN DEFAULT TRUE,
    current_location VARCHAR(100),
    last_service DATE
    -- Note: driver_name and driver_contact removed - drivers are assigned per case, not per vehicle
);

-- 2a. Drivers
CREATE TABLE IF NOT EXISTS drivers (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    contact VARCHAR(15),
    license_number VARCHAR(20),
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 3. Inventory Items
CREATE TABLE IF NOT EXISTS inventory (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    category VARCHAR(30) CHECK (category IN ('coffin', 'tent', 'chair', 'catering', 'grocery', 'tombstone', 'livestock', 'other')),
    stock_quantity INT DEFAULT 0,
    reserved_quantity INT DEFAULT 0,
    location VARCHAR(50) DEFAULT 'Manekeng',
    low_stock_threshold INT DEFAULT 2,
    unit_price DECIMAL(10,2),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 4. Reservations (Stock Lock)
CREATE TABLE IF NOT EXISTS reservations (
    id SERIAL PRIMARY KEY,
    case_id INT REFERENCES cases(id) ON DELETE CASCADE,
    inventory_id INT REFERENCES inventory(id),
    quantity INT NOT NULL,
    reserved_at TIMESTAMP DEFAULT NOW(),
    released_at TIMESTAMP
);

-- 5. Livestock (Cows)
CREATE TABLE IF NOT EXISTS livestock (
    id SERIAL PRIMARY KEY,
    tag_id VARCHAR(10) UNIQUE NOT NULL, -- COW-001
    status VARCHAR(20) DEFAULT 'available', -- available, assigned, slaughtered
    assigned_case_id INT REFERENCES cases(id),
    breed VARCHAR(50) DEFAULT 'Cow (Generic)',
    location VARCHAR(50) DEFAULT 'Manekeng Farm'
);

-- 6. Driver Roster
CREATE TABLE IF NOT EXISTS roster (
    id SERIAL PRIMARY KEY,
    case_id INT REFERENCES cases(id),
    vehicle_id INT REFERENCES vehicles(id),
    driver_name VARCHAR(100),
    pickup_time TIMESTAMP,
    route_json TEXT, -- Google Directions API response
    status VARCHAR(20) DEFAULT 'scheduled', -- scheduled, en_route, completed
    sms_sent BOOLEAN DEFAULT FALSE
);

-- 7. Checklist Progress
CREATE TABLE IF NOT EXISTS checklist (
    id SERIAL PRIMARY KEY,
    case_id INT REFERENCES cases(id),
    task VARCHAR(100),
    completed BOOLEAN DEFAULT FALSE,
    completed_at TIMESTAMP,
    completed_by VARCHAR(100)
);

-- 8. SMS Log
CREATE TABLE IF NOT EXISTS sms_log (
    id SERIAL PRIMARY KEY,
    case_id INT REFERENCES cases(id),
    phone VARCHAR(15),
    message TEXT,
    sent_at TIMESTAMP,
    status VARCHAR(20)
);

-- Insert default vehicles (no driver assignment - drivers assigned per case)
INSERT INTO vehicles (reg_number, type) VALUES
('HVR 607 FS', 'fortuner'),
('TSF 145 FS', 'vito'),
('THS 001 FS', 'v_class'),
('THS 002 FS', 'truck'),
('THS 003 FS', 'q7'),
('THS 004 FS', 'hilux')
ON CONFLICT (reg_number) DO NOTHING;

-- Insert default drivers
INSERT INTO drivers (name, contact, license_number, active) VALUES
('Sipho Mthembu', '0821234567', 'DL123456', true),
('Thabo Nkosi', '0834567890', 'DL234567', true),
('Moses Dlamini', '0845678901', 'DL345678', true),
('Anna Khumalo', '0856789012', 'DL456789', true),
('Jacob Mokoena', '0867890123', 'DL567890', true),
('Peter Sithole', '0878901234', 'DL678901', true)
ON CONFLICT DO NOTHING;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_cases_funeral_date ON cases(funeral_date);
CREATE INDEX IF NOT EXISTS idx_cases_status ON cases(status);
CREATE INDEX IF NOT EXISTS idx_cases_case_number ON cases(case_number);
CREATE INDEX IF NOT EXISTS idx_vehicles_available ON vehicles(available);
CREATE INDEX IF NOT EXISTS idx_reservations_case_id ON reservations(case_id);
CREATE INDEX IF NOT EXISTS idx_reservations_inventory_id ON reservations(inventory_id);
CREATE INDEX IF NOT EXISTS idx_roster_case_id ON roster(case_id);
CREATE INDEX IF NOT EXISTS idx_roster_vehicle_id ON roster(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_checklist_case_id ON checklist(case_id);

-- 9. Suppliers
CREATE TABLE IF NOT EXISTS suppliers (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    contact_person VARCHAR(100),
    phone VARCHAR(20),
    email VARCHAR(120),
    address TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 10. Purchase Orders
CREATE TABLE IF NOT EXISTS purchase_orders (
    id SERIAL PRIMARY KEY,
    po_number VARCHAR(50) UNIQUE NOT NULL,
    supplier_id INT NOT NULL REFERENCES suppliers(id),
    order_date DATE NOT NULL,
    expected_delivery DATE,
    status VARCHAR(20) DEFAULT 'draft',
    created_by VARCHAR(100),
    total_amount DECIMAL(12,2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 11. Purchase Order Items
CREATE TABLE IF NOT EXISTS purchase_order_items (
    id SERIAL PRIMARY KEY,
    po_id INT NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
    inventory_id INT REFERENCES inventory(id),
    quantity_ordered INT NOT NULL,
    received_quantity INT DEFAULT 0,
    unit_cost DECIMAL(12,2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 12. Stock Movements (for tracking inventory changes)
CREATE TABLE IF NOT EXISTS stock_movements (
    id SERIAL PRIMARY KEY,
    inventory_id INT NOT NULL REFERENCES inventory(id),
    movement_type VARCHAR(20) NOT NULL, -- 'purchase', 'sale', 'adjustment', 'return'
    quantity_change INT NOT NULL,
    previous_quantity INT NOT NULL,
    new_quantity INT NOT NULL,
    reason VARCHAR(200),
    recorded_by VARCHAR(100),
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_po_supplier_id ON purchase_orders(supplier_id);
CREATE INDEX IF NOT EXISTS idx_po_order_date ON purchase_orders(order_date);
CREATE INDEX IF NOT EXISTS idx_poi_po_id ON purchase_order_items(po_id);
CREATE INDEX IF NOT EXISTS idx_poi_inventory_id ON purchase_order_items(inventory_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_inventory_id ON stock_movements(inventory_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_created_at ON stock_movements(created_at);

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

CREATE INDEX IF NOT EXISTS idx_stock_takes_status ON stock_takes(status);
CREATE INDEX IF NOT EXISTS idx_stock_takes_created_at ON stock_takes(created_at);
CREATE INDEX IF NOT EXISTS idx_stock_take_items_stock_take_id ON stock_take_items(stock_take_id);
CREATE INDEX IF NOT EXISTS idx_stock_take_items_inventory_id ON stock_take_items(inventory_id);

