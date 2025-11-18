// Script to check and setup drivers table
require('dotenv').config();
const { query, getClient } = require('../config/db');

const setupDrivers = async () => {
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
      console.log('⚠️  Drivers table does not exist');
      console.log('📝 Creating drivers table...\n');
      
      await client.query(`
        CREATE TABLE drivers (
          id SERIAL PRIMARY KEY,
          name VARCHAR(100) NOT NULL UNIQUE,
          contact VARCHAR(15),
          license_number VARCHAR(20),
          active BOOLEAN DEFAULT TRUE,
          created_at TIMESTAMP DEFAULT NOW()
        )
      `);
      
      console.log('✅ Drivers table created\n');
    } else {
      console.log('✅ Drivers table exists\n');
    }
    
    // Check if table has data
    const countResult = await client.query('SELECT COUNT(*) as count FROM drivers');
    const count = parseInt(countResult.rows[0].count);
    
    console.log(`📊 Current drivers in database: ${count}\n`);
    
    if (count === 0) {
      console.log('⚠️  No drivers found. Inserting default drivers...\n');
      
      const defaultDrivers = [
        ['Sipho Mthembu', '0821234567', 'DL123456'],
        ['Thabo Nkosi', '0834567890', 'DL234567'],
        ['Moses Dlamini', '0845678901', 'DL345678'],
        ['Anna Khumalo', '0856789012', 'DL456789'],
        ['Jacob Mokoena', '0867890123', 'DL567890'],
        ['Peter Sithole', '0878901234', 'DL678901']
      ];
      
      for (const [name, contact, license] of defaultDrivers) {
        try {
          await client.query(`
            INSERT INTO drivers (name, contact, license_number, active)
            VALUES ($1, $2, $3, true)
            ON CONFLICT (name) DO NOTHING
          `, [name, contact, license]);
          console.log(`✅ Added: ${name}`);
        } catch (error) {
          console.log(`⏭️  ${name} - Already exists or error`);
        }
      }
      
      console.log('\n✅ Default drivers inserted\n');
    }
    
    // Show all drivers
    const drivers = await client.query(`
      SELECT id, name, contact, license_number, active 
      FROM drivers 
      ORDER BY name
    `);
    
    console.log(`📋 All drivers (${drivers.rows.length}):\n`);
    drivers.rows.forEach(d => {
      console.log(`   ${d.id}. ${d.name} ${d.contact ? `(${d.contact})` : ''} ${d.active ? '✓' : '✗'}`);
    });
    
    console.log('\n✅ Drivers setup complete!');
    
  } catch (error) {
    console.error('❌ Error setting up drivers:', error.message);
    console.error('Error details:', error);
    process.exit(1);
  } finally {
    client.release();
  }
};

if (require.main === module) {
  setupDrivers()
    .then(() => process.exit(0))
    .catch(err => {
      console.error(err);
      process.exit(1);
    });
}

module.exports = { setupDrivers };

