const { query, getClient } = require('../config/db');

// --- GET ALL INVENTORY ---
exports.getAllInventory = async (req, res) => {
    try {
        const tableCheck = await query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'inventory'
      );
    `);

        if (!tableCheck.rows[0].exists) {
            return res.status(500).json({
                success: false,
                error: 'Database table not found',
                message: 'The inventory table does not exist.'
            });
        }

        const { category } = req.query;
        let sql = 'SELECT * FROM inventory';
        const params = [];

        if (category && category !== 'all') {
            sql += ' WHERE category = $1';
            params.push(category);
        }

        sql += ' ORDER BY category, name';

        const result = await query(sql, params);
        res.json({ success: true, inventory: result.rows || [] });
    } catch (err) {
        console.error('❌ Error fetching inventory:', err);
        res.status(500).json({ success: false, error: 'Failed to fetch inventory', details: err.message });
    }
};

// --- GET INVENTORY STATS ---
exports.getInventoryStats = async (req, res) => {
    try {
        const tableCheck = await query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'inventory'
      );
    `);

        if (!tableCheck.rows[0].exists) {
            return res.status(500).json({
                success: false,
                error: 'Database table not found',
                message: 'The inventory table does not exist.'
            });
        }

        const statsResult = await query(`
      SELECT 
        COUNT(*) as total_items,
        SUM(CASE WHEN stock_quantity <= low_stock_threshold THEN 1 ELSE 0 END) as low_stock_count,
        SUM(stock_quantity) as total_stock,
        COUNT(DISTINCT category) as categories
      FROM inventory
    `);

        const stats = statsResult.rows[0] || {
            total_items: 0,
            low_stock_count: 0,
            total_stock: 0,
            categories: 0
        };

        res.json({ success: true, stats });
    } catch (err) {
        console.error('❌ Error fetching inventory stats:', err);
        res.status(500).json({ success: false, error: 'Failed to fetch inventory stats', details: err.message });
    }
};

// --- UPDATE STOCK QUANTITY ---
exports.updateStockQuantity = async (req, res) => {
    const { id } = req.params;
    const { stock_quantity } = req.body;

    try {
        const itemResult = await query('SELECT stock_quantity, low_stock_threshold FROM inventory WHERE id=$1', [id]);
        if (!itemResult.rows.length) {
            return res.status(404).json({ success: false, error: 'Item not found' });
        }

        await query('UPDATE inventory SET stock_quantity=$1, updated_at=NOW() WHERE id=$2', [stock_quantity, id]);

        const is_low_stock = stock_quantity <= itemResult.rows[0].low_stock_threshold;
        res.json({ success: true, stock_quantity, is_low_stock });
    } catch (err) {
        console.error('❌ Error updating stock:', err);
        res.status(500).json({ success: false, error: 'Failed to update stock', details: err.message });
    }
};

