// Migration script to add delivery_date and delivery_time columns to cases table
// Run with: node server/database/migrate-add-delivery-time.js

const { query } = require('../config/db');

async function migrate() {
  try {
    console.log('🔄 Starting migration: Add delivery_date and delivery_time columns...\n');

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

    // Verify columns were added
    const verify = await query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'cases' 
        AND column_name IN ('delivery_date', 'delivery_time')
      ORDER BY column_name
    `);

    console.log('📋 Verification:');
    verify.rows.forEach(row => {
      console.log(`   ✅ ${row.column_name} (${row.data_type})`);
    });

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

