const { query } = require('./config/db');
const fs = require('fs');

async function checkWeekly() {
    let output = '';
    try {
        output += '--- CASES THIS WEEK (Dec 15 - Dec 23) ---\n';
        const res = await query(`
            SELECT id, deceased_name, casket_type, casket_colour, funeral_date, branch 
            FROM cases 
            WHERE funeral_date >= '2025-12-15' AND funeral_date <= '2025-12-23'
            ORDER BY funeral_date
        `);

        output += `${res.rowCount} cases found for this week.\n`;

        res.rows.forEach(c => {
            output += `[${c.id}] ${c.deceased_name} | Type: ${c.casket_type || 'N/A'} | Color: ${c.casket_colour || 'N/A'} | Branch: ${c.branch || 'N/A'}\n`;
        });

        output += '\n--- SEARCHING FOR "ESAIAH" SPECIFICALLY ---\n';
        const search = await query("SELECT id, deceased_name, casket_type, casket_colour, funeral_date FROM cases WHERE deceased_name ILIKE '%ESAIAH%'");
        search.rows.forEach(s => output += `FOUND ESAIAH: [${s.id}] ${s.deceased_name} | Type: ${s.casket_type} | Val: ${s.casket_colour}\n`);

    } catch (err) {
        output += err.toString();
    }
    fs.writeFileSync('weekly_log.txt', output);
    process.exit();
}

checkWeekly();
