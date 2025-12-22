const { query } = require('./config/db');

// Silence console.log from db.js
const originalLog = console.log;
console.log = function () { };

async function fixColors() {
    try {
        // Restore log for my messages
        console.error('--- FIXING PONGEE COLORS ---');

        // 1. Find Case MOFOKENG ESAIAH
        const caseRes = await query("SELECT id, case_number, deceased_name FROM cases WHERE deceased_name ILIKE '%MOFOKENG%' AND deceased_name ILIKE '%ESAIAH%'");
        if (caseRes.rows.length > 0) {
            const c = caseRes.rows[0];
            console.error(`FOUND CASE: ${c.deceased_name} (ID: ${c.id})`);

            // Update case
            await query(
                "UPDATE cases SET casket_type = 'Pongee', casket_colour = 'Ash', updated_at = NOW() WHERE id = $1",
                [c.id]
            );
            console.error(`✅ Upated case ${c.id} to Pongee (Ash)`);
        } else {
            console.error('❌ Case MOFOKENG ESAIAH not found');
        }

        // 2. Ensure Inventory Items Exist
        // Check for Pongee Ash
        let ashRes = await query("SELECT id FROM inventory WHERE name ILIKE '%Pongee%' AND (color ILIKE 'Ash' OR name ILIKE '%Ash%')");
        if (ashRes.rows.length === 0) {
            console.error('Creating Pongee (Ash) inventory item...');
            await query("INSERT INTO inventory (name, category, stock_quantity, color, location) VALUES ($1, $2, $3, $4, $5)",
                ['Pongee', 'coffin', 0, 'Ash', 'Manekeng']
            );
        } else {
            console.error('✅ Pongee (Ash) exists');
        }

        // Check for Pongee Cherry
        let cherryRes = await query("SELECT id FROM inventory WHERE name ILIKE '%Pongee%' AND (color ILIKE 'Cherry' OR name ILIKE '%Cherry%')");
        if (cherryRes.rows.length === 0) {
            console.error('Creating Pongee (Cherry) inventory item...');
            await query("INSERT INTO inventory (name, category, stock_quantity, color, location) VALUES ($1, $2, $3, $4, $5)",
                ['Pongee', 'coffin', 0, 'Cherry', 'Manekeng']
            );
        } else {
            console.error('✅ Pongee (Cherry) exists');
        }

    } catch (err) {
        console.error('ERROR:', err);
    }
    process.exit();
}

fixColors();
