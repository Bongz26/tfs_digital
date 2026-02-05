// Script to fix the constraint and remove driver columns
// This handles the case where the constraint still has old types
require('dotenv').config();
const { query, getClient } = require('../config/db');

const fixConstraintAndDrivers = async () => {
  const client = await getClient();
  
  try {
    console.log('🔧 Fixing vehicle constraint and removing driver columns...\n');
    
    await client.query('BEGIN');
    
    // Step 1: Check current constraint definition
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
      console.log('Current constraint:');
      console.log(`   ${constraintInfo.rows[0].constraint_definition}\n`);
    } else {
      console.log('⚠️  No constraint found (this is okay if it was already dropped)\n');
    }
    
    // Step 2: Check for invalid vehicle types
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
      console.log('\n❌ Please update these vehicles first using:');
      console.log('   node database/update-vehicle-types.js');
      await client.query('ROLLBACK');
      process.exit(1);
    } else {
      console.log('✅ All vehicles have valid types\n');
    }
    
    // Step 3: Drop the constraint (if it exists) - use CASCADE to force it
    console.log('📝 Step 3: Dropping old constraint...');
    try {
      await client.query('ALTER TABLE vehicles DROP CONSTRAINT IF EXISTS vehicles_type_check CASCADE');
      console.log('✅ Constraint dropped\n');
    } catch (error) {
      // If constraint doesn't exist, that's fine
      if (error.message.includes('does not exist')) {
        console.log('⚠️  Constraint already removed\n');
      } else {
        console.log('⚠️  Error dropping constraint (might not exist):', error.message);
        console.log('   Continuing anyway...\n');
      }
    }
    
    // Step 4: Check if constraint still exists
    console.log('📝 Step 4: Checking if constraint exists...');
    const constraintCheck = await client.query(`
      SELECT 1 FROM pg_constraint 
      WHERE conname = 'vehicles_type_check' 
      AND conrelid = 'vehicles'::regclass
    `);
    
    if (constraintCheck.rows.length > 0) {
      console.log('⚠️  Constraint still exists, trying to drop again with different method...');
      // Try a different approach - get the constraint name and drop it
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
      console.log('✅ Constraint force-dropped\n');
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
        console.log('⚠️  Constraint already exists - verifying definition...');
        // Check if the constraint has the correct definition
        const constraintDef = await client.query(`
          SELECT pg_get_constraintdef(oid) AS definition
          FROM pg_constraint
          WHERE conname = 'vehicles_type_check'
          AND conrelid = 'vehicles'::regclass
        `);
        if (constraintDef.rows.length > 0) {
          console.log(`   Current definition: ${constraintDef.rows[0].definition}`);
          if (constraintDef.rows[0].definition.includes("'fortuner'")) {
            console.log('✅ Constraint has correct definition\n');
          } else {
            console.log('⚠️  Constraint has wrong definition - you may need to drop it manually\n');
          }
        }
      } else {
        throw error;
      }
    }
    
    // Step 5: Check for driver columns
    console.log('📝 Step 5: Checking for driver columns...');
    const tableInfo = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'vehicles'
        AND column_name IN ('driver_name', 'driver_contact')
    `);
    
    const hasDriverName = tableInfo.rows.some(col => col.column_name === 'driver_name');
    const hasDriverContact = tableInfo.rows.some(col => col.column_name === 'driver_contact');
    
    if (hasDriverName || hasDriverContact) {
      console.log('⚠️  Found driver columns, removing them...\n');
      
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
    
    console.log('✅ Migration completed successfully!');
    console.log('\n📋 Summary:');
    console.log('   - All vehicles have valid types');
    console.log('   - Constraint updated');
    console.log('   - Driver columns removed');
    console.log('\n💡 You should now be able to update/delete vehicles without errors.');
    
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
  fixConstraintAndDrivers()
    .then(() => process.exit(0))
    .catch(err => {
      console.error(err);
      process.exit(1);
    });
}

module.exports = { fixConstraintAndDrivers };

