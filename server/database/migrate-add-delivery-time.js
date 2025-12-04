// Migration script to add missing columns to cases table
// Adds: delivery_date, delivery_time, service_type, total_price, casket_type, casket_colour
// Run with: node server/database/migrate-add-delivery-time.js

const { query } = require('../config/db');

async function migrate() {
  try {
    console.log('🔄 Starting migration: Add missing case columns...\n');

    // Check if delivery_date column exists
    const checkDate = await query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'cases' AND column_name = 'delivery_date'
    `);

    if (checkDate.rows.length === 0) {
      console.log('📝 Adding delivery_date column...');
      await query('ALTER TABLE cases ADD COLUMN delivery_date DATE');
      console.log('✅ Added delivery_date column\n');
    } else {
      console.log('⏭️  delivery_date column already exists\n');
    }

    // Check if delivery_time column exists
    const checkTime = await query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'cases' AND column_name = 'delivery_time'
    `);

    if (checkTime.rows.length === 0) {
      console.log('📝 Adding delivery_time column...');
      await query('ALTER TABLE cases ADD COLUMN delivery_time TIME');
      console.log('✅ Added delivery_time column\n');
    } else {
      console.log('⏭️  delivery_time column already exists\n');
    }

    // service_type (VARCHAR(20))
    const checkServiceType = await query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'cases' AND column_name = 'service_type'
    `);
    if (checkServiceType.rows.length === 0) {
      console.log('📝 Adding service_type column...');
      await query("ALTER TABLE cases ADD COLUMN service_type VARCHAR(20)");
      console.log('✅ Added service_type column\n');
    } else {
      console.log('⏭️  service_type column already exists\n');
    }

    // total_price (DECIMAL(12,2))
    const checkTotalPrice = await query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'cases' AND column_name = 'total_price'
    `);
    if (checkTotalPrice.rows.length === 0) {
      console.log('📝 Adding total_price column...');
      await query('ALTER TABLE cases ADD COLUMN total_price DECIMAL(12,2) DEFAULT 0');
      console.log('✅ Added total_price column\n');
    } else {
      console.log('⏭️  total_price column already exists\n');
    }

    // casket_type (VARCHAR(100))
    const checkCasketType = await query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'cases' AND column_name = 'casket_type'
    `);
    if (checkCasketType.rows.length === 0) {
      console.log('📝 Adding casket_type column...');
      await query('ALTER TABLE cases ADD COLUMN casket_type VARCHAR(100)');
      console.log('✅ Added casket_type column\n');
    } else {
      console.log('⏭️  casket_type column already exists\n');
    }

    // casket_colour (VARCHAR(100))
    const checkCasketColour = await query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'cases' AND column_name = 'casket_colour'
    `);
    if (checkCasketColour.rows.length === 0) {
      console.log('📝 Adding casket_colour column...');
      await query('ALTER TABLE cases ADD COLUMN casket_colour VARCHAR(100)');
      console.log('✅ Added casket_colour column\n');
    } else {
      console.log('⏭️  casket_colour column already exists\n');
    }

    // requires_catering (BOOLEAN DEFAULT FALSE)
    const checkRequiresCatering = await query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'cases' AND column_name = 'requires_catering'
    `);
    if (checkRequiresCatering.rows.length === 0) {
      console.log('📝 Adding requires_catering column...');
      await query('ALTER TABLE cases ADD COLUMN requires_catering BOOLEAN DEFAULT FALSE');
      console.log('✅ Added requires_catering column\n');
    } else {
      console.log('⏭️  requires_catering column already exists\n');
    }

    // requires_grocery (BOOLEAN DEFAULT FALSE)
    const checkRequiresGrocery = await query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'cases' AND column_name = 'requires_grocery'
    `);
    if (checkRequiresGrocery.rows.length === 0) {
      console.log('📝 Adding requires_grocery column...');
      await query('ALTER TABLE cases ADD COLUMN requires_grocery BOOLEAN DEFAULT FALSE');
      console.log('✅ Added requires_grocery column\n');
    } else {
      console.log('⏭️  requires_grocery column already exists\n');
    }

    // requires_bus (BOOLEAN DEFAULT FALSE)
    const checkRequiresBus = await query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'cases' AND column_name = 'requires_bus'
    `);
    if (checkRequiresBus.rows.length === 0) {
      console.log('📝 Adding requires_bus column...');
      await query('ALTER TABLE cases ADD COLUMN requires_bus BOOLEAN DEFAULT FALSE');
      console.log('✅ Added requires_bus column\n');
    } else {
      console.log('⏭️  requires_bus column already exists\n');
    }

    // Additional frontend-aligned fields
    const columnsToAdd = [
      { name: 'claim_date', type: 'DATE' },
      { name: 'policy_number', type: 'VARCHAR(50)' },
      { name: 'benefit_mode', type: "VARCHAR(20)" },
      { name: 'cleansing_date', type: 'DATE' },
      { name: 'cleansing_time', type: 'TIME' },
      { name: 'service_date', type: 'DATE' },
      { name: 'service_time', type: 'TIME' },
      { name: 'church_date', type: 'DATE' },
      { name: 'church_time', type: 'TIME' },
      { name: 'programs', type: 'INT' },
      { name: 'top_up_amount', type: 'DECIMAL(12,2) DEFAULT 0' },
      { name: 'airtime', type: 'BOOLEAN DEFAULT FALSE' },
      { name: 'airtime_network', type: 'VARCHAR(50)' },
      { name: 'airtime_number', type: 'VARCHAR(20)' },
      { name: 'cover_amount', type: 'DECIMAL(12,2) DEFAULT 0' },
      { name: 'cashback_amount', type: 'DECIMAL(12,2) DEFAULT 0' },
      { name: 'amount_to_bank', type: 'DECIMAL(12,2) DEFAULT 0' },
      { name: 'requires_sheep', type: 'BOOLEAN DEFAULT FALSE' },
      { name: 'legacy_plan_name', type: 'VARCHAR(100)' }
    ];

    for (const col of columnsToAdd) {
      const exists = await query(`
        SELECT column_name FROM information_schema.columns 
        WHERE table_name = 'cases' AND column_name = '${col.name}'
      `);
      if (exists.rows.length === 0) {
        console.log(`📝 Adding ${col.name} column...`);
        await query(`ALTER TABLE cases ADD COLUMN ${col.name} ${col.type}`);
        console.log(`✅ Added ${col.name} column\n`);
      } else {
        console.log(`⏭️  ${col.name} column already exists\n`);
      }
    }

    // Verify columns were added
    const verify = await query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'cases' 
        AND column_name IN (
          'delivery_date', 'delivery_time', 'service_type', 'total_price', 'casket_type', 'casket_colour', 'requires_catering', 'requires_grocery', 'requires_bus',
          'claim_date','policy_number','benefit_mode','cleansing_date','cleansing_time','service_date','service_time','church_date','church_time','programs','top_up_amount','airtime','airtime_network','airtime_number','cover_amount','cashback_amount','amount_to_bank','requires_sheep','legacy_plan_name'
        )
      ORDER BY column_name
    `);

    console.log('📋 Verification:');
    verify.rows.forEach(row => {
      console.log(`   ✅ ${row.column_name} (${row.data_type})`);
    });

    const createdAtChecks = [
      { table: 'stock_movements', type: 'TIMESTAMP' },
      { table: 'purchase_orders', type: 'TIMESTAMP' },
      { table: 'suppliers', type: 'TIMESTAMP' },
      { table: 'purchase_order_items', type: 'TIMESTAMP' },
      { table: 'stock_takes', type: 'TIMESTAMP' },
      { table: 'stock_take_items', type: 'TIMESTAMP' },
      { table: 'inventory', type: 'TIMESTAMP' }
    ];
    for (const item of createdAtChecks) {
      const check = await query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = '${item.table}' AND column_name = 'created_at'
      `);
      if (check.rows.length === 0) {
        await query(`ALTER TABLE ${item.table} ADD COLUMN created_at ${item.type} DEFAULT NOW()`);
      }
    }
    const svcConstraint = await query(`
      SELECT conname 
      FROM pg_constraint 
      WHERE conrelid = 'cases'::regclass 
        AND conname = 'cases_service_type_check'
    `);
    if (svcConstraint.rows.length > 0) {
      await query('ALTER TABLE cases DROP CONSTRAINT cases_service_type_check');
    }
    console.log('\n✅ Migration completed successfully!');

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error('Error details:', error);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

migrate();
