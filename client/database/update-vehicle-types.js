// Script to update vehicles from old types to new types
require('dotenv').config();
const { query, getClient } = require('../config/db');

// Mapping from old types to new types
// You can customize this based on your actual vehicles
const TYPE_MAPPING = {
  'hearse': 'v_class',      // Hearses are usually larger vehicles like V-Class
  'family_car': 'vito',     // Family cars are usually smaller like Vito
  'bus': 'truck',           // Buses are large vehicles, map to truck
  'backup': 'hilux'         // Backup vehicles are usually versatile like Hilux
};

const updateVehicleTypes = async (externalClient = null) => {
  const client = externalClient || await getClient();
  const shouldRelease = !externalClient; // Only release if we created the client
  
  try {
    if (!externalClient) {
      console.log('🔄 Updating vehicle types...\n');
      await client.query('BEGIN');
    }
    
    // Get all vehicles with old types
    const oldTypes = Object.keys(TYPE_MAPPING);
    const invalidVehicles = await client.query(`
      SELECT id, reg_number, type 
      FROM vehicles 
      WHERE type = ANY($1)
    `, [oldTypes]);
    
    if (invalidVehicles.rows.length === 0) {
      if (!externalClient) {
        console.log('✅ No vehicles need updating!');
        await client.query('ROLLBACK');
      }
      return { updated: 0 };
    }
    
    console.log(`📋 Found ${invalidVehicles.rows.length} vehicles to update:\n`);
    
    let updatedCount = 0;
    
    for (const vehicle of invalidVehicles.rows) {
      const oldType = vehicle.type;
      const newType = TYPE_MAPPING[oldType];
      
      if (!newType) {
        console.log(`⚠️  Skipping ${vehicle.reg_number}: No mapping for type "${oldType}"`);
        continue;
      }
      
      try {
        await client.query(
          'UPDATE vehicles SET type = $1 WHERE id = $2',
          [newType, vehicle.id]
        );
        console.log(`✅ ${vehicle.reg_number}: "${oldType}" → "${newType}"`);
        updatedCount++;
      } catch (error) {
        console.error(`❌ Error updating ${vehicle.reg_number}:`, error.message);
      }
    }
    
    if (!externalClient) {
      await client.query('COMMIT');
      console.log(`\n✅ Successfully updated ${updatedCount} vehicles!`);
      console.log('\n💡 Review the changes above. If any mappings are incorrect,');
      console.log('   you can update them manually with SQL:');
      console.log('   UPDATE vehicles SET type = \'correct_type\' WHERE reg_number = \'REG_NUMBER\';');
      console.log('\n📋 Valid types: fortuner, vito, v_class, truck, q7, hilux');
    }
    
    return { updated: updatedCount };
    
  } catch (error) {
    if (!externalClient) {
      await client.query('ROLLBACK');
      console.error('❌ Error updating vehicles:', error.message);
      process.exit(1);
    } else {
      throw error;
    }
  } finally {
    if (shouldRelease) {
      client.release();
    }
  }
};

if (require.main === module) {
  console.log('📋 Type Mapping:');
  Object.entries(TYPE_MAPPING).forEach(([old, newType]) => {
    console.log(`   ${old} → ${newType}`);
  });
  console.log('\n💡 You can edit this script to change the mapping if needed.\n');
  
  updateVehicleTypes()
    .then(() => process.exit(0))
    .catch(err => {
      console.error(err);
      process.exit(1);
    });
}

module.exports = { updateVehicleTypes, TYPE_MAPPING };

