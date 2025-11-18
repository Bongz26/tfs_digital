// server/database/insert-vehicles.js
// Script to insert real vehicle data into the database
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { query } = require('../config/db');

const insertVehicles = async (vehicles) => {
  try {
    console.log('🚗 Starting vehicle data insertion...');
    console.log(`📊 Inserting ${vehicles.length} vehicles...\n`);
    
    let successCount = 0;
    let errorCount = 0;
    
    for (const vehicle of vehicles) {
      try {
        // Validate required fields
        if (!vehicle.reg_number || !vehicle.type) {
          console.error(`❌ Skipping vehicle: Missing reg_number or type`);
          errorCount++;
          continue;
        }

        // Validate type
        const validTypes = ['fortuner', 'vito', 'v_class', 'truck', 'q7', 'hilux'];
        if (!validTypes.includes(vehicle.type)) {
          console.error(`❌ Invalid type for ${vehicle.reg_number}: ${vehicle.type}`);
          console.error(`💡 Valid types are: ${validTypes.join(', ')}`);
          errorCount++;
          continue;
        }

        // Convert empty strings to null
        const driver_contact = vehicle.driver_contact && vehicle.driver_contact.trim() !== '' 
          ? vehicle.driver_contact.trim() 
          : null;
        const current_location = vehicle.current_location && vehicle.current_location.trim() !== '' 
          ? vehicle.current_location.trim() 
          : null;
        const last_service = vehicle.last_service && vehicle.last_service.trim() !== '' 
          ? vehicle.last_service.trim() 
          : null;

        const result = await query(
          `INSERT INTO vehicles (reg_number, type, driver_name, driver_contact, available, current_location, last_service)
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           ON CONFLICT (reg_number) 
           DO UPDATE SET
             type = EXCLUDED.type,
             driver_name = EXCLUDED.driver_name,
             driver_contact = EXCLUDED.driver_contact,
             available = EXCLUDED.available,
             current_location = EXCLUDED.current_location,
             last_service = EXCLUDED.last_service
           RETURNING *`,
          [
            vehicle.reg_number.trim(),
            vehicle.type,
            vehicle.driver_name || null,
            driver_contact,
            vehicle.available !== undefined ? vehicle.available : true,
            current_location,
            last_service
          ]
        );
        console.log(`✅ ${vehicle.reg_number} - ${vehicle.type} (${vehicle.driver_name || 'No driver'})`);
        successCount++;
      } catch (error) {
        console.error(`❌ Error inserting ${vehicle.reg_number}:`, error.message);
        errorCount++;
      }
    }
    
    console.log(`\n📊 Summary: ${successCount} successful, ${errorCount} errors`);
    console.log('✅ Vehicle data insertion completed!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error inserting vehicles:', error);
    process.exit(1);
  }
};

// Read vehicles from JSON file or use command line argument
let vehicles = [];

if (require.main === module) {
  const dataFile = path.join(__dirname, 'vehicles-data.json');
  
  if (fs.existsSync(dataFile)) {
    try {
      const fileContent = fs.readFileSync(dataFile, 'utf8');
      vehicles = JSON.parse(fileContent);
      console.log(`📁 Loaded ${vehicles.length} vehicles from vehicles-data.json\n`);
    } catch (error) {
      console.error('❌ Error reading vehicles-data.json:', error.message);
      console.error('💡 Make sure the file is valid JSON format');
      process.exit(1);
    }
  } else if (process.argv[2]) {
    // Try to parse from command line argument
    try {
      vehicles = JSON.parse(process.argv[2]);
    } catch (error) {
      console.error('❌ Error parsing vehicles data from command line:', error.message);
      process.exit(1);
    }
  } else {
    console.error('❌ No vehicles data found!');
    console.error('💡 Create a vehicles-data.json file or provide data as command line argument');
    console.error(`💡 Example file location: ${dataFile}`);
    process.exit(1);
  }
  
  insertVehicles(vehicles);
}

module.exports = { insertVehicles };

