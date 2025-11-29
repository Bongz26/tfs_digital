// Migration script to remove driver columns from vehicles and update constraint
require('dotenv').config();
const { query, getClient } = require('../config/db');

const migrateVehicles = async () => {
  const client = await getClient();
  
  try {
    console.log('🔄 Starting vehicles table migration...\n');
    
    await client.query('BEGIN');
    
    // Step 1: Check current table structure
    console.log('📝 Step 1: Checking current table structure...');
    const tableInfo = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'vehicles'
      ORDER BY ordinal_position
    `);
    
    console.log('Current columns:');
    tableInfo.rows.forEach(col => {
      console.log(`   - ${col.column_name} (${col.data_type})`);
    });
    console.log('');
    
    // Step 2: Check for driver columns
    const hasDriverName = tableInfo.rows.some(col => col.column_name === 'driver_name');
    const hasDriverContact = tableInfo.rows.some(col => col.column_name === 'driver_contact');
    
    if (hasDriverName || hasDriverContact) {
      console.log('⚠️  Found driver columns in vehicles table');
      console.log('   These will be removed. Make sure driver data is in the drivers table!\n');
    }
    
    // Step 3: Check for invalid vehicle types FIRST (before dropping constraint)
    console.log('📝 Step 2: Checking for vehicles with invalid types...');
    const invalidTypes = await client.query(`
      SELECT id, reg_number, type 
      FROM vehicles 
      WHERE type NOT IN ('fortuner', 'vito', 'v_class', 'truck', 'q7', 'hilux')
         OR type IS NULL
    `);
    
    if (invalidTypes.rows.length > 0) {
      console.log(`⚠️  Found ${invalidTypes.rows.length} vehicles with invalid types:`);
      invalidTypes.rows.forEach(v => {
        console.log(`   - ${v.reg_number}: "${v.type || 'NULL'}"`);
      });
      console.log('\n❌ Migration cannot complete: Vehicles with invalid types found');
      console.log('💡 Please update these vehicles to use valid types first.');
      console.log('\n📋 Valid types: fortuner, vito, v_class, truck, q7, hilux');
      console.log('\n💡 Run this script to see the exact SQL commands:');
      console.log('   node database/fix-vehicle-types.js');
      console.log('\n💡 Or update manually with SQL:');
      invalidTypes.rows.forEach(v => {
        console.log(`   UPDATE vehicles SET type = 'fortuner' WHERE reg_number = '${v.reg_number}';`);
      });
      await client.query('ROLLBACK');
      process.exit(1);
    } else {
      console.log('✅ All vehicles have valid types\n');
    }
    
    // Step 4: Drop old constraint (now safe since all types are valid)
    console.log('📝 Step 3: Dropping old vehicle type constraint...');
    await client.query('ALTER TABLE vehicles DROP CONSTRAINT IF EXISTS vehicles_type_check');
    console.log('✅ Old constraint dropped\n');
    
    // Step 5: Add new constraint
    console.log('📝 Step 4: Adding new vehicle type constraint...');
    await client.query(`
      ALTER TABLE vehicles 
      ADD CONSTRAINT vehicles_type_check 
      CHECK (type IN ('fortuner', 'vito', 'v_class', 'truck', 'q7', 'hilux'))
    `);
    console.log('✅ New constraint added\n');
    
    // Step 6: Remove driver columns
    if (hasDriverName || hasDriverContact) {
      console.log('📝 Step 5: Removing driver columns...');
      
      if (hasDriverContact) {
        await client.query('ALTER TABLE vehicles DROP COLUMN IF EXISTS driver_contact');
        console.log('✅ Removed driver_contact column');
      }
      
      if (hasDriverName) {
        await client.query('ALTER TABLE vehicles DROP COLUMN IF EXISTS driver_name');
        console.log('✅ Removed driver_name column');
      }
      
      console.log('');
    } else {
      console.log('📝 Step 5: No driver columns found (already removed)\n');
    }
    
    await client.query('COMMIT');
    
    console.log('✅ Migration completed successfully!');
    console.log('\n📋 Summary:');
    console.log('   - Vehicle type constraint updated');
    console.log('   - Driver columns removed from vehicles table');
    console.log('   - All vehicles have valid types');
    console.log('\n💡 Remember: Drivers are now managed in the drivers table');
    console.log('   and assigned per case in the roster table.');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Migration failed:', error.message);
    console.error('💡 Error details:', error);
    process.exit(1);
  } finally {
    client.release();
  }
};

if (require.main === module) {
  migrateVehicles()
    .then(() => process.exit(0))
    .catch(err => {
      console.error(err);
      process.exit(1);
    });
}

module.exports = { migrateVehicles };

