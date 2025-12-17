const { query } = require('../server/config/db');

async function fixMissingPongee() {
    console.log('🛠 Fixing missing Pongee Redwood stock...');

    // 1. Add the stock (Opening Balance = 2)
    const insert = await query(`
        INSERT INTO inventory (name, category, stock_quantity, unit_price, min_quantity)
        VALUES ('Pongee Redwood', 'coffin', 2, 0, 1)
        RETURNING id
    `);
    const itemId = insert.rows[0].id;
    console.log(`✅ Created "Pongee Redwood" with Qty: 2 (ID: ${itemId})`);

    // 2. Deduct 1 for the missing case (#57)
    await query('UPDATE inventory SET stock_quantity = stock_quantity - 1 WHERE id = $1', [itemId]);
    console.log('✅ Deducted 1 stock for Case #57');

    // 3. Log the movements for audit trail
    // Opening Balance Entry
    await query(`
        INSERT INTO stock_movements (inventory_id, movement_type, quantity_change, previous_quantity, new_quantity, reason, recorded_by)
        VALUES ($1, 'adjustment', 2, 0, 2, 'Showroom Stock Fix', 'System Script')
    `, [itemId]);

    // Usage Entry
    await query(`
        INSERT INTO stock_movements (inventory_id, movement_type, quantity_change, previous_quantity, new_quantity, reason, recorded_by)
        VALUES ($1, 'sale', -1, 2, 1, 'Re-Sync Case #57', 'System Script')
    `, [itemId]);

    console.log('✅ Fix Complete. Current Pongee Redwood Stock: 1');
    process.exit(0);
}

fixMissingPongee().catch(e => console.error(e));
