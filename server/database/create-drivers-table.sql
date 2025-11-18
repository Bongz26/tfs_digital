-- Create drivers table if it doesn't exist
-- Run this if the drivers table is missing

CREATE TABLE IF NOT EXISTS drivers (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    contact VARCHAR(15),
    license_number VARCHAR(20),
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Insert default drivers (only if table is empty)
INSERT INTO drivers (name, contact, license_number, active) 
SELECT * FROM (VALUES
    ('Sipho Mthembu', '0821234567', 'DL123456', true),
    ('Thabo Nkosi', '0834567890', 'DL234567', true),
    ('Moses Dlamini', '0845678901', 'DL345678', true),
    ('Anna Khumalo', '0856789012', 'DL456789', true),
    ('Jacob Mokoena', '0867890123', 'DL567890', true),
    ('Peter Sithole', '0878901234', 'DL678901', true)
) AS v(name, contact, license_number, active)
WHERE NOT EXISTS (SELECT 1 FROM drivers);

-- Verify
SELECT COUNT(*) as driver_count FROM drivers;

