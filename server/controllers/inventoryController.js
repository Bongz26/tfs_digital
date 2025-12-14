const { query, getClient } = require('../config/db');
const nodemailer = require('nodemailer');

async function maybeNotifyLowStock(threshold = 1) {
    try {
        const to = process.env.INVENTORY_ALERTS_TO || process.env.ALERTS_TO || process.env.AIRTIME_OPERATOR_EMAIL;
        const host = process.env.SMTP_HOST;
        const port = parseInt(process.env.SMTP_PORT || '587', 10);
        const user = process.env.SMTP_USER;
        const pass = process.env.SMTP_PASS;
        if (!to || !host || !user || !pass) return;
        const rows = await query(`
            SELECT id, name, category, sku, stock_quantity, COALESCE(reserved_quantity,0) AS reserved_quantity,
                   low_stock_threshold, location, model, color
            FROM inventory
            ORDER BY category, name
        `);
        const items = (rows.rows || []).map(r => ({
            ...r,
            available_quantity: (r.stock_quantity || 0) - (r.reserved_quantity || 0)
        })).filter(r => r.available_quantity <= threshold);
        if (items.length === 0) return;
        const transporter = nodemailer.createTransport({ host, port, secure: port === 465, auth: { user, pass } });
        const from = process.env.ALERTS_FROM || user;
        const subject = `Low Stock Alert: ${items.length} item(s) at qty ≤ ${threshold}`;
        const htmlRows = items.map(i => `
            <tr>
              <td style="padding:6px;border:1px solid #ddd;">${i.name}${i.color ? ' • ' + i.color : ''}</td>
              <td style="padding:6px;border:1px solid #ddd;">${i.category}</td>
              <td style="padding:6px;border:1px solid #ddd;">${i.stock_quantity}</td>
              <td style="padding:6px;border:1px solid #ddd;">${i.reserved_quantity}</td>
              <td style="padding:6px;border:1px solid #ddd;">${i.available_quantity}</td>
              <td style="padding:6px;border:1px solid #ddd;">Threshold ${i.low_stock_threshold}</td>
            </tr>
        `).join('');
        const html = `
          <div style="font-family:Segoe UI,Arial,sans-serif;font-size:14px;color:#222;">
            <p>Low stock items at or below ${threshold} available:</p>
            <table style="border-collapse:collapse;min-width:520px;">
              <thead>
                <tr>
                  <th style="padding:6px;border:1px solid #ddd;background:#f8f8f8;">Item</th>
                  <th style="padding:6px;border:1px solid #ddd;background:#f8f8f8;">Category</th>
                  <th style="padding:6px;border:1px solid #ddd;background:#f8f8f8;">Stock</th>
                  <th style="padding:6px;border:1px solid #ddd;background:#f8f8f8;">Reserved</th>
                  <th style="padding:6px;border:1px solid #ddd;background:#f8f8f8;">Available</th>
                  <th style="padding:6px;border:1px solid #ddd;background:#f8f8f8;">Status</th>
                </tr>
              </thead>
              <tbody>
                ${htmlRows}
              </tbody>
            </table>
          </div>
        `;
        const text = items.map(i => `${i.name} ${i.color || ''} | ${i.category} | stock=${i.stock_quantity} reserved=${i.reserved_quantity} available=${i.available_quantity} threshold=${i.low_stock_threshold}`).join('\n');
        await transporter.sendMail({ from, to, subject, text, html });
    } catch (_) { }
}

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

