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
        ['T MOFOKENG', '0821234567'],
        ['T KHESA', '0834567890'],
        ['S KHESA', '0834567890'],
        ['S MOLEFE', '0845678901'],
        ['M LEKHOABA', '0856789012'],
        ['MOLOI', '0867890123'],
        ['L SIBEKO', '0878901234'],
        ['T MOTAUNG', '0878901234'],
        ['J MOFOKENG', '0878901234'],
        ['T NTLERU', '0834567890'],
        ['MJ RAMPETA', '0834567890']
      ];
      
      for (const [name, contact] of defaultDrivers) {
        try {
          await client.query(`
            INSERT INTO drivers (name, contact, active)
            VALUES ($1, $2, true)
            ON CONFLICT (name) DO NOTHING
          `, [name, contact]);
          console.log(`✅ Added: ${name}`);
        } catch (error) {
          console.log(`⏭️  ${name} - Already exists or error`);
        }
      }
      
      console.log('\n✅ Default drivers inserted\n');
    }
    
    // Show all drivers
    const drivers = await client.query(`
      SELECT id, name, contact, active 
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

