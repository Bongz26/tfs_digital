// Fix Wrong Vehicle/Driver Assignment
// Usage: node database/fix-vehicle-assignment.js <caseId> <newVehicleId> <newDriverName> [oldVehicleId]

const { query, getClient } = require('../config/db');

async function fixAssignment(caseId, newVehicleId, newDriverName, oldVehicleId = null) {
  const client = await getClient();
  
  try {
    await client.query('BEGIN');
    
    console.log(`🔧 Fixing assignment for case ${caseId}...`);
    
    // Step 1: Get current roster entry to find old vehicle if not provided
    const currentRoster = await client.query(
      'SELECT vehicle_id, driver_name FROM roster WHERE case_id = $1',
      [caseId]
    );
    
    if (currentRoster.rows.length === 0) {
      throw new Error(`No roster entry found for case ${caseId}`);
    }
    
    const oldVehicle = oldVehicleId || currentRoster.rows[0].vehicle_id;
    const oldDriver = currentRoster.rows[0].driver_name;
    
    console.log(`📋 Current assignment: Vehicle ${oldVehicle}, Driver: ${oldDriver}`);
    console.log(`🔄 New assignment: Vehicle ${newVehicleId}, Driver: ${newDriverName}`);
    
    // Step 2: Update roster entry
    const updateResult = await client.query(
      `UPDATE roster 
       SET vehicle_id = $1, 
           driver_name = $2,
           updated_at = NOW()
       WHERE case_id = $3
       RETURNING *`,
      [newVehicleId, newDriverName, caseId]
    );
    
    if (updateResult.rows.length === 0) {
      throw new Error(`Failed to update roster for case ${caseId}`);
    }
    
    console.log('✅ Roster entry updated');
    
    // Step 3: Mark old vehicle as available (if vehicle changed)
    if (oldVehicle !== newVehicleId) {
      await client.query(
        'UPDATE vehicles SET available = true WHERE id = $1',
        [oldVehicle]
      );
      console.log(`✅ Vehicle ${oldVehicle} marked as available`);
      
      // Step 4: Mark new vehicle as unavailable
      await client.query(
        'UPDATE vehicles SET available = false WHERE id = $1',
        [newVehicleId]
      );
      console.log(`✅ Vehicle ${newVehicleId} marked as unavailable`);
    } else {
      console.log('ℹ️  Vehicle unchanged, skipping vehicle status update');
    }
    
    await client.query('COMMIT');
    
    console.log(`\n✅ Successfully fixed assignment for case ${caseId}`);
    console.log(`   Vehicle: ${oldVehicle} → ${newVehicleId}`);
    console.log(`   Driver: ${oldDriver} → ${newDriverName}`);
    
    return {
      success: true,
      caseId,
      oldVehicle,
      newVehicleId,
      oldDriver,
      newDriverName
    };
    
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Error fixing assignment:', err.message);
    throw err;
  } finally {
    client.release();
  }
}

// Command line usage
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.length < 3) {
    console.error('Usage: node database/fix-vehicle-assignment.js <caseId> <newVehicleId> <newDriverName> [oldVehicleId]');
    console.error('\nExample:');
    console.error('  node database/fix-vehicle-assignment.js 5 7 "J MOFOKENG"');
    console.error('  (Fixes case 5: changes vehicle to 7, driver to "J MOFOKENG")');
    process.exit(1);
  }
  
  const [caseId, newVehicleId, newDriverName, oldVehicleId] = args;
  
  fixAssignment(parseInt(caseId), parseInt(newVehicleId), newDriverName, oldVehicleId ? parseInt(oldVehicleId) : null)
    .then(() => {
      console.log('\n✅ Done!');
      process.exit(0);
    })
    .catch(err => {
      console.error('\n❌ Failed:', err.message);
      process.exit(1);
    });
}

module.exports = { fixAssignment };

