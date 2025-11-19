// Remove Driver from Assignment
// Usage: node database/remove-driver.js <caseId> [--free-vehicle]

const { query, getClient } = require('../config/db');

async function removeDriver(caseId, freeVehicle = false) {
  const client = await getClient();
  
  try {
    await client.query('BEGIN');
    
    console.log(`🔧 Removing driver from case ${caseId}...`);
    
    // Step 1: Get current roster entry
    const currentRoster = await client.query(
      'SELECT vehicle_id, driver_name FROM roster WHERE case_id = $1',
      [caseId]
    );
    
    if (currentRoster.rows.length === 0) {
      throw new Error(`No roster entry found for case ${caseId}`);
    }
    
    const vehicleId = currentRoster.rows[0].vehicle_id;
    const currentDriver = currentRoster.rows[0].driver_name;
    
    console.log(`📋 Current assignment: Vehicle ${vehicleId}, Driver: ${currentDriver}`);
    
    if (freeVehicle) {
      // Remove driver and free vehicle (mark as available)
      await client.query(
        `UPDATE roster 
         SET driver_name = 'TBD', 
             updated_at = NOW()
         WHERE case_id = $1`,
        [caseId]
      );
      
      await client.query(
        'UPDATE vehicles SET available = true WHERE id = $1',
        [vehicleId]
      );
      
      console.log(`✅ Driver removed and vehicle ${vehicleId} marked as available`);
      console.log(`   Vehicle ${vehicleId} is now free for other assignments`);
    } else {
      // Just remove driver, keep vehicle assigned
      await client.query(
        `UPDATE roster 
         SET driver_name = 'TBD', 
             updated_at = NOW()
         WHERE case_id = $1`,
        [caseId]
      );
      
      console.log(`✅ Driver removed (vehicle ${vehicleId} remains assigned)`);
    }
    
    await client.query('COMMIT');
    
    console.log(`\n✅ Successfully removed driver from case ${caseId}`);
    if (freeVehicle) {
      console.log(`   Vehicle ${vehicleId} is now available`);
    } else {
      console.log(`   Vehicle ${vehicleId} remains assigned to this case`);
    }
    
    return {
      success: true,
      caseId,
      vehicleId,
      freedVehicle: freeVehicle
    };
    
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Error removing driver:', err.message);
    throw err;
  } finally {
    client.release();
  }
}

// Command line usage
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.length < 1) {
    console.error('Usage: node database/remove-driver.js <caseId> [--free-vehicle]');
    console.error('\nOptions:');
    console.error('  <caseId>        - The case ID to remove driver from');
    console.error('  --free-vehicle  - Also mark vehicle as available (optional)');
    console.error('\nExamples:');
    console.error('  node database/remove-driver.js 5');
    console.error('    (Removes driver, keeps vehicle assigned)');
    console.error('  node database/remove-driver.js 5 --free-vehicle');
    console.error('    (Removes driver AND frees the vehicle)');
    process.exit(1);
  }
  
  const caseId = parseInt(args[0]);
  const freeVehicle = args.includes('--free-vehicle');
  
  removeDriver(caseId, freeVehicle)
    .then(() => {
      console.log('\n✅ Done!');
      process.exit(0);
    })
    .catch(err => {
      console.error('\n❌ Failed:', err.message);
      process.exit(1);
    });
}

module.exports = { removeDriver };

