
const { query } = require('../config/db');

async function addBurialPlace() {
    try {
        console.log('Checking for burial_place column...');
        const check = await query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'cases' AND column_name = 'burial_place'
    `);

        if (check.rows.length === 0) {
            console.log('Adding burial_place column to cases table...');
            await query(`ALTER TABLE cases ADD COLUMN burial_place VARCHAR(255)`);
            console.log('Column added successfully.');
        } else {
            console.log('Column burial_place already exists.');
        }
    } catch (err) {
        console.error('Error adding column:', err);
    } finally {
        process.exit();
    }
}

addBurialPlace();
