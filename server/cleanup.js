const { query } = require('./config/db');

async function cleanOrphans() {
    try {
        console.log('Cleaning orphan stock movements from today...');
        const res = await query(`
            DELETE FROM stock_movements 
            WHERE case_id IS NULL 
            AND created_at >= '2025-12-15 00:00:00'
            AND inventory_id IN (SELECT id FROM inventory WHERE category = 'coffin')
            RETURNING id, inventory_id, quantity_change
        `);

        console.log(`Deleted ${res.rowCount} orphan movements.`);

        // Revert the stock deduction?
        // Ideally yes, because "deleting the movement" implies it never happened.
        // But if I just delete the LOG, the STOCK is still down.
        // So I must also increment the stock back.

        for (const row of res.rows) {
            // Quantity change was likely -1. So we add back abs(change) or just -= change
            // If change was -1, stock went down. To Revert, we add 1.
            // new_stock = old_stock - (-1) = old_stock + 1.
            // Wait, updateStockQuantity handles setting absolute value.
            // I should just Run UPDATE on inventory.

            const revertQty = -1 * row.quantity_change;
            console.log(`Reverting stock for item ${row.inventory_id} by ${revertQty}`);

            await query(`
                UPDATE inventory 
                SET stock_quantity = stock_quantity + $1 
                WHERE id = $2
            `, [revertQty, row.inventory_id]);
        }

        console.log('Done.');
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

cleanOrphans();
