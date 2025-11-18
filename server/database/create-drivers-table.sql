-- Create drivers table if it doesn't exist
-- Run this if the drivers table is missing

CREATE TABLE IF NOT EXISTS drivers (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    contact VARCHAR(15),
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Insert default drivers (only if table is empty)
INSERT INTO drivers (name, contact, active) 
SELECT * FROM (VALUES
    ('T MOFOKENG', '0821234567', true),
    ('T KHESA', '0834567890', true),
    ('S KHESA', '0834567890', true),
    ('S MOLEFE', '0845678901', true),
    ('M LEKHOABA', '0856789012', true),
    ('MOLOI', '0867890123', true),
    ('L SIBEKO', '0878901234', true),
    ('T MOTAUNG', '0878901234', true),
    ('J MOFOKENG', '0878901234', true),
    ('T NTLERU', '0834567890', true),
    ('MJ RAMPETA', '0834567890', true)
) AS v(name, contact, active)
WHERE NOT EXISTS (SELECT 1 FROM drivers);

-- Verify
SELECT COUNT(*) as driver_count FROM drivers;

