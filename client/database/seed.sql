-- THUSANANG FUNERAL SYSTEM - SEED DATA
-- Sample data for testing and development

-- Insert default suppliers
INSERT INTO suppliers (name, contact_person, phone, email, address) VALUES
('Phuthanang Suppliers', 'Mpho Mokoena', '+27 71 234 5678', 'procurement@phuthanang.co.za', 'Phuthaditjhaba, Free State'),
('Manekeng Traders', 'Bongani Nkosi', '+27 72 987 6543', 'orders@manekengtraders.co.za', 'Bethlehem, Free State')
ON CONFLICT (name) DO NOTHING;

-- Insert sample inventory items
INSERT INTO inventory (name, category, stock_quantity, reserved_quantity, low_stock_threshold, unit_price) VALUES
('Pine Coffin', 'coffin', 5, 0, 2, 2500.00),
('Oak Coffin', 'coffin', 3, 0, 1, 5000.00),
('Mahogany Coffin', 'coffin', 2, 0, 1, 8000.00),
('10x10 Tent', 'tent', 8, 0, 2, 500.00),
('12x12 Tent', 'tent', 5, 0, 2, 750.00),
('20x20 Tent', 'tent', 3, 0, 1, 1200.00),
('Plastic Chair', 'chair', 50, 0, 10, 50.00),
('Folding Chair', 'chair', 30, 0, 5, 75.00),
('Wreath Stand', 'other', 10, 0, 3, 150.00),
('Sound System', 'other', 2, 0, 1, 800.00),
('Catering Set', 'catering', 5, 0, 2, 1200.00),
('Grave Marker', 'tombstone', 15, 0, 5, 300.00)
ON CONFLICT DO NOTHING;

-- Insert sample livestock (if not already inserted)
INSERT INTO livestock (tag_id, status, breed, location) VALUES
('COW-001', 'available', 'Nguni', 'Manekeng Farm'),
('COW-002', 'available', 'Nguni', 'Manekeng Farm'),
('COW-003', 'available', 'Afrikaner', 'Manekeng Farm'),
('COW-004', 'available', 'Nguni', 'Manekeng Farm'),
('COW-005', 'available', 'Bonsmara', 'Manekeng Farm')
ON CONFLICT (tag_id) DO NOTHING;

