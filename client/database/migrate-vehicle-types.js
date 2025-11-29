// Migration script to update vehicle types
// Run this after updating your vehicle records to use new types
require('dotenv').config();
const { query, getClient } = require('../config/db');

const migrateVehicleTypes = async () => {
  const client = await getClient();
  
  try {
    console.log('🔄 Starting vehicle type migration...\n');
    
    await client.query('BEGIN');
    
    // Step 1: Drop old constraint
    console.log('📝 Step 1: Dropping old constraint...');
    await client.query('ALTER TABLE vehicles DROP CONSTRAINT IF EXISTS vehicles_type_check');
    console.log('✅ Old constraint dropped\n');
    
    // Step 2: Add new constraint
    console.log('📝 Step 2: Adding new constraint with new vehicle types...');
    await client.query(`
      ALTER TABLE vehicles 
      ADD CONSTRAINT vehicles_type_check 
      CHECK (type IN ('fortuner', 'vito', 'v_class', 'truck', 'q7', 'hilux'))
    `);
    console.log('✅ New constraint added\n');
    
    // Step 3: Check for vehicles with old types
    console.log('📝 Step 3: Checking for vehicles with old types...');
    const oldTypes = ['hearse', 'family_car', 'bus', 'backup'];
    const result = await client.query(
      `SELECT id, reg_number, type FROM vehicles WHERE type = ANY($1)`,
      [oldTypes]
    );
    
    if (result.rows.length > 0) {
      console.log(`⚠️  Found ${result.rows.length} vehicles with old types:`);
      result.rows.forEach(v => {
        console.log(`   - ${v.reg_number}: ${v.type}`);
      });
      console.log('\n❌ Migration cannot complete: Vehicles with old types found');
      console.log('💡 Please update these vehicles to use new types first:');
      console.log('   Valid types: fortuner, vito, v_class, truck, q7, hilux');
      console.log('\n💡 Example update:');
      console.log('   UPDATE vehicles SET type = \'fortuner\' WHERE reg_number = \'HVR 607 FS\';');
      await client.query('ROLLBACK');
      process.exit(1);
    } else {
      console.log('✅ No vehicles with old types found\n');
    }
    
    await client.query('COMMIT');
    console.log('✅ Migration completed successfully!');
    console.log('\n📋 New vehicle types:');
    console.log('   - fortuner');
    console.log('   - vito');
    console.log('   - v_class');
    console.log('   - truck');
    console.log('   - q7');
    console.log('   - hilux');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Migration failed:', error.message);
    console.error('💡 Make sure all vehicles use the new types before running this migration');
    process.exit(1);
  } finally {
    client.release();
  }
};

if (require.main === module) {
  migrateVehicleTypes()
    .then(() => process.exit(0))
    .catch(err => {
      console.error(err);
      process.exit(1);
    });
}

module.exports = { migrateVehicleTypes };

