const { query } = require('./config/db');

async function fixWeekly() {
    try {
        console.log('--- FIXING WEEKLY CASE COLORS ---');

        // 1. Update HQ Cases to Cherry (IDs: 71, 81, 82, 83)
        const cherryIds = [71, 81, 82, 83];
        for (const id of cherryIds) {
            await query("UPDATE cases SET casket_colour = 'Cherry' WHERE id = $1", [id]);
            console.log(`Updated Case ${id} to Cherry`);
        }

        // 2. Update Mofokeng Esaiah to Ash (ID: 80)
        await query("UPDATE cases SET casket_colour = 'Ash' WHERE id = 80");
        console.log(`Updated Case 80 to Ash`);

        console.log('--- DONE ---');

    } catch (err) {
        console.error(err);
    }
    process.exit();
}

fixWeekly();
