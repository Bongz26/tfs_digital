const { query } = require('./config/db');

async function cleanupAllDuplicates() {
    try {
        console.log("Searching for exact duplicates in airtime_requests (ignoring status)...");

        // Find groups of records that are identical in key fields
        // We group by policy_number and requested_at (down to the second)
        const res = await query(`
            SELECT policy_number, requested_at, COUNT(*) as count
            FROM airtime_requests
            GROUP BY policy_number, requested_at
            HAVING COUNT(*) > 1
        `);

        console.log(`Found ${res.rows.length} sets of duplicates.`);

        for (const row of res.rows) {
            const { policy_number, requested_at } = row;

            // Fetch all IDs for this specific duplicate set
            const items = await query(`
                SELECT id, status, requested_at 
                FROM airtime_requests 
                WHERE policy_number = $1 
                AND requested_at = $2
                ORDER BY id DESC
            `, [policy_number, requested_at]);

            // Keep the first one (latest ID), delete the rest
            const [keep, ...remove] = items.rows;

            if (remove.length > 0) {
                const removeIds = remove.map(r => r.id);
                console.log(`Policy ${policy_number} at ${new Date(requested_at).toLocaleString()}: Keeping ID ${keep.id} (${keep.status}), deleting ${removeIds.length} duplicates: ${removeIds.join(', ')}`);

                await query(`
                    DELETE FROM airtime_requests
                    WHERE id = ANY($1::int[])
                `, [removeIds]);
            }
        }

        console.log("Cleanup complete.");
        process.exit(0);
    } catch (e) {
        console.error("Error during cleanup:", e);
        process.exit(1);
    }
}

cleanupAllDuplicates();
