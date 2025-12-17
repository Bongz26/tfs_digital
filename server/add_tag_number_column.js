const { query } = require('./config/db');

async function addTagNumberColumn() {
    try {
        console.log("Checking if tag_number column exists...");
        const res = await query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'repatriation_trips' AND column_name = 'tag_number'
        `);

        if (res.rows.length === 0) {
            console.log("Adding tag_number column to repatriation_trips table...");
            await query(`ALTER TABLE repatriation_trips ADD COLUMN tag_number VARCHAR(100)`);
            console.log("Column added successfully.");
        } else {
            console.log("tag_number column already exists.");
        }
        process.exit(0);
    } catch (e) {
        console.error("Error adding column:", e);
        process.exit(1);
    }
}

addTagNumberColumn();
