// Force fix: Temporarily allows invalid types, updates them, then fixes constraint
require('dotenv').config();
const { query, getClient } = require('../config/db');
const { TYPE_MAPPING } = require('./update-vehicle-types');

const fixConstraintForce = async () => {
  const client = await getClient();
  
  try {
    console.log('🔧 Force Fix: Temporarily disabling constraint check...\n');
    
    await client.query('BEGIN');
    
    // Step 1: Check current constraint
    console.log('📝 Step 1: Checking current constraint...');
    const constraintInfo = await client.query(`
      SELECT 
        conname AS constraint_name,
        pg_get_constraintdef(oid) AS constraint_definition
      FROM pg_constraint
      WHERE conrelid = 'vehicles'::regclass
        AND conname = 'vehicles_type_check'
    `);
    
    if (constraintInfo.rows.length > 0) {
      console.log(`Current constraint: ${constraintInfo.rows[0].constraint_definition}\n`);
    }
    
    // Step 2: Find vehicles with old types
    console.log('📝 Step 2: Finding vehicles with old types...');
    const oldTypes = Object.keys(TYPE_MAPPING);
    const invalidVehicles = await client.query(`
      SELECT id, reg_number, type 
      FROM vehicles 
      WHERE type = ANY($1)
    `, [oldTypes]);
    
    if (invalidVehicles.rows.length === 0) {
      console.log('✅ No vehicles with old types found\n');
    } else {
      console.log(`Found ${invalidVehicles.rows.length} vehicles to update\n`);
    }
    
    // Step 3: Drop constraint temporarily (this might fail, but we'll try)
    console.log('📝 Step 3: Dropping constraint temporarily...');
    try {
      // Try to drop with CASCADE
      await client.query('ALTER TABLE vehicles DROP CONSTRAINT IF EXISTS vehicles_type_check CASCADE');
      console.log('✅ Constraint dropped\n');
    } catch (error) {
      console.log('⚠️  Could not drop constraint (this is expected if rows violate it)');
      console.log('   Error:', error.message);
      console.log('   We will update vehicles first, then drop constraint\n');
      
      // If we can't drop, we need to update vehicles to valid types first
      // But we can't update if constraint blocks us... so we need a workaround
      
      // Workaround: Update vehicles using a function that bypasses constraint
      console.log('📝 Using workaround: Updating vehicles via function...');
      
      for (const vehicle of invalidVehicles.rows) {
        const oldType = vehicle.type;
        const newType = TYPE_MAPPING[oldType];
        
        if (!newType) continue;
        
        try {
          // Try to update - this might fail if constraint blocks it
          await client.query(
            'UPDATE vehicles SET type = $1 WHERE id = $2',
            [newType, vehicle.id]
          );
          console.log(`✅ ${vehicle.reg_number}: "${oldType}" → "${newType}"`);
        } catch (updateError) {
          if (updateError.message.includes('violates check constraint')) {
            console.log(`⚠️  ${vehicle.reg_number}: Cannot update (constraint blocks it)`);
            console.log(`   We need to drop constraint first, but can't because of this row`);
            console.log(`   This is a circular problem - manual fix needed`);
          } else {
            throw updateError;
          }
        }
      }
      
      // Now try to drop constraint again
      console.log('\n📝 Trying to drop constraint again...');
      try {
        await client.query('ALTER TABLE vehicles DROP CONSTRAINT vehicles_type_check CASCADE');
        console.log('✅ Constraint dropped\n');
      } catch (error2) {
        console.log('❌ Still cannot drop constraint');
        console.log('💡 You need to manually fix this. Options:');
        console.log('   1. Delete or update violating rows manually');
        console.log('   2. Or use pgAdmin to drop the constraint');
        await client.query('ROLLBACK');
        process.exit(1);
      }
    }
    
    // Step 4: Now update any remaining vehicles with old types
    if (invalidVehicles.rows.length > 0) {
      console.log('📝 Step 4: Updating remaining vehicles...');
      for (const vehicle of invalidVehicles.rows) {
        const oldType = vehicle.type;
        const newType = TYPE_MAPPING[oldType];
        
        if (!newType) continue;
        
        try {
          await client.query(
            'UPDATE vehicles SET type = $1 WHERE id = $2',
            [newType, vehicle.id]
          );
          console.log(`✅ ${vehicle.reg_number}: "${oldType}" → "${newType}"`);
        } catch (error) {
          console.error(`❌ Error updating ${vehicle.reg_number}:`, error.message);
        }
      }
      console.log('');
    }
    
    // Step 5: Add new constraint
    console.log('📝 Step 5: Adding new constraint...');
    try {
      await client.query(`
        ALTER TABLE vehicles 
        ADD CONSTRAINT vehicles_type_check 
        CHECK (type IN ('fortuner', 'vito', 'v_class', 'truck', 'q7', 'hilux'))
      `);
      console.log('✅ New constraint added\n');
    } catch (error) {
      if (error.message.includes('already exists')) {
        console.log('⚠️  Constraint already exists\n');
      } else {
        throw error;
      }
    }
    
    // Step 6: Remove driver columns
    console.log('📝 Step 6: Removing driver columns...');
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
        console.log('✅ Removed driver_contact');
      }
      if (hasDriverName) {
        await client.query('ALTER TABLE vehicles DROP COLUMN IF EXISTS driver_name');
        console.log('✅ Removed driver_name');
      }
      console.log('');
    } else {
      console.log('✅ Driver columns already removed\n');
    }
    
    await client.query('COMMIT');
    
    console.log('✅ Force fix completed!');
    console.log('\n💡 If you still have issues, you may need to:');
    console.log('   1. Manually delete violating rows');
    console.log('   2. Or use pgAdmin to drop the constraint');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Fix failed:', error.message);
    console.error('\n💡 Manual fix required:');
    console.error('   1. Connect to your database');
    console.error('   2. Run: ALTER TABLE vehicles DROP CONSTRAINT vehicles_type_check CASCADE;');
    console.error('   3. Then update vehicle types');
    console.error('   4. Then add the new constraint');
    process.exit(1);
  } finally {
    client.release();
  }
};

if (require.main === module) {
  fixConstraintForce()
    .then(() => process.exit(0))
    .catch(err => {
      console.error(err);
      process.exit(1);
    });
}

module.exports = { fixConstraintForce };

