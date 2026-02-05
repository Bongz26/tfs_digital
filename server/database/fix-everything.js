// Complete fix: Update vehicle types, fix constraint, remove driver columns
// This script does everything in the correct order
require('dotenv').config();
const { query, getClient } = require('../config/db');
const { updateVehicleTypes, TYPE_MAPPING } = require('./update-vehicle-types');

const fixEverything = async () => {
  const client = await getClient();
  
  try {
    console.log('🔧 Complete Fix: Updating types, constraint, and removing driver columns...\n');
    
    // Step 1: Update vehicle types first (within a transaction)
    console.log('📝 Step 1: Updating vehicle types...\n');
    await client.query('BEGIN');
    
    const oldTypes = Object.keys(TYPE_MAPPING);
    const invalidVehicles = await client.query(`
      SELECT id, reg_number, type 
      FROM vehicles 
      WHERE type = ANY($1)
    `, [oldTypes]);
    
    if (invalidVehicles.rows.length > 0) {
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
      console.log(`\n✅ Updated ${updatedCount} vehicles\n`);
    } else {
      console.log('✅ No vehicles need type updates\n');
    }
    
    // Step 2: Verify all vehicles have valid types
    console.log('📝 Step 2: Verifying all vehicles have valid types...');
    const invalidTypes = await client.query(`
      SELECT id, reg_number, type 
      FROM vehicles 
      WHERE type NOT IN ('fortuner', 'vito', 'v_class', 'truck', 'q7', 'hilux')
         OR type IS NULL
    `);
    
    if (invalidTypes.rows.length > 0) {
      console.log(`❌ Still found ${invalidTypes.rows.length} vehicles with invalid types:`);
      invalidTypes.rows.forEach(v => {
        console.log(`   - ${v.reg_number}: "${v.type || 'NULL'}"`);
      });
      console.log('\n💡 Please update these manually or fix the TYPE_MAPPING in update-vehicle-types.js');
      process.exit(1);
    } else {
      console.log('✅ All vehicles have valid types\n');
    }
    
    // Step 3: Now fix the constraint
    await client.query('BEGIN');
    
    console.log('📝 Step 3: Dropping old constraint...');
    try {
      // Try multiple methods to drop the constraint
      await client.query('ALTER TABLE vehicles DROP CONSTRAINT IF EXISTS vehicles_type_check CASCADE');
      console.log('✅ Constraint dropped\n');
    } catch (error) {
      console.log('⚠️  Trying alternative method to drop constraint...');
      try {
        await client.query(`
          DO $$ 
          BEGIN
            IF EXISTS (
              SELECT 1 FROM pg_constraint 
              WHERE conname = 'vehicles_type_check' 
              AND conrelid = 'vehicles'::regclass
            ) THEN
              ALTER TABLE vehicles DROP CONSTRAINT vehicles_type_check CASCADE;
            END IF;
          END $$;
        `);
        console.log('✅ Constraint dropped (alternative method)\n');
      } catch (error2) {
        console.log('⚠️  Could not drop constraint:', error2.message);
        console.log('   Continuing anyway...\n');
      }
    }
    
    // Step 4: Verify constraint is gone
    const constraintCheck = await client.query(`
      SELECT 1 FROM pg_constraint 
      WHERE conname = 'vehicles_type_check' 
      AND conrelid = 'vehicles'::regclass
    `);
    
    if (constraintCheck.rows.length > 0) {
      console.log('⚠️  Constraint still exists. Trying to get constraint OID and drop it...');
      const constraintOid = await client.query(`
        SELECT oid FROM pg_constraint 
        WHERE conname = 'vehicles_type_check' 
        AND conrelid = 'vehicles'::regclass
      `);
      if (constraintOid.rows.length > 0) {
        await client.query(`ALTER TABLE vehicles DROP CONSTRAINT vehicles_type_check CASCADE`);
        console.log('✅ Constraint force-dropped\n');
      }
    }
    
    // Step 5: Add new constraint
    console.log('📝 Step 4: Adding new constraint...');
    try {
      await client.query(`
        ALTER TABLE vehicles 
        ADD CONSTRAINT vehicles_type_check 
        CHECK (type IN ('fortuner', 'vito', 'v_class', 'truck', 'q7', 'hilux'))
      `);
      console.log('✅ New constraint added\n');
    } catch (error) {
      if (error.message.includes('already exists')) {
        console.log('⚠️  Constraint already exists - checking definition...');
        const constraintDef = await client.query(`
          SELECT pg_get_constraintdef(oid) AS definition
          FROM pg_constraint
          WHERE conname = 'vehicles_type_check'
          AND conrelid = 'vehicles'::regclass
        `);
        if (constraintDef.rows.length > 0) {
          const def = constraintDef.rows[0].definition;
          console.log(`   Current: ${def}`);
          if (def.includes("'fortuner'")) {
            console.log('✅ Constraint has correct definition\n');
          } else {
            console.log('❌ Constraint has wrong definition!');
            console.log('   You may need to manually drop and recreate it.\n');
          }
        }
      } else {
        throw error;
      }
    }
    
    // Step 6: Remove driver columns
    console.log('📝 Step 5: Removing driver columns...');
    const tableInfo = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'vehicles'
        AND column_name IN ('driver_name', 'driver_contact')
    `);
    
    const hasDriverName = tableInfo.rows.some(col => col.column_name === 'driver_name');
    const hasDriverContact = tableInfo.rows.some(col => col.column_name === 'driver_contact');
    
    if (hasDriverName || hasDriverContact) {
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
      console.log('✅ Driver columns already removed\n');
    }
    
    await client.query('COMMIT');
    
    console.log('✅ Complete fix finished successfully!');
    console.log('\n📋 Summary:');
    console.log('   ✅ Vehicle types updated');
    console.log('   ✅ Constraint fixed');
    console.log('   ✅ Driver columns removed');
    console.log('\n💡 You should now be able to update/delete vehicles without errors.');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Fix failed:', error.message);
    console.error('💡 Error details:', error);
    process.exit(1);
  } finally {
    client.release();
  }
};

if (require.main === module) {
  fixEverything()
    .then(() => process.exit(0))
    .catch(err => {
      console.error(err);
      process.exit(1);
    });
}

module.exports = { fixEverything };

