// Script to find and fix vehicles with invalid types
require('dotenv').config();
const { query, getClient } = require('../config/db');

const fixVehicleTypes = async () => {
  const client = await getClient();
  
  try {
    console.log('🔍 Checking for vehicles with invalid types...\n');
    
    // Step 1: Find vehicles with invalid types
    const invalidVehicles = await client.query(`
      SELECT id, reg_number, type 
      FROM vehicles 
      WHERE type NOT IN ('fortuner', 'vito', 'v_class', 'truck', 'q7', 'hilux')
         OR type IS NULL
    `);
    
    if (invalidVehicles.rows.length === 0) {
      console.log('✅ All vehicles have valid types!');
      console.log('💡 You can now run the migration script to update the constraint.\n');
      return;
    }
    
    console.log(`⚠️  Found ${invalidVehicles.rows.length} vehicles with invalid types:\n`);
    
    invalidVehicles.rows.forEach((vehicle, index) => {
      console.log(`${index + 1}. ${vehicle.reg_number}: "${vehicle.type || 'NULL'}"`);
    });
    
    console.log('\n📋 Valid vehicle types:');
    console.log('   - fortuner');
    console.log('   - vito');
    console.log('   - v_class');
    console.log('   - truck');
    console.log('   - q7');
    console.log('   - hilux');
    
    console.log('\n💡 To fix these, you need to update each vehicle manually.');
    console.log('   Example SQL commands:\n');
    
    invalidVehicles.rows.forEach(vehicle => {
      console.log(`   UPDATE vehicles SET type = 'fortuner' WHERE reg_number = '${vehicle.reg_number}';`);
    });
    
    console.log('\n⚠️  Please update these vehicles first, then run the migration script again.');
    
  } catch (error) {
    console.error('❌ Error checking vehicles:', error.message);
    process.exit(1);
  } finally {
    client.release();
  }
};

if (require.main === module) {
  fixVehicleTypes()
    .then(() => process.exit(0))
    .catch(err => {
      console.error(err);
      process.exit(1);
    });
}

module.exports = { fixVehicleTypes };

