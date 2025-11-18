// Quick script to check drivers table status
require('dotenv').config();
const { query, getClient } = require('../config/db');

const checkDrivers = async () => {
  const client = await getClient();
  
  try {
    console.log('🔍 Checking drivers table...\n');
    
    // Check if table exists
    const tableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'drivers'
      )
    `);
    
    if (!tableCheck.rows[0].exists) {
      console.log('❌ Drivers table does NOT exist!\n');
      console.log('💡 Run: node database/setup-drivers.js');
      process.exit(1);
    }
    
    console.log('✅ Drivers table exists\n');
    
    // Check row count
    const countResult = await client.query('SELECT COUNT(*) as count FROM drivers');
    const count = parseInt(countResult.rows[0].count);
    console.log(`📊 Total drivers in database: ${count}\n`);
    
    if (count === 0) {
      console.log('⚠️  Table is empty!\n');
      console.log('💡 Run: node database/setup-drivers.js');
      process.exit(1);
    }
    
    // Check active drivers
    const activeResult = await client.query('SELECT COUNT(*) as count FROM drivers WHERE active = true');
    const activeCount = parseInt(activeResult.rows[0].count);
    console.log(`✅ Active drivers: ${activeCount}\n`);
    
    // Show all drivers
    const drivers = await client.query(`
      SELECT id, name, contact, active 
      FROM drivers 
      ORDER BY name
    `);
    
    console.log('📋 All drivers:\n');
    drivers.rows.forEach(d => {
      const status = d.active ? '✓ Active' : '✗ Inactive';
      console.log(`   ${d.id}. ${d.name} ${d.contact ? `(${d.contact})` : ''} - ${status}`);
    });
    
    console.log('\n✅ Drivers table is set up correctly!');
    console.log('\n💡 If dropdown is still empty, check:');
    console.log('   1. Browser console for API errors');
    console.log('   2. Server logs for /api/drivers endpoint');
    console.log('   3. Network tab to see the API response');
    
  } catch (error) {
    console.error('❌ Error checking drivers:', error.message);
    console.error('Error details:', error);
    process.exit(1);
  } finally {
    client.release();
  }
};

if (require.main === module) {
  checkDrivers()
    .then(() => process.exit(0))
    .catch(err => {
      console.error(err);
      process.exit(1);
    });
}

module.exports = { checkDrivers };

