// server/database/insert-test-data.js
// Script to insert test data for testing the system
require('dotenv').config();
const { query } = require('../config/db');

const insertTestData = async () => {
  try {
    console.log('📊 Starting test data insertion...');

    // Insert test case
    console.log('📋 Inserting test case...');
    const caseResult = await query(
      `INSERT INTO cases (
        case_number, deceased_name, deceased_id, nok_name, nok_contact,
        nok_relation, plan_category, funeral_date, funeral_time,
        venue_name, venue_address, status, intake_day
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13
      ) RETURNING *`,
      [
        'THS-2025-001',
        'Test Deceased',
        '8501015800085',
        'Test NOK',
        '0821234567',
        'Spouse',
        'single',
        '2025-12-01',
        '10:00:00',
        'Test Venue',
        '123 Test Street',
        'intake',
        '2025-11-12' // Must be a Wednesday
      ]
    );
    console.log('✅ Test case inserted:', caseResult.rows[0].case_number);

    // Insert test suppliers
    console.log('🏢 Inserting test suppliers...');
    const suppliers = [
      { name: 'Phuthanang Suppliers', contact_person: 'Mpho Mokoena', phone: '+27 71 234 5678', email: 'procurement@phuthanang.co.za', address: 'Phuthaditjhaba, Free State' },
      { name: 'Manekeng Traders', contact_person: 'Bongani Nkosi', phone: '+27 72 987 6543', email: 'orders@manekengtraders.co.za', address: 'Bethlehem, Free State' }
    ];

    for (const supplier of suppliers) {
      await query(
        `INSERT INTO suppliers (name, contact_person, phone, email, address)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (name) DO NOTHING`,
        [supplier.name, supplier.contact_person, supplier.phone, supplier.email, supplier.address]
      );
    }
    console.log('✅ Test suppliers inserted');

    // Insert test inventory items
    console.log('📦 Inserting test inventory...');
    const inventoryItems = [
      { name: 'Pine Coffin', category: 'coffin', stock_quantity: 5, low_stock_threshold: 2, unit_price: 2500.00 },
      { name: '10x10 Tent', category: 'tent', stock_quantity: 8, low_stock_threshold: 2, unit_price: 500.00 },
      { name: 'Plastic Chair', category: 'chair', stock_quantity: 50, low_stock_threshold: 10, unit_price: 50.00 },
    ];

    for (const item of inventoryItems) {
      await query(
        `INSERT INTO inventory (name, category, stock_quantity, low_stock_threshold, unit_price)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT DO NOTHING`,
        [item.name, item.category, item.stock_quantity, item.low_stock_threshold, item.unit_price]
      );
    }
    console.log('✅ Test inventory inserted');

    // Insert test livestock
    console.log('🐄 Inserting test livestock...');
    const livestockItems = [
      { tag_id: 'COW-001', status: 'available', breed: 'Nguni' },
      { tag_id: 'COW-002', status: 'available', breed: 'Nguni' },
    ];

    for (const livestock of livestockItems) {
      await query(
        `INSERT INTO livestock (tag_id, status, breed)
         VALUES ($1, $2, $3)
         ON CONFLICT (tag_id) DO NOTHING`,
        [livestock.tag_id, livestock.status, livestock.breed]
      );
    }
    console.log('✅ Test livestock inserted');

    console.log('✅ Test data insertion completed!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error inserting test data:', error);
    process.exit(1);
  }
};

// Run if called directly
if (require.main === module) {
  insertTestData();
}

module.exports = { insertTestData };

