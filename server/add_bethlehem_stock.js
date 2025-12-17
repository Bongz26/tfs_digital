const { query } = require('./config/db');

async function addBethlehemStock() {
    const location = 'Bethlehem Branch';
    const items = [
        { name: 'Flat Lid Midbrown', model: 'Flat Lid', color: 'Midbrown', qty: 1 },
        { name: 'Flat Lid Grain', model: 'Flat Lid', color: 'Grain', qty: 1 },
        { name: 'Flat Lid Cherry', model: 'Flat Lid', color: 'Cherry', qty: 1 },
        { name: 'Flat Lid Kiaat', model: 'Flat Lid', color: 'Kiaat', qty: 1 },
        { name: 'Octagonal Casket Redwood', model: 'Octagonal Casket', color: 'Redwood', qty: 1 },
        { name: 'Spider Casket Redwood', model: 'Spider Casket', color: 'Redwood', qty: 1 },
        { name: 'Pongee White', model: 'Pongee', color: 'White', qty: 1 },
        { name: 'Pongee Redwood', model: 'Pongee', color: 'Redwood', qty: 1 },
        { name: 'Raised Half View', model: 'Raised Half View', color: null, qty: 1 },
        { name: '4 Tier', model: '4 Tier', color: null, qty: 1 },
        { name: '3 Tier Redwood', model: '3 Tier', color: 'Redwood', qty: 2 },
        { name: 'Balmoral Dome', model: 'Balmoral Dome', color: null, qty: 1 },
        { name: 'Lapita Dome', model: 'Lapita Dome', color: null, qty: 1 },
    ];

    try {
        console.log(`Adding stock for ${location}...`);

        for (const item of items) {
            // Check if item exists in this location
            const res = await query(`
                SELECT id, stock_quantity 
                FROM inventory 
                WHERE name = $1 AND location = $2
            `, [item.name, location]);

            if (res.rows.length > 0) {
                // Update existing
                const current = res.rows[0];
                await query(`
                    UPDATE inventory 
                    SET stock_quantity = stock_quantity + $1, updated_at = NOW()
                    WHERE id = $2
                `, [item.qty, current.id]);
                console.log(`Updated ${item.name}: +${item.qty} (New Total: ${current.stock_quantity + item.qty})`);
            } else {
                // Insert new
                await query(`
                    INSERT INTO inventory (name, model, color, stock_quantity, location, created_at, updated_at)
                    VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
                `, [item.name, item.model, item.color, item.qty, location]);
                console.log(`Created ${item.name}: set to ${item.qty}`);
            }
        }

        console.log("Stock update complete.");
        process.exit(0);
    } catch (e) {
        console.error("Stock update failed:", e);
        process.exit(1);
    }
}

addBethlehemStock();
