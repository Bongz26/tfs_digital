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
    status VARCHAR(20) DEFAULT 'intake', -- intake, confirmed, in_progress, completed
    intake_day DATE CHECK (EXTRACT(DOW FROM intake_day) = 3), -- Wednesday = 3
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 2. Vehicles (6 Total)
CREATE TABLE IF NOT EXISTS vehicles (
    id SERIAL PRIMARY KEY,
    reg_number VARCHAR(12) UNIQUE NOT NULL,
    type VARCHAR(20) CHECK (type IN ('hearse', 'family_car', 'bus', 'backup')),
    driver_name VARCHAR(100),
    driver_contact VARCHAR(15),
    available BOOLEAN DEFAULT TRUE,
    current_location VARCHAR(100),
    last_service DATE
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
    unit_price DECIMAL(10,2)
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

-- Insert default vehicles
INSERT INTO vehicles (reg_number, type, driver_name) VALUES
('HVR 607 FS', 'hearse', 'Sipho'),
('TSF 145 FS', 'family_car', 'Thabo'),
('THS 001 FS', 'hearse', 'Moses'),
('THS 002 FS', 'family_car', 'Anna'),
('THS 003 FS', 'bus', 'Jacob'),
('THS 004 FS', 'backup', 'Peter')
ON CONFLICT (reg_number) DO NOTHING;

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

