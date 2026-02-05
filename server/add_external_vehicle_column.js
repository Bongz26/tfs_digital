const { query } = require('./config/db');

async function addExternalVehicleColumn() {
    try {
        console.log("Adding external_vehicle column to roster table...");
        await query("ALTER TABLE roster ADD COLUMN IF NOT EXISTS external_vehicle TEXT");
        console.log("Column added successfully.");
        process.exit(0);
    } catch (e) {
        console.error("Error adding column:", e);
        process.exit(1);
    }
}

addExternalVehicleColumn();