exports.getLowStockDetailed = async (req, res) => {
    try {
        const tableCheck = await query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'inventory'
      );
    `);
        if (!tableCheck.rows[0].exists) {
            return res.status(500).json({ success: false, error: 'Database table not found' });
        }
        const { category } = req.query;
        const params = [];
        let sql = `SELECT id, name, category, sku, stock_quantity, reserved_quantity, low_stock_threshold, location, notes, model, color
                   FROM inventory`;
        if (category && category !== 'all') {
            sql += ` WHERE category = $1`;
            params.push(category);
        }
        sql += ` ORDER BY category, name`;
        const result = await query(sql, params);
        const rows = (result.rows || []).map(r => ({
            ...r,
            available_quantity: (r.stock_quantity || 0) - (r.reserved_quantity || 0),
            is_low_stock: ((r.stock_quantity || 0) - (r.reserved_quantity || 0)) <= (r.low_stock_threshold || 0)
        })).filter(r => r.is_low_stock);
        res.json({ success: true, items: rows });
    } catch (err) {
        res.status(500).json({ success: false, error: 'Failed to fetch low stock', details: err.message });
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

        const previous = itemResult.rows[0].stock_quantity;
        await query('UPDATE inventory SET stock_quantity=$1, updated_at=NOW() WHERE id=$2', [stock_quantity, id]);

        try {
            const change = (parseInt(stock_quantity, 10) || 0) - (parseInt(previous, 10) || 0);
            await query(
                `INSERT INTO stock_movements 
                 (inventory_id, case_id, movement_type, quantity_change, previous_quantity, new_quantity, reason, recorded_by)
                 VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
                [id, null, 'adjustment', change, previous, stock_quantity, 'Manual update', (req.user?.email) || 'system']
            );
        } catch (movementErr) {
            console.warn('⚠️  Could not log stock movement (updateStockQuantity):', movementErr.message);
        }

        const is_low_stock = stock_quantity <= itemResult.rows[0].low_stock_threshold;
        try { await maybeNotifyLowStock(1); } catch (_) {}
        res.json({ success: true, stock_quantity, is_low_stock });
    } catch (err) {
        console.error('❌ Error updating stock:', err);
        res.status(500).json({ success: false, error: 'Failed to update stock', details: err.message });
    }
};