// --- ADJUST STOCK ---
exports.adjustStock = async (req, res) => {
    const { id } = req.params;
    const { quantity_change, reason, case_id, recorded_by } = req.body;

    try {
        const itemResult = await query('SELECT stock_quantity, low_stock_threshold FROM inventory WHERE id=$1', [id]);
        if (!itemResult.rows.length) {
            return res.status(404).json({ success: false, error: 'Item not found' });
        }

        const previous_quantity = itemResult.rows[0].stock_quantity;
        const new_quantity = previous_quantity + quantity_change;

        await query('UPDATE inventory SET stock_quantity=$1, updated_at=NOW() WHERE id=$2', [new_quantity, id]);

        try {
            await query(
                `INSERT INTO stock_movements 
         (inventory_id, case_id, movement_type, quantity_change, previous_quantity, new_quantity, reason, recorded_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
                [id, case_id || null, 'adjustment', quantity_change, previous_quantity, new_quantity, reason || 'Manual adjustment', recorded_by || 'system']
            );
        } catch (movementErr) {
            console.warn('⚠️  Could not log stock movement:', movementErr.message);
        }

        const is_low_stock = new_quantity <= itemResult.rows[0].low_stock_threshold;
        res.json({ success: true, new_quantity, is_low_stock });
    } catch (err) {
        console.error('❌ Error adjusting stock:', err);
        res.status(500).json({ success: false, error: 'Failed to adjust stock', details: err.message });
    }
};

// --- GET OPEN STOCK TAKES ---
exports.getOpenStockTakes = async (req, res) => {
    try {
        const openTakes = await query(
            `SELECT id, taken_by, created_at, status 
       FROM stock_takes 
       WHERE status = 'in_progress' 
       ORDER BY created_at DESC`
        );
        res.json({ success: true, stock_takes: openTakes.rows });
    } catch (err) {
        console.error('❌ Error fetching open stock takes:', err);
        res.status(500).json({ success: false, error: 'Failed to fetch open stock takes', details: err.message });
    }
};

// --- START STOCK TAKE ---
exports.startStockTake = async (req, res) => {
    const { taken_by } = req.body;

    try {
        const openCount = await query(
            `SELECT COUNT(*) as count FROM stock_takes WHERE status = 'in_progress'`
        );
        const count = parseInt(openCount.rows[0].count);

        if (count >= 2) {
            return res.status(400).json({
                success: false,
                error: 'Maximum of 2 open stock take sessions allowed.',
                open_count: count
            });
        }

        const take = await query(
            `INSERT INTO stock_takes (taken_by) VALUES ($1) RETURNING id, created_at`,
            [taken_by]
        );

        await query(
            `INSERT INTO stock_take_items (stock_take_id, inventory_id, system_quantity)
       SELECT $1, i.id, i.stock_quantity 
       FROM inventory i
       RETURNING stock_take_items.*`,
            [take.rows[0].id]
        );

        const itemsWithDetails = await query(
            `SELECT 
         sti.id,
         sti.stock_take_id,
         sti.inventory_id,
         sti.system_quantity,
         sti.physical_quantity,
         sti.difference,
         sti.notes,
         sti.created_at,
         i.name,
         i.category,
         i.sku
       FROM stock_take_items sti
       INNER JOIN inventory i ON sti.inventory_id = i.id
       WHERE sti.stock_take_id = $1
       ORDER BY i.category, i.name`,
            [take.rows[0].id]
        );

        res.json({ success: true, stock_take_id: take.rows[0].id, items: itemsWithDetails.rows });
    } catch (err) {
        console.error('❌ Error starting stock take:', err);
        res.status(500).json({ success: false, error: 'Failed to start stock take', details: err.message });
    }
};

// --- UPDATE STOCK TAKE ITEM ---
exports.updateStockTakeItem = async (req, res) => {
    const { id, itemId } = req.params;
    const { physical_quantity, notes } = req.body;

    try {
        const result = await query(
            `UPDATE stock_take_items
       SET physical_quantity = $1,
           difference = $1 - system_quantity,
           notes = $2
       WHERE stock_take_id = $3 AND inventory_id = $4
       RETURNING *`,
            [physical_quantity, notes, id, itemId]
        );

        if (!result.rows.length) {
            return res.status(404).json({ success: false, error: 'Stock take item not found' });
        }

        const itemWithDetails = await query(
            `SELECT 
         sti.id,
         sti.stock_take_id,
         sti.inventory_id,
         sti.system_quantity,
         sti.physical_quantity,
         sti.difference,
         sti.notes,
         sti.created_at,
         i.name,
         i.category,
         i.sku
       FROM stock_take_items sti
       INNER JOIN inventory i ON sti.inventory_id = i.id
       WHERE sti.stock_take_id = $1 AND sti.inventory_id = $2`,
            [id, itemId]
        );

        if (!itemWithDetails.rows.length) {
            return res.status(404).json({ success: false, error: 'Stock take item not found' });
        }

        res.json({ success: true, item: itemWithDetails.rows[0] });
    } catch (err) {
        console.error('❌ Error updating stock take item:', err);
        res.status(500).json({ success: false, error: 'Failed to update count', details: err.message });
    }
};

// --- GET SPECIFIC STOCK TAKE ---
exports.getStockTake = async (req, res) => {
    const { id } = req.params;

    try {
        const takeResult = await query(
            `SELECT id, taken_by, created_at, status FROM stock_takes WHERE id = $1`,
            [id]
        );

        if (takeResult.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Stock take not found' });
        }

        const itemsWithDetails = await query(
            `SELECT 
         sti.id,
         sti.stock_take_id,
         sti.inventory_id,
         sti.system_quantity,
         sti.physical_quantity,
         sti.difference,
         sti.notes,
         sti.created_at,
         i.name,
         i.category,
         i.sku
       FROM stock_take_items sti
       INNER JOIN inventory i ON sti.inventory_id = i.id
       WHERE sti.stock_take_id = $1
       ORDER BY i.category, i.name`,
            [id]
        );

        res.json({
            success: true,
            stock_take: takeResult.rows[0],
            items: itemsWithDetails.rows
        });
    } catch (err) {
        console.error('❌ Error fetching stock take:', err);
        res.status(500).json({ success: false, error: 'Failed to fetch stock take', details: err.message });
    }
};

// --- CANCEL STOCK TAKE ---
exports.cancelStockTake = async (req, res) => {
    const { id } = req.params;

    try {
        const takeResult = await query(
            `SELECT id, status FROM stock_takes WHERE id = $1`,
            [id]
        );

        if (takeResult.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Stock take not found' });
        }

        if (takeResult.rows[0].status !== 'in_progress') {
            return res.status(400).json({
                success: false,
                error: `Cannot cancel stock take. Current status: ${takeResult.rows[0].status}`
            });
        }

        await query(
            `UPDATE stock_takes SET status = 'cancelled' WHERE id = $1`,
            [id]
        );

        res.json({ success: true, message: 'Stock take cancelled successfully' });
    } catch (err) {
        console.error('❌ Error cancelling stock take:', err);
        res.status(500).json({ success: false, error: 'Failed to cancel stock take', details: err.message });
    }
};

// --- COMPLETE STOCK TAKE ---
exports.completeStockTake = async (req, res) => {
    const { id } = req.params;
    const client = await getClient();

    try {
        await client.query('BEGIN');

        const items = await client.query(
            `SELECT * FROM stock_take_items WHERE stock_take_id = $1`,
            [id]
        );

        for (const item of items.rows) {
            if (item.physical_quantity === null) continue;

            await client.query(
                `UPDATE inventory
         SET stock_quantity = $1, updated_at = NOW()
         WHERE id = $2`,
                [item.physical_quantity, item.inventory_id]
            );

            try {
                await client.query(
                    `INSERT INTO stock_movements 
           (inventory_id, movement_type, quantity_change, previous_quantity, new_quantity, reason)
           VALUES ($1, 'adjustment', $2, $3, $4, 'Stock Take Adjustment')`,
                    [
                        item.inventory_id,
                        item.physical_quantity - item.system_quantity,
                        item.system_quantity,
                        item.physical_quantity
                    ]
                );
            } catch (movementErr) {
                console.warn('⚠️  Could not log stock movement:', movementErr.message);
            }
        }

        await client.query(
            `UPDATE stock_takes SET status='completed' WHERE id = $1`,
            [id]
        );

        await client.query('COMMIT');

        res.json({ success: true, message: 'Stock take completed', items_updated: items.rows.filter(i => i.physical_quantity !== null).length });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('❌ Error completing stock take:', err);
        res.status(500).json({ success: false, error: 'Failed to complete stock take', details: err.message });
    } finally {
        client.release();
    }
};

// --- CREATE INVENTORY ITEM ---
exports.createInventoryItem = async (req, res) => {
    const { name, category, sku, stock_quantity, unit_price, low_stock_threshold, location, notes, supplier_id } = req.body;

    if (!name) {
        return res.status(400).json({ success: false, error: 'Item name is required' });
    }

    try {
        const result = await query(
            `INSERT INTO inventory 
             (name, category, sku, stock_quantity, unit_price, low_stock_threshold, location, notes, supplier_id)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
             RETURNING *`,
            [
                name,
                category || 'other',
                sku || null,
                stock_quantity || 0,
                unit_price || 0,
                low_stock_threshold || 2,
                location || 'Manekeng',
                notes || null,
                supplier_id || null
            ]
        );

        console.log(`✅ Created inventory item: ${name}`);
        res.status(201).json({ success: true, item: result.rows[0] });
    } catch (err) {
        console.error('❌ Error creating inventory item:', err);
        
        // Handle duplicate SKU error
        if (err.code === '23505' && err.constraint?.includes('sku')) {
            return res.status(400).json({ success: false, error: 'An item with this SKU already exists' });
        }
        
        res.status(500).json({ success: false, error: 'Failed to create inventory item', details: err.message });
    }
};

// --- UPDATE INVENTORY ITEM ---
exports.updateInventoryItem = async (req, res) => {
    const { id } = req.params;
    const { name, category, sku, stock_quantity, unit_price, low_stock_threshold, location, notes, supplier_id } = req.body;

    try {
        // Check if item exists
        const existing = await query('SELECT * FROM inventory WHERE id = $1', [id]);
        if (existing.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Inventory item not found' });
        }

        const result = await query(
            `UPDATE inventory SET
                name = COALESCE($1, name),
                category = COALESCE($2, category),
                sku = COALESCE($3, sku),
                stock_quantity = COALESCE($4, stock_quantity),
                unit_price = COALESCE($5, unit_price),
                low_stock_threshold = COALESCE($6, low_stock_threshold),
                location = COALESCE($7, location),
                notes = COALESCE($8, notes),
                supplier_id = COALESCE($9, supplier_id),
                updated_at = NOW()
             WHERE id = $10
             RETURNING *`,
            [name, category, sku, stock_quantity, unit_price, low_stock_threshold, location, notes, supplier_id, id]
        );

        console.log(`✅ Updated inventory item ID ${id}`);
        res.json({ success: true, item: result.rows[0] });
    } catch (err) {
        console.error('❌ Error updating inventory item:', err);
        res.status(500).json({ success: false, error: 'Failed to update inventory item', details: err.message });
    }
};

// --- GET SINGLE INVENTORY ITEM ---
exports.getInventoryItem = async (req, res) => {
    const { id } = req.params;

    try {
        const result = await query('SELECT * FROM inventory WHERE id = $1', [id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Inventory item not found' });
        }

        res.json({ success: true, item: result.rows[0] });
    } catch (err) {
        console.error('❌ Error fetching inventory item:', err);
        res.status(500).json({ success: false, error: 'Failed to fetch inventory item', details: err.message });
    }
};

// --- DELETE INVENTORY ITEM ---
exports.deleteInventoryItem = async (req, res) => {
    const { id } = req.params;

    try {
        // Check if item exists
        const existing = await query('SELECT * FROM inventory WHERE id = $1', [id]);
        if (existing.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Inventory item not found' });
        }

        // Check if item has reservations or is in PO items
        const reservations = await query('SELECT COUNT(*) as count FROM reservations WHERE inventory_id = $1 AND released_at IS NULL', [id]);
        if (parseInt(reservations.rows[0].count) > 0) {
            return res.status(400).json({ success: false, error: 'Cannot delete item with active reservations' });
        }

        await query('DELETE FROM inventory WHERE id = $1', [id]);

        console.log(`✅ Deleted inventory item ID ${id}`);
        res.json({ success: true, message: 'Inventory item deleted successfully' });
    } catch (err) {
        console.error('❌ Error deleting inventory item:', err);
        res.status(500).json({ success: false, error: 'Failed to delete inventory item', details: err.message });
    }
};

// --- REPLACE INVENTORY WITH PRESET LIST ---
exports.replaceInventoryWithPreset = async (req, res) => {
    try {
        await query(`
            CREATE TABLE IF NOT EXISTS inventory (
              id SERIAL PRIMARY KEY,
              name VARCHAR(200) NOT NULL,
              category VARCHAR(100) DEFAULT 'other',
              sku VARCHAR(100),
              stock_quantity INT DEFAULT 0,
              unit_price DECIMAL(12,2) DEFAULT 0,
              low_stock_threshold INT DEFAULT 2,
              location VARCHAR(100) DEFAULT 'Manekeng',
              notes TEXT,
              supplier_id INT,
              created_at TIMESTAMP DEFAULT NOW(),
              updated_at TIMESTAMP DEFAULT NOW()
            )
        `);

        await query(`ALTER TABLE inventory ADD COLUMN IF NOT EXISTS model VARCHAR(100)`);
        await query(`ALTER TABLE inventory ADD COLUMN IF NOT EXISTS color VARCHAR(50)`);
        try { await query(`CREATE INDEX IF NOT EXISTS idx_inventory_model_color ON inventory (UPPER(model), UPPER(color))`); } catch (_) {}
        try { await query(`ALTER TABLE inventory ALTER COLUMN low_stock_threshold SET DEFAULT 1`); } catch (_) {}

        const items = [
            { model: 'Pierce Dome', color: null, qty: 3, category: 'coffin' },
            { model: 'Octagonal', color: null, qty: 1, category: 'coffin' },
            { model: 'Ponge', color: 'Cherry', qty: 3, category: 'coffin' },
            { model: 'Ponge', color: 'Plywood', qty: 3, category: 'coffin' },
            { model: 'Ilu View', color: null, qty: 3, category: 'coffin' },
            { model: 'Raised Haunew', color: null, qty: 4, category: 'coffin' },
            { model: 'Tier Casket', color: null, qty: 4, category: 'coffin' },
            { model: 'Flat Top', color: 'Plywood', qty: 1, category: 'coffin' },
            { model: 'Tier Plywood', color: null, qty: 1, category: 'coffin' },
            { model: 'Yreat Flio', color: null, qty: 2, category: 'coffin' },
            { model: 'Fluo', color: 'Spain', qty: 1, category: 'coffin' },
            { model: 'Fluo', color: 'Cherry', qty: 1, category: 'coffin' },
            { model: 'Econo', color: 'Cherry', qty: 2, category: 'coffin' },
            { model: 'Fluo', color: 'Midbrain', qty: 1, category: 'coffin' },
            { model: 'Fluo', color: 'Princeton', qty: 15, category: 'coffin' },
            { model: 'Blood Coffin', color: null, qty: 3, category: 'coffin' },
            { model: 'Kreat Coffin', color: null, qty: 1, category: 'coffin' },
            { model: 'Kreat Coffin', color: null, qty: 2, category: 'coffin' },
            { model: 'Kreat Casket', color: null, qty: 3, category: 'coffin' },
            { model: 'White Casket', color: null, qty: 1, category: 'coffin' },
            { model: 'Kreat Dutch', color: null, qty: 1, category: 'coffin' },
            { model: 'Ucornee Wood', color: 'Walnut', qty: 1, category: 'coffin' },
            { model: 'Kreat', color: null, qty: 1, category: 'coffin' },
            { model: 'Feet', color: null, qty: 4, category: 'coffin' }
        ];

        await query('TRUNCATE inventory RESTART IDENTITY CASCADE');

        for (const it of items) {
            const name = it.color ? `${it.model} ${it.color}` : it.model;
            await query(
                `INSERT INTO inventory (name, category, sku, stock_quantity, unit_price, low_stock_threshold, location, model, color)
                 VALUES ($1,$2,$3,$4,$5,1,$7,$8,$9)`,
                [
                    name,
                    it.category,
                    null,
                    it.qty,
                    0,
                    'Manekeng',
                    it.model,
                    it.color || null
                ]
            );
        }

        const result = await query('SELECT * FROM inventory ORDER BY category, name');
        res.json({ success: true, replaced: items.length, inventory: result.rows });
    } catch (err) {
        console.error('❌ Error replacing inventory:', err);
        res.status(500).json({ success: false, error: 'Failed to replace inventory', details: err.message });
    }
};
