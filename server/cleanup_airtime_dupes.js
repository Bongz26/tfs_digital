const { query } = require('./config/db');

async function cleanupAirtime() {
    try {
        console.log("Cleaning up duplicate pending airtime requests...");

        // Find policy numbers with multiple pending requests
        const res = await query(`
            SELECT policy_number, COUNT(*) as count
            FROM airtime_requests
            WHERE status = 'pending'
            GROUP BY policy_number
            HAVING COUNT(*) > 1
        `);

        const duplicates = res.rows;
        console.log(`Found ${duplicates.length} policies with duplicates.`);

        for (const row of duplicates) {
            const { policy_number } = row;
            // Get all pending IDs for this policy, ordered by requested_at DESC (keep latest)
            const details = await query(`
                SELECT id 
                FROM airtime_requests 
                WHERE policy_number = $1 AND status = 'pending'
                ORDER BY requested_at DESC
            `, [policy_number]);

            // Keep the first one (latest), delete the rest
            const [keep, ...remove] = details.rows;

            if (remove.length > 0) {
                const removeIds = remove.map(r => r.id);
                console.log(`Policy ${policy_number}: Keeping ID ${keep.id}, deleting IDs ${removeIds.join(', ')}`);

                await query(`
                    DELETE FROM airtime_requests
                    WHERE id = ANY($1::int[])
                `, [removeIds]);
            }
        }

        console.log("Cleanup complete.");
        process.exit(0);
    } catch (e) {
        console.error("Cleanup failed:", e);
        process.exit(1);
    }
}

cleanupAirtime();