// --- ADJUST STOCK ---
exports.adjustStock = async (req, res) => {
    const { id } = req.params;
    const { quantity_change, reason, case_id, recorded_by, movement_type } = req.body;

    try {
        const itemResult = await query('SELECT stock_quantity, low_stock_threshold FROM inventory WHERE id=$1', [id]);
        if (!itemResult.rows.length) {
            return res.status(404).json({ success: false, error: 'Item not found' });
        }

        const previous_quantity = itemResult.rows[0].stock_quantity;
        const new_quantity = previous_quantity + quantity_change;

        await query('UPDATE inventory SET stock_quantity=$1, updated_at=NOW() WHERE id=$2', [new_quantity, id]);

        try {
            const mType = (String(movement_type || '').toLowerCase() === 'sale') ? 'sale' : 'adjustment';
            await query(
                `INSERT INTO stock_movements 
         (inventory_id, case_id, movement_type, quantity_change, previous_quantity, new_quantity, reason, recorded_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
                [id, case_id || null, mType, quantity_change, previous_quantity, new_quantity, reason || 'Manual adjustment', recorded_by || 'system']
            );
        } catch (movementErr) {
            console.warn('⚠️  Could not log stock movement:', movementErr.message);
        }

        const is_low_stock = new_quantity <= itemResult.rows[0].low_stock_threshold;
        try { await maybeNotifyLowStock(1); } catch (_) {}
        res.json({ success: true, new_quantity, is_low_stock });
    } catch (err) {
        console.error('❌ Error adjusting stock:', err);
        res.status(500).json({ success: false, error: 'Failed to adjust stock', details: err.message });
    }
};

exports.getStockMovements = async (req, res) => {
    try {
        const { category = 'coffin', from, to, limit = 500 } = req.query;
        let hasCaseId = true;
        try {
            const col = await query(`
              SELECT EXISTS (
                SELECT FROM information_schema.columns 
                WHERE table_schema = 'public' 
                  AND table_name = 'stock_movements' 
                  AND column_name = 'case_id'
              ) AS exists
            `);
            hasCaseId = !!(col.rows[0] && col.rows[0].exists);
            if (!hasCaseId) {
                try {
                    await query(`ALTER TABLE stock_movements ADD COLUMN case_id INT REFERENCES cases(id)`);
                    hasCaseId = true;
                } catch (_) {}
            }
        } catch (_) {}
        const params = [];
        let where = 'WHERE 1=1';
        if (category && category !== 'all') {
            where += ' AND inv.category = $' + (params.push(category));
        }
        if (from) {
            where += ' AND sm.created_at >= $' + (params.push(from));
        }
        if (to) {
            where += ' AND sm.created_at <= $' + (params.push(to));
        }
        const sql = `
            SELECT 
              sm.id,
              sm.inventory_id,
              ${hasCaseId ? 'sm.case_id' : 'NULL AS case_id'},
              sm.movement_type,
              sm.quantity_change,
              sm.previous_quantity,
              sm.new_quantity,
              sm.reason,
              sm.recorded_by,
              sm.created_at,
              inv.name,
              inv.model,
              inv.color,
              inv.location,
              inv.category,
              inv.sku,
              inv.stock_quantity,
              ${hasCaseId ? 'c.case_number' : 'NULL AS case_number'},
              ${hasCaseId ? 'c.deceased_name' : 'NULL AS deceased_name'}
            FROM stock_movements sm
            JOIN inventory inv ON sm.inventory_id = inv.id
            ${hasCaseId ? 'LEFT JOIN cases c ON sm.case_id = c.id' : ''}
            ${where}
            ORDER BY sm.created_at DESC
            LIMIT ${Math.max(1, Math.min(parseInt(limit, 10) || 500, 2000))}
        `;
        const result = await query(sql, params);
        res.json({ success: true, movements: result.rows || [] });
    } catch (err) {
        res.status(500).json({ success: false, error: 'Failed to fetch stock movements', details: err.message });
    }
};

exports.getCoffinUsageByCase = async (req, res) => {
    try {
        let hasMovementsTable = true;
        try {
            const t = await query(`
              SELECT EXISTS (
                SELECT FROM pg_tables
                WHERE schemaname = 'public' AND tablename = 'stock_movements'
              ) AS exists
            `);
            hasMovementsTable = !!(t.rows[0] && t.rows[0].exists);
            if (!hasMovementsTable) {
                try {
                    await query(`
                      CREATE TABLE IF NOT EXISTS stock_movements (
                        id SERIAL PRIMARY KEY,
                        inventory_id INT NOT NULL REFERENCES inventory(id),
                        case_id INT REFERENCES cases(id),
                        movement_type TEXT NOT NULL,
                        quantity_change INT NOT NULL,
                        previous_quantity INT,
                        new_quantity INT,
                        reason TEXT,
                        recorded_by TEXT,
                        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
                      )
                    `);
                    hasMovementsTable = true;
                } catch (_) {}
            }
        } catch (_) {}

        if (!hasMovementsTable) {
            return res.json({ success: true, cases: [] });
        }

        let hasCaseId = true;
        try {
            const col = await query(`
              SELECT EXISTS (
                SELECT FROM information_schema.columns 
                WHERE table_schema = 'public' 
                  AND table_name = 'stock_movements' 
                  AND column_name = 'case_id'
              ) AS exists
            `);
            hasCaseId = !!(col.rows[0] && col.rows[0].exists);
            if (!hasCaseId) {
                try {
                    await query(`ALTER TABLE stock_movements ADD COLUMN case_id INT REFERENCES cases(id)`);
                    hasCaseId = true;
                } catch (_) {}
            }
        } catch (_) {}

        if (!hasCaseId) {
            return res.json({ success: true, cases: [] });
        }

        const { from, to, limit = 200 } = req.query;
        const params = [];
        const dateWhere = [];
        if (from) { params.push(from); dateWhere.push(`c.funeral_date >= $${params.length}`); }
        if (to) { params.push(to); dateWhere.push(`c.funeral_date <= $${params.length}`); }
        const sql = `
            WITH movements AS (
              SELECT 
                sm.case_id, 
                sm.inventory_id, 
                SUM(ABS(CASE WHEN sm.quantity_change IS NOT NULL THEN sm.quantity_change ELSE 0 END)) AS qty_sum
              FROM stock_movements sm
              JOIN inventory inv2 ON inv2.id = sm.inventory_id
              WHERE inv2.category = 'coffin'
                AND sm.case_id IS NOT NULL
                AND (
                  sm.movement_type = 'sale' 
                  OR (sm.movement_type = 'adjustment' AND sm.quantity_change < 0)
                )
              GROUP BY sm.case_id, sm.inventory_id
            ),
            inferred AS (
              SELECT 
                c.id AS case_id,
                invMatch.id AS inventory_id,
                1 AS qty_sum
              FROM cases c
              LEFT JOIN LATERAL (
                SELECT inv2.id
                FROM inventory inv2
                WHERE inv2.category = 'coffin'
                  AND (
                    c.casket_type IS NOT NULL AND (
                      UPPER(inv2.name) = UPPER(c.casket_type) OR UPPER(inv2.model) = UPPER(c.casket_type)
                      OR UPPER(inv2.name) LIKE '%' || UPPER(c.casket_type) || '%'
                      OR UPPER(c.casket_type) LIKE '%' || UPPER(inv2.name) || '%'
                      OR UPPER(inv2.model) LIKE '%' || UPPER(c.casket_type) || '%'
                      OR UPPER(c.casket_type) LIKE '%' || UPPER(inv2.model) || '%'
                    )
                  )
                  AND (
                    c.casket_colour IS NULL
                    OR inv2.color IS NULL
                    OR UPPER(inv2.color) = UPPER(c.casket_colour)
                    OR UPPER(inv2.color) LIKE '%' || UPPER(c.casket_colour) || '%'
                    OR UPPER(c.casket_colour) LIKE '%' || UPPER(inv2.color) || '%'
                  )
                ORDER BY inv2.stock_quantity DESC NULLS LAST
                LIMIT 1
              ) AS invMatch ON TRUE
              WHERE invMatch.id IS NOT NULL
                AND NOT EXISTS (SELECT 1 FROM movements m WHERE m.case_id = c.id)
            ),
            usage AS (
              SELECT * FROM movements
              UNION ALL
              SELECT * FROM inferred
            )
            SELECT 
              c.id AS case_id,
              c.case_number,
              c.deceased_name,
              COALESCE(SUM(u.qty_sum),0) AS total_coffins,
              COALESCE(json_agg(json_build_object('name', i.name, 'color', i.color, 'quantity', u.qty_sum)) FILTER (WHERE i.id IS NOT NULL), '[]'::json) AS items
            FROM cases c
            LEFT JOIN usage u ON u.case_id = c.id
            LEFT JOIN inventory i ON i.id = u.inventory_id
            ${dateWhere.length ? 'WHERE ' + dateWhere.join(' AND ') : ''}
            GROUP BY c.id, c.case_number, c.deceased_name
            ORDER BY c.funeral_date DESC NULLS LAST, c.created_at DESC
            LIMIT ${Math.max(1, Math.min(parseInt(limit, 10) || 200, 1000))}
        `;
        const result = await query(sql, params);
        res.json({ success: true, cases: result.rows || [] });
    } catch (err) {
        res.status(500).json({ success: false, error: 'Failed to summarize coffin usage by case', details: err.message });
    }
};

module.exports.getCoffinUsageRaw = async (req, res) => {
    try {
        let hasMovementsTable = true;
        try {
            const t = await query(`
              SELECT EXISTS (
                SELECT FROM pg_tables
                WHERE schemaname = 'public' AND tablename = 'stock_movements'
              ) AS exists
            `);
            hasMovementsTable = !!(t.rows[0] && t.rows[0].exists);
            if (!hasMovementsTable) {
                try {
                    await query(`
                      CREATE TABLE IF NOT EXISTS stock_movements (
                        id SERIAL PRIMARY KEY,
                        inventory_id INT NOT NULL REFERENCES inventory(id),
                        case_id INT REFERENCES cases(id),
                        movement_type TEXT NOT NULL,
                        quantity_change INT NOT NULL,
                        previous_quantity INT,
                        new_quantity INT,
                        reason TEXT,
                        recorded_by TEXT,
                        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
                      )
                    `);
                    hasMovementsTable = true;
                } catch (_) {}
            }
        } catch (_) {}

        if (!hasMovementsTable) {
            return res.json({ success: true, items: [] });
        }

        let hasCaseId = true;
        try {
            const col = await query(`
              SELECT EXISTS (
                SELECT FROM information_schema.columns 
                WHERE table_schema = 'public' 
                  AND table_name = 'stock_movements' 
                  AND column_name = 'case_id'
              ) AS exists
            `);
            hasCaseId = !!(col.rows[0] && col.rows[0].exists);
            if (!hasCaseId) {
                try {
                    await query(`ALTER TABLE stock_movements ADD COLUMN case_id INT REFERENCES cases(id)`);
                    hasCaseId = true;
                } catch (_) {}
            }
        } catch (_) {}

        const { from, to, case_id, case_number, limit = 500 } = req.query;
        const params = [];
        const whereMov = [];
        const whereInf = [];

        whereMov.push("inv.category = 'coffin'");
        if (hasCaseId) whereMov.push('sm.case_id IS NOT NULL');
        whereMov.push("(sm.movement_type = 'sale' OR (sm.movement_type = 'adjustment' AND sm.quantity_change < 0))");
        if (from) { params.push(from); whereMov.push(`sm.created_at >= $${params.length}`); }
        if (to) { params.push(to); whereMov.push(`sm.created_at <= $${params.length}`); }
        if (case_id) { params.push(case_id); whereMov.push(`sm.case_id = $${params.length}`); }
        if (case_number) { params.push(case_number); whereMov.push(`c.case_number = $${params.length}`); }

        if (from) { whereInf.push(`c.funeral_date >= $${params.length - (!!case_number) - (!!case_id)}`); }
        if (to) { whereInf.push(`c.funeral_date <= $${params.length - (!!case_number) - (!!case_id)}`); }
        if (case_id) { whereInf.push(`c.id = ${case_id}`); }
        if (case_number) { whereInf.push(`c.case_number = '${case_number}'`); }

        const sql = `
            WITH movements AS (
              SELECT 
                sm.case_id,
                c.case_number,
                c.deceased_name,
                sm.inventory_id,
                inv.name,
                inv.model,
                inv.color,
                sm.movement_type,
                sm.quantity_change,
                sm.previous_quantity,
                sm.new_quantity,
                sm.reason,
                sm.recorded_by,
                sm.created_at,
                'movement' AS source
              FROM stock_movements sm
              JOIN inventory inv ON inv.id = sm.inventory_id
              ${hasCaseId ? 'LEFT JOIN cases c ON sm.case_id = c.id' : 'LEFT JOIN cases c ON FALSE'}
              WHERE ${whereMov.join(' AND ')}
            ),
            inferred AS (
              SELECT 
                c.id AS case_id,
                c.case_number,
                c.deceased_name,
                invMatch.id AS inventory_id,
                invMatch.name,
                invMatch.model,
                invMatch.color,
                'inferred' AS movement_type,
                -1 AS quantity_change,
                NULL AS previous_quantity,
                NULL AS new_quantity,
                'Inferred from case fields' AS reason,
                NULL AS recorded_by,
                c.updated_at AS created_at,
                'inferred' AS source
              FROM cases c
              LEFT JOIN LATERAL (
                SELECT inv2.id, inv2.name, inv2.model, inv2.color
                FROM inventory inv2
                WHERE inv2.category = 'coffin'
                  AND (
                    c.casket_type IS NOT NULL AND (
                      UPPER(inv2.name) = UPPER(c.casket_type) OR UPPER(inv2.model) = UPPER(c.casket_type)
                      OR UPPER(inv2.name) LIKE '%' || UPPER(c.casket_type) || '%'
                      OR UPPER(c.casket_type) LIKE '%' || UPPER(inv2.name) || '%'
                      OR UPPER(inv2.model) LIKE '%' || UPPER(c.casket_type) || '%'
                      OR UPPER(c.casket_type) LIKE '%' || UPPER(inv2.model) || '%'
                    )
                  )
                  AND (
                    c.casket_colour IS NULL
                    OR inv2.color IS NULL
                    OR UPPER(inv2.color) = UPPER(c.casket_colour)
                    OR UPPER(inv2.color) LIKE '%' || UPPER(c.casket_colour) || '%'
                    OR UPPER(c.casket_colour) LIKE '%' || UPPER(inv2.color) || '%'
                  )
                ORDER BY inv2.stock_quantity DESC NULLS LAST
                LIMIT 1
              ) AS invMatch ON TRUE
              WHERE invMatch.id IS NOT NULL
                AND NOT EXISTS (SELECT 1 FROM movements m WHERE m.case_id = c.id)
                ${whereInf.length ? 'AND ' + whereInf.join(' AND ') : ''}
            )
            SELECT * FROM movements
            UNION ALL
            SELECT * FROM inferred
            ORDER BY created_at DESC
            LIMIT ${Math.max(1, Math.min(parseInt(limit, 10) || 500, 2000))}
        `;
        const result = await query(sql, params);
        res.json({ success: true, items: result.rows || [] });
    } catch (err) {
        res.status(500).json({ success: false, error: 'Failed to fetch coffin usage raw data', details: err.message });
    }
};

exports.getPublicCoffinUsageRaw = async (req, res) => {
    try {
        let hasMovementsTable = true;
        try {
            const t = await query(`
              SELECT EXISTS (
                SELECT FROM pg_tables
                WHERE schemaname = 'public' AND tablename = 'stock_movements'
              ) AS exists
            `);
            hasMovementsTable = !!(t.rows[0] && t.rows[0].exists);
        } catch (_) {}

        const { from, to, case_number, limit = 500 } = req.query;
        const params = [];
        const whereMov = ["inv.category = 'coffin'"];
        if (hasMovementsTable) {
            whereMov.push("(sm.movement_type = 'sale' OR (sm.movement_type = 'adjustment' AND sm.quantity_change < 0))");
            if (from) { params.push(from); whereMov.push(`sm.created_at >= $${params.length}`); }
            if (to) { params.push(to); whereMov.push(`sm.created_at <= $${params.length}`); }
            if (case_number) { params.push(case_number); whereMov.push(`c.case_number = $${params.length}`); }
        }

        const whereInf = [];
        if (from) { params.push(from); whereInf.push(`c.funeral_date >= $${params.length}`); }
        if (to) { params.push(to); whereInf.push(`c.funeral_date <= $${params.length}`); }
        if (case_number) { params.push(case_number); whereInf.push(`c.case_number = $${params.length}`); }

        const sql = `
            WITH movements AS (
              ${hasMovementsTable ? `
              SELECT 
                c.case_number,
                c.deceased_name,
                inv.name,
                inv.color,
                ABS(sm.quantity_change) AS quantity,
                sm.created_at,
                'movement' AS source
              FROM stock_movements sm
              JOIN inventory inv ON inv.id = sm.inventory_id
              LEFT JOIN cases c ON sm.case_id = c.id
              WHERE ${whereMov.join(' AND ')}
              ` : `
              SELECT NULL::text AS case_number, NULL::text AS deceased_name, NULL::text AS name, NULL::text AS color, NULL::int AS quantity, NOW() AS created_at, 'movement' AS source
              WHERE FALSE
              `}
            ),
            inferred AS (
              SELECT 
                c.case_number,
                c.deceased_name,
                invMatch.name,
                invMatch.color,
                1 AS quantity,
                c.updated_at AS created_at,
                'inferred' AS source
              FROM cases c
              LEFT JOIN LATERAL (
                SELECT inv2.name, inv2.color
                FROM inventory inv2
                WHERE inv2.category = 'coffin'
                  AND (
                    c.casket_type IS NOT NULL AND (
                      UPPER(inv2.name) = UPPER(c.casket_type) OR UPPER(inv2.model) = UPPER(c.casket_type)
                      OR UPPER(inv2.name) LIKE '%' || UPPER(c.casket_type) || '%'
                      OR UPPER(c.casket_type) LIKE '%' || UPPER(inv2.name) || '%'
                      OR UPPER(inv2.model) LIKE '%' || UPPER(c.casket_type) || '%'
                      OR UPPER(c.casket_type) LIKE '%' || UPPER(inv2.model) || '%'
                    )
                  )
                  AND (
                    c.casket_colour IS NULL
                    OR inv2.color IS NULL
                    OR UPPER(inv2.color) = UPPER(c.casket_colour)
                    OR UPPER(inv2.color) LIKE '%' || UPPER(c.casket_colour) || '%'
                    OR UPPER(c.casket_colour) LIKE '%' || UPPER(inv2.color) || '%'
                  )
                ORDER BY inv2.stock_quantity DESC NULLS LAST
                LIMIT 1
              ) AS invMatch ON TRUE
              WHERE invMatch.name IS NOT NULL
                AND NOT EXISTS (
                  SELECT 1 FROM stock_movements sm
                  WHERE sm.case_id = c.id
                )
                ${whereInf.length ? 'AND ' + whereInf.join(' AND ') : ''}
            )
            SELECT * FROM movements
            UNION ALL
            SELECT * FROM inferred
            ORDER BY created_at DESC
            LIMIT ${Math.max(1, Math.min(parseInt(limit, 10) || 500, 2000))}
        `;
        const result = await query(sql, params);
        const rows = (result.rows || []).map(r => ({
            case_number: r.case_number || null,
            deceased_name: r.deceased_name || null,
            item_name: r.name || null,
            color: r.color || null,
            quantity: r.quantity || 0,
            source: r.source,
            created_at: r.created_at
        }));
        res.json({ success: true, items: rows });
    } catch (err) {
        res.status(500).json({ success: false, error: 'Failed to fetch public coffin usage data', details: err.message });
    }
};

exports.backfillCoffinMovementsToCases = async (req, res) => {
    try {
        let hasMovementsTable = true;
        try {
            const t = await query(`
              SELECT EXISTS (
                SELECT FROM pg_tables
                WHERE schemaname = 'public' AND tablename = 'stock_movements'
              ) AS exists
            `);
            hasMovementsTable = !!(t.rows[0] && t.rows[0].exists);
            if (!hasMovementsTable) {
                try {
                    await query(`
                      CREATE TABLE IF NOT EXISTS stock_movements (
                        id SERIAL PRIMARY KEY,
                        inventory_id INT NOT NULL REFERENCES inventory(id),
                        case_id INT REFERENCES cases(id),
                        movement_type TEXT NOT NULL,
                        quantity_change INT NOT NULL,
                        previous_quantity INT,
                        new_quantity INT,
                        reason TEXT,
                        recorded_by TEXT,
                        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
                      )
                    `);
                    hasMovementsTable = true;
                } catch (_) {}
            }
        } catch (_) {}

        if (!hasMovementsTable) {
            return res.json({ success: false, error: 'Missing stock_movements table' });
        }

        let hasCaseId = true;
        try {
            const col = await query(`
              SELECT EXISTS (
                SELECT FROM information_schema.columns 
                WHERE table_schema = 'public' 
                  AND table_name = 'stock_movements' 
                  AND column_name = 'case_id'
              ) AS exists
            `);
            hasCaseId = !!(col.rows[0] && col.rows[0].exists);
            if (!hasCaseId) {
                try {
                    await query(`ALTER TABLE stock_movements ADD COLUMN case_id INT REFERENCES cases(id)`);
                    hasCaseId = true;
                } catch (_) {}
            }
        } catch (_) {}

        const { limit = 500, dry_run } = req.query;
        const movs = await query(`
          SELECT 
            sm.id,
            sm.inventory_id,
            sm.created_at,
            sm.movement_type,
            sm.quantity_change,
            inv.name,
            inv.model,
            inv.color
          FROM stock_movements sm
          JOIN inventory inv ON inv.id = sm.inventory_id
          WHERE inv.category = 'coffin'
            AND ${hasCaseId ? 'sm.case_id IS NULL' : '1=1'}
            AND (
              sm.movement_type = 'sale' OR (sm.movement_type = 'adjustment' AND sm.quantity_change < 0)
            )
          ORDER BY sm.created_at DESC
          LIMIT ${Math.max(1, Math.min(parseInt(limit, 10) || 500, 2000))}
        `);

        const updated = [];
        const unmatched = [];

        for (const m of (movs.rows || [])) {
            const params = [m.name || '', m.model || '', m.color || null, m.created_at];
            const cands = await query(`
              SELECT 
                c.id,
                c.case_number,
                c.deceased_name,
                c.casket_type,
                c.casket_colour,
                c.funeral_date,
                (
                  CASE WHEN $1 <> '' AND c.casket_type IS NOT NULL AND (UPPER($1) = UPPER(c.casket_type) OR UPPER($2) = UPPER(c.casket_type)) THEN 70
                       WHEN $1 <> '' AND c.casket_type IS NOT NULL AND (
                         UPPER($1) LIKE '%' || UPPER(c.casket_type) || '%' OR UPPER(c.casket_type) LIKE '%' || UPPER($1) || '%'
                         OR UPPER($2) LIKE '%' || UPPER(c.casket_type) || '%' OR UPPER(c.casket_type) LIKE '%' || UPPER($2) || '%'
                       ) THEN 40
                       ELSE 0 END
                )
                + (
                  CASE WHEN $3 IS NULL OR c.casket_colour IS NULL THEN 0
                       WHEN UPPER($3) = UPPER(c.casket_colour) THEN 30
                       WHEN UPPER($3) LIKE '%' || UPPER(c.casket_colour) || '%' OR UPPER(c.casket_colour) LIKE '%' || UPPER($3) || '%' THEN 10
                       ELSE 0 END
                )
                + (
                  CASE WHEN c.funeral_date IS NOT NULL THEN GREATEST(0, 30 - ABS(CAST(DATE_PART('day', c.funeral_date::timestamp - $4)::int AS int))) ELSE 0 END
                ) AS score
              FROM cases c
              WHERE c.casket_type IS NOT NULL OR c.casket_colour IS NOT NULL
              ORDER BY score DESC, c.updated_at DESC NULLS LAST
              LIMIT 3
            `, params);

            const best = (cands.rows || [])[0];
            if (best && best.score >= 60) {
                if (String(dry_run).toLowerCase() === 'true') {
                    updated.push({ movement_id: m.id, case_id: best.id, score: best.score, dry_run: true });
                } else {
                    await query('UPDATE stock_movements SET case_id=$1 WHERE id=$2', [best.id, m.id]);
                    updated.push({ movement_id: m.id, case_id: best.id, score: best.score });
                }
            } else {
                unmatched.push({ movement_id: m.id, name: m.name, model: m.model, color: m.color, created_at: m.created_at, candidates: cands.rows || [] });
            }
        }

        res.json({ success: true, processed: (movs.rows || []).length, updated_count: updated.length, updated, unmatched_count: unmatched.length, unmatched });
    } catch (err) {
        res.status(500).json({ success: false, error: 'Failed to backfill coffin movements', details: err.message });
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
        try { await maybeNotifyLowStock(1); } catch (_) {}

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
        const previousQty = existing.rows[0].stock_quantity;
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

        try {
            if (stock_quantity !== undefined) {
                const newQty = result.rows[0].stock_quantity;
                const change = (parseInt(newQty, 10) || 0) - (parseInt(previousQty, 10) || 0);
                if (change !== 0) {
                    await query(
                        `INSERT INTO stock_movements 
                         (inventory_id, case_id, movement_type, quantity_change, previous_quantity, new_quantity, reason, recorded_by)
                         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
                        [id, null, 'adjustment', change, previousQty, newQty, 'Edit item', (req.user?.email) || 'system']
                    );
                }
            }
        } catch (movementErr) {
            console.warn('⚠️  Could not log stock movement (updateInventoryItem):', movementErr.message);
        }

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
