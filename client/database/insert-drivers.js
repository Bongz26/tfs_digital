// server/database/insert-drivers.js
// Script to insert driver data into the database
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { query } = require('../config/db');

const insertDrivers = async (drivers) => {
  try {
    console.log('👤 Starting driver data insertion...');
    console.log(`📊 Inserting ${drivers.length} drivers...\n`);
    
    let successCount = 0;
    let errorCount = 0;
    
    for (const driver of drivers) {
      try {
        // Validate required fields
        if (!driver.name) {
          console.error(`❌ Skipping driver: Missing name`);
          errorCount++;
          continue;
        }

        const result = await query(
          `INSERT INTO drivers (name, contact, active)
           VALUES ($1, $2, $3)
           ON CONFLICT (name) DO NOTHING
           RETURNING *`,
          [
            driver.name.trim(),
            driver.contact && driver.contact.trim() !== '' ? driver.contact.trim() : null,
            driver.active !== undefined ? driver.active : true
          ]
        );
        
        if (result.rows.length > 0) {
          console.log(`✅ ${driver.name} - ${driver.contact || 'No contact'}`);
          successCount++;
        } else {
          console.log(`⏭️  ${driver.name} - Already exists, skipped`);
        }
      } catch (error) {
        console.error(`❌ Error inserting ${driver.name}:`, error.message);
        errorCount++;
      }
    }
    
    console.log(`\n📊 Summary: ${successCount} successful, ${errorCount} errors`);
    console.log('✅ Driver data insertion completed!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error inserting drivers:', error);
    process.exit(1);
  }
};

// Read drivers from JSON file
if (require.main === module) {
  const dataFile = path.join(__dirname, 'drivers-data.json');
  
  if (fs.existsSync(dataFile)) {
    try {
      const fileContent = fs.readFileSync(dataFile, 'utf8');
      const drivers = JSON.parse(fileContent);
      console.log(`📁 Loaded ${drivers.length} drivers from drivers-data.json\n`);
      insertDrivers(drivers);
    } catch (error) {
      console.error('❌ Error reading drivers-data.json:', error.message);
      console.error('💡 Make sure the file is valid JSON format');
      process.exit(1);
    }
  } else {
    console.error('❌ No drivers data found!');
    console.error('💡 Create a drivers-data.json file');
    console.error(`💡 Example file location: ${dataFile}`);
    process.exit(1);
  }
}

module.exports = { insertDrivers };

