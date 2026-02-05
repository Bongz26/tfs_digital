const nodemailer = require('nodemailer');
const sgMail = require('@sendgrid/mail');
const { sendWeeklyReportLogic } = require('../cron/weeklyReport');
const { sendStockReportLogic } = require('../cron/weeklyStockEmail');
const smsService = require('../utils/smsService');

// Initialize SendGrid
if (process.env.SMTP_PASS && process.env.SMTP_PASS.startsWith('SG.')) {
    sgMail.setApiKey(process.env.SMTP_PASS);
}

// Helper: Send Email (shared logic)
async function sendEmail(to, subject, html, cc) {
    const fromMail = process.env.SENDGRID_FROM_EMAIL || process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;
    const host = process.env.SMTP_HOST;
    const user = process.env.SMTP_USER;

    try {
        if (pass && pass.startsWith('SG.')) {
            await sgMail.send({ to, cc, from: { email: fromMail, name: 'TFS Inventory' }, subject, html });
            console.log(`✅ Email sent via SendGrid to ${to}`);
        } else if (host && user && pass) {
            const port = parseInt(process.env.SMTP_PORT || '587', 10);
            const transporter = nodemailer.createTransport({ host, port, secure: port === 465, auth: { user, pass } });
            await transporter.sendMail({ from: fromMail, to, cc, subject, html });
            console.log(`✅ Email sent via SMTP to ${to}`);
        }
    } catch (e) {
        console.error('Email send failed:', e.message);
    }
}

async function maybeNotifyLowStock(threshold = 1, supabaseClient = null) {
    try {
        if (!supabaseClient) {
            console.warn('⚠️ maybeNotifyLowStock needs supabaseClient');
            return;
        }

        const to = process.env.INVENTORY_ALERTS_TO || process.env.ALERTS_TO || process.env.MANAGEMENT_EMAIL || process.env.SMTP_USER;
        if (!to) return;

        const { data: items, error } = await supabaseClient
            .from('inventory')
            .select('id, name, category, sku, stock_quantity, reserved_quantity, low_stock_threshold, location, model, color')
            .order('category')
            .order('name');

        if (error) throw error;

        const lowItems = items.map(r => ({
            ...r,
            available_quantity: (r.stock_quantity || 0) - (r.reserved_quantity || 0)
        })).filter(r => r.available_quantity <= (r.low_stock_threshold !== null ? r.low_stock_threshold : threshold));

        if (lowItems.length === 0) return;

        const subject = `⚠️ Low Stock Alert: ${lowItems.length} item(s) at or below threshold`;
        const htmlRows = lowItems.map(i => `
            <tr>
              <td style="padding:8px;border:1px solid #ddd;">${i.name}${i.color ? ' • ' + i.color : ''}</td>
              <td style="padding:8px;border:1px solid #ddd;">${i.category}</td>
              <td style="padding:8px;border:1px solid #ddd;text-align:center;font-weight:bold;color:red;">${i.available_quantity}</td>
              <td style="padding:8px;border:1px solid #ddd;">Threshold ${i.low_stock_threshold}</td>
            </tr>
        `).join('');

        const html = `
          <div style="font-family:Segoe UI,Arial,sans-serif;font-size:14px;color:#222;max-width:600px;">
            <h2 style="color:#d32f2f;">Inventory Alert</h2>
            <p>The following items are low in stock:</p>
            <table style="border-collapse:collapse;width:100%;">
              <thead>
                <tr style="background:#f5f5f5;">
                  <th style="padding:8px;border:1px solid #ddd;text-align:left;">Item</th>
                  <th style="padding:8px;border:1px solid #ddd;text-align:left;">Category</th>
                  <th style="padding:8px;border:1px solid #ddd;text-align:center;">Available</th>
                  <th style="padding:8px;border:1px solid #ddd;text-align:left;">Target</th>
                </tr>
              </thead>
              <tbody>${htmlRows}</tbody>
            </table>
            <p style="margin-top:20px;font-size:12px;color:#666;">This is an automated alert from TFS Digital.</p>
          </div>
        `;

        await sendEmail(to, subject, html, process.env.REPORT_CC_EMAIL || 'khumalo4sure@gmail.com');
    } catch (err) {
        console.error('❌ Failed to send low stock notification:', err.message);
    }
}

async function notifyCasketUsage(caseId, itemId, qtyChange, supabaseClient = null) {
    try {
        if (!supabaseClient) {
            console.warn('⚠️ notifyCasketUsage needs supabaseClient');
            return;
        }

        const to = process.env.MANAGEMENT_EMAIL || process.env.SMTP_USER;
        if (!to) return;

        const { data: caseData, error: caseErr } = await supabaseClient
            .from('cases')
            .select('case_number, deceased_name')
            .eq('id', caseId)
            .single();

        const { data: itemData, error: itemErr } = await supabaseClient
            .from('inventory')
            .select('name, color, stock_quantity')
            .eq('id', itemId)
            .single();

        if (caseErr || itemErr || !caseData || !itemData) return;

        const { case_number, deceased_name } = caseData;
        const { name: item_name, color, stock_quantity: remaining } = itemData;

        const subject = `⚰️ Coffin Used: ${deceased_name} (${case_number})`;
        const html = `
          <div style="font-family:Segoe UI,Arial,sans-serif;font-size:14px;color:#222;max-width:600px;border:1px solid #eee;padding:20px;border-radius:8px;">
            <h2 style="color:#2c3e50;margin-top:0;">Stock Usage Notification</h2>
            <p>A coffin has been assigned to a case and deducted from stock.</p>
            <div style="background:#f9f9f9;padding:15px;border-radius:4px;margin:20px 0;">
                <p><strong>Case:</strong> ${case_number} - ${deceased_name}</p>
                <p><strong>Casket:</strong> ${item_name} ${color ? '(' + color + ')' : ''}</p>
                <p><strong>Quantity:</strong> ${Math.abs(qtyChange)}</p>
            </div>
            <p><strong>Remaining Stock:</strong> <span style="font-size:18px;font-weight:bold;color:${remaining <= 1 ? 'red' : 'green'};">${remaining}</span></p>
            <hr style="border:none;border-top:1px solid #eee;margin:20px 0;" />
            <p style="font-size:12px;color:#666;">This is an automated notification from Thusanang Digital.</p>
          </div>
        `;

        await sendEmail(to, subject, html, process.env.REPORT_CC_EMAIL || 'khumalo4sure@gmail.com');
    } catch (err) {
        console.error('❌ Failed to send casket usage email:', err.message);
    }
}

// --- GET ALL INVENTORY ---
exports.getAllInventory = async (req, res) => {
    try {
        const supabase = req.app.locals.supabase;

        if (!supabase) {
            return res.status(500).json({
                success: false,
                error: 'Database not configured',
                message: 'Supabase client is not initialized.'
            });
        }

        const { category } = req.query;

        let query = supabase
            .from('inventory')
            .select('*');

        if (category && category !== 'all') {
            query = query.eq('category', category);
        }

        query = query.order('category').order('name');

        const { data, error } = await query;

        if (error) {
            console.error('❌ Error fetching inventory:', error);
            return res.status(500).json({ success: false, error: 'Failed to fetch inventory', details: error.message });
        }

        res.json({ success: true, inventory: data || [] });
    } catch (err) {
        console.error('❌ Error fetching inventory:', err);
        res.status(500).json({ success: false, error: 'Failed to fetch inventory', details: err.message });
    }
};

// --- GET INVENTORY STATS ---
// --- GET INVENTORY STATS ---
exports.getInventoryStats = async (req, res) => {
    try {
        const supabase = req.app.locals.supabase;
        if (!supabase) return res.status(500).json({ success: false, error: 'Database not configured' });

        const { data, error } = await supabase
            .from('inventory')
            .select('category, stock_quantity, low_stock_threshold');

        if (error) throw error;

        const total_items = data.length;
        const total_stock = data.reduce((sum, item) => sum + (item.stock_quantity || 0), 0);
        const low_stock_count = data.filter(item =>
            (item.stock_quantity || 0) <= (item.low_stock_threshold !== null ? item.low_stock_threshold : 0)
        ).length;
        const categories = new Set(data.map(i => i.category)).size;

        const stats = {
            total_items,
            low_stock_count,
            total_stock,
            categories
        };

        res.json({ success: true, stats });
    } catch (err) {
        console.error('❌ Error fetching inventory stats:', err);
        res.status(500).json({ success: false, error: 'Failed to fetch inventory stats', details: err.message });
    }
};

exports.getLowStockDetailed = async (req, res) => {
    try {
        const supabase = req.app.locals.supabase;
        if (!supabase) return res.status(500).json({ success: false, error: 'Database not configured' });

        const { category } = req.query;

        let query = supabase
            .from('inventory')
            .select('id, name, category, sku, stock_quantity, reserved_quantity, low_stock_threshold, location, notes, model, color')
            .order('category')
            .order('name');

        if (category && category !== 'all') {
            query = query.eq('category', category);
        }

        const { data, error } = await query;
        if (error) throw error;

        const lowItems = data.map(r => ({
            ...r,
            available_quantity: (r.stock_quantity || 0) - (r.reserved_quantity || 0),
            is_low_stock: ((r.stock_quantity || 0) - (r.reserved_quantity || 0)) <= (r.low_stock_threshold !== null ? r.low_stock_threshold : 0)
        })).filter(r => r.is_low_stock);

        res.json({ success: true, items: lowItems });
    } catch (err) {
        res.status(500).json({ success: false, error: 'Failed to fetch low stock', details: err.message });
    }
};

// --- UPDATE STOCK QUANTITY ---
exports.updateStockQuantity = async (req, res) => {
    const { id } = req.params;
    const { stock_quantity } = req.body;

    const supabase = req.app.locals.supabase;
    if (!supabase) return res.status(500).json({ success: false, error: 'Database not configured' });

    try {
        const { data: item, error: fetchErr } = await supabase
            .from('inventory')
            .select('stock_quantity, low_stock_threshold')
            .eq('id', id)
            .single();

        if (fetchErr || !item) {
            return res.status(404).json({ success: false, error: 'Item not found' });
        }

        const previous = item.stock_quantity;

        const { error: updateErr } = await supabase
            .from('inventory')
            .update({ stock_quantity, updated_at: new Date() })
            .eq('id', id);

        if (updateErr) throw updateErr;

        try {
            const change = (parseInt(stock_quantity, 10) || 0) - (parseInt(previous, 10) || 0);
            if (change !== 0) {
                await supabase.from('stock_movements').insert({
                    inventory_id: id,
                    movement_type: 'adjustment',
                    quantity_change: change,
                    previous_quantity: previous,
                    new_quantity: stock_quantity,
                    reason: 'Manual update',
                    recorded_by: (req.user?.email) || 'system'
                });
            }
        } catch (movementErr) {
            console.warn('⚠️  Could not log stock movement (updateStockQuantity):', movementErr.message);
        }

        const is_low_stock = stock_quantity <= (item.low_stock_threshold !== null ? item.low_stock_threshold : 0);
        try { await maybeNotifyLowStock(1, supabase); } catch (_) { }

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

    const supabase = req.app.locals.supabase;
    if (!supabase) return res.status(500).json({ success: false, error: 'Database not configured' });

    try {
        const { data: item, error: fetchErr } = await supabase
            .from('inventory')
            .select('stock_quantity, low_stock_threshold')
            .eq('id', id)
            .single();

        if (fetchErr || !item) {
            return res.status(404).json({ success: false, error: 'Item not found' });
        }

        const previous_quantity = item.stock_quantity;
        const new_quantity = previous_quantity + quantity_change;

        const { error: updateErr } = await supabase
            .from('inventory')
            .update({ stock_quantity: new_quantity, updated_at: new Date() })
            .eq('id', id);

        if (updateErr) throw updateErr;

        try {
            const mType = (String(movement_type || '').toLowerCase() === 'sale') ? 'sale' : 'adjustment';
            const logDate = req.body.created_at || new Date(); // Allow backdating

            await supabase.from('stock_movements').insert({
                inventory_id: id,
                case_id: case_id || null,
                movement_type: mType,
                quantity_change,
                previous_quantity,
                new_quantity,
                reason: reason || 'Manual adjustment',
                recorded_by: recorded_by || 'system',
                created_at: logDate
            });
        } catch (movementErr) {
            console.warn('⚠️  Could not log stock movement:', movementErr.message);
        }

        const is_low_stock = new_quantity <= (item.low_stock_threshold !== null ? item.low_stock_threshold : 0);
        try { await maybeNotifyLowStock(1, supabase); } catch (_) { }

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
                } catch (_) { }
            }
        } catch (_) { }
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

// --- REPORTING STUBS (Legacy SQL Removed) ---
exports.getCoffinUsageByCase = async (req, res) => {
    res.json({ success: true, cases: [], note: 'Reporting temporarily unavailable during migration' });
};

exports.getCoffinUsageRaw = async (req, res) => {
    res.json({ success: true, items: [], note: 'Reporting temporarily unavailable during migration' });
};

exports.getPublicCoffinUsageRaw = async (req, res) => {
    res.json({ success: true, items: [], note: 'Reporting temporarily unavailable during migration' });
};

exports.backfillCoffinMovementsToCases = async (req, res) => {
    res.status(501).json({ success: false, error: 'Not implemented in Supabase version' });
};

exports.createCoffinMovementsForCases = async (req, res) => {
    res.status(501).json({ success: false, error: 'Not implemented in Supabase version' });
};

// --- GET OPEN STOCK TAKES ---
exports.getOpenStockTakes = async (req, res) => {
    try {
        const supabase = req.app.locals.supabase;
        if (!supabase) return res.status(500).json({ success: false, error: 'Database not configured' });

        const { data: openTakes, error } = await supabase
            .from('stock_takes')
            .select('id, taken_by, created_at, status')
            .eq('status', 'in_progress')
            .order('created_at', { ascending: false });

        if (error) throw error;

        res.json({ success: true, stock_takes: openTakes });
    } catch (err) {
        console.error('❌ Error fetching open stock takes:', err);
        res.status(500).json({ success: false, error: 'Failed to fetch open stock takes', details: err.message });
    }
};

// --- START STOCK TAKE ---
exports.startStockTake = async (req, res) => {
    const { taken_by } = req.body;
    const supabase = req.app.locals.supabase;
    if (!supabase) return res.status(500).json({ success: false, error: 'Database not configured' });

    try {
        const { count, error: countErr } = await supabase
            .from('stock_takes')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'in_progress');

        if (countErr) throw countErr;

        if (count >= 2) {
            return res.status(400).json({
                success: false,
                error: 'Maximum of 2 open stock take sessions allowed.',
                open_count: count
            });
        }

        const { data: take, error: createErr } = await supabase
            .from('stock_takes')
            .insert({ taken_by, status: 'in_progress' })
            .select('id, created_at')
            .single();

        if (createErr) throw createErr;

        const { data: inventory, error: invErr } = await supabase
            .from('inventory')
            .select('id, stock_quantity');

        if (invErr) throw invErr;

        const takeItems = inventory.map(i => ({
            stock_take_id: take.id,
            inventory_id: i.id,
            system_quantity: i.stock_quantity || 0
        }));

        const { error: itemsErr } = await supabase
            .from('stock_take_items')
            .insert(takeItems);

        if (itemsErr) throw itemsErr;

        const { data: itemsWithDetails, error: fetchItemsErr } = await supabase
            .from('stock_take_items')
            .select(`
                id, stock_take_id, inventory_id, system_quantity, physical_quantity, difference, notes, created_at,
                inventory ( name, category, sku, color, model )
            `)
            .eq('stock_take_id', take.id)
            .order('inventory(category)')
            .order('inventory(name)');

        if (fetchItemsErr) throw fetchItemsErr;

        // Flatten for frontend compatibility if needed, or frontend adapts. 
        // Assuming frontend expects flat structure based on previous SQL:
        const flatItems = itemsWithDetails.map(i => ({
            ...i,
            name: i.inventory?.name,
            category: i.inventory?.category,
            sku: i.inventory?.sku,
            color: i.inventory?.color,
            model: i.inventory?.model,
            inventory: undefined
        }));

        res.json({ success: true, stock_take_id: take.id, items: flatItems });
    } catch (err) {
        console.error('❌ Error starting stock take:', err);
        res.status(500).json({ success: false, error: 'Failed to start stock take', details: err.message });
    }
};

// --- UPDATE STOCK TAKE ITEM ---
exports.updateStockTakeItem = async (req, res) => {
    const { id, itemId } = req.params;
    const { physical_quantity, notes } = req.body;
    const supabase = req.app.locals.supabase;
    if (!supabase) return res.status(500).json({ success: false, error: 'Database not configured' });

    try {
        // Need to fetch system_quantity to calculate difference (unless passed from FE, but safer from DB)
        const { data: currentItem, error: fetchErr } = await supabase
            .from('stock_take_items')
            .select('system_quantity')
            .eq('stock_take_id', id)
            .eq('inventory_id', itemId)
            .single();

        if (fetchErr || !currentItem) return res.status(404).json({ success: false, error: 'Stock take item not found' });

        const difference = (physical_quantity !== null) ? (physical_quantity - currentItem.system_quantity) : null;

        const { data: updated, error: updateErr } = await supabase
            .from('stock_take_items')
            .update({
                physical_quantity,
                difference,
                notes
            })
            .eq('stock_take_id', id)
            .eq('inventory_id', itemId)
            .select(`
                id, stock_take_id, inventory_id, system_quantity, physical_quantity, difference, notes, created_at,
                inventory ( name, category, sku, color, model )
            `)
            .single();

        if (updateErr) throw updateErr;

        const flatItem = {
            ...updated,
            name: updated.inventory?.name,
            category: updated.inventory?.category,
            sku: updated.inventory?.sku,
            color: updated.inventory?.color,
            model: updated.inventory?.model,
            inventory: undefined
        };

        res.json({ success: true, item: flatItem });
    } catch (err) {
        console.error('❌ Error updating stock take item:', err);
        res.status(500).json({ success: false, error: 'Failed to update count', details: err.message });
    }
};

// --- GET SPECIFIC STOCK TAKE ---
exports.getStockTake = async (req, res) => {
    const { id } = req.params;
    const supabase = req.app.locals.supabase;
    if (!supabase) return res.status(500).json({ success: false, error: 'Database not configured' });

    try {
        const { data: take, error: takeErr } = await supabase
            .from('stock_takes')
            .select('id, taken_by, created_at, status')
            .eq('id', id)
            .single();

        if (takeErr || !take) {
            return res.status(404).json({ success: false, error: 'Stock take not found' });
        }

        const { data: items, error: itemsErr } = await supabase
            .from('stock_take_items')
            .select(`
                id, stock_take_id, inventory_id, system_quantity, physical_quantity, difference, notes, created_at,
                inventory ( name, category, sku, color, model )
            `)
            .eq('stock_take_id', id);
        // Sorting might need to be done in JS or complex query if foreign table sort not supported directly in this syntax

        if (itemsErr) throw itemsErr;

        // Sort in JS
        items.sort((a, b) => {
            const catA = a.inventory?.category || '';
            const catB = b.inventory?.category || '';
            if (catA !== catB) return catA.localeCompare(catB);
            return (a.inventory?.name || '').localeCompare(b.inventory?.name || '');
        });

        const flatItems = items.map(i => ({
            ...i,
            name: i.inventory?.name,
            category: i.inventory?.category,
            sku: i.inventory?.sku,
            name: i.inventory?.name,
            category: i.inventory?.category,
            sku: i.inventory?.sku,
            color: i.inventory?.color,
            model: i.inventory?.model,
            inventory: undefined
        }));

        res.json({
            success: true,
            stock_take: take,
            items: flatItems
        });
    } catch (err) {
        console.error('❌ Error fetching stock take:', err);
        res.status(500).json({ success: false, error: 'Failed to fetch stock take', details: err.message });
    }
};

// --- CANCEL STOCK TAKE ---
exports.cancelStockTake = async (req, res) => {
    const { id } = req.params;
    const supabase = req.app.locals.supabase;
    if (!supabase) return res.status(500).json({ success: false, error: 'Database not configured' });

    try {
        const { data: take, error: fetchErr } = await supabase.from('stock_takes').select('status').eq('id', id).single();
        if (fetchErr || !take) return res.status(404).json({ success: false, error: 'Stock take not found' });

        if (take.status !== 'in_progress') {
            return res.status(400).json({ success: false, error: `Cannot cancel stock take. Current status: ${take.status}` });
        }

        const { error: updateErr } = await supabase.from('stock_takes').update({ status: 'cancelled' }).eq('id', id);
        if (updateErr) throw updateErr;

        res.json({ success: true, message: 'Stock take cancelled successfully' });
    } catch (err) {
        console.error('❌ Error cancelling stock take:', err);
        res.status(500).json({ success: false, error: 'Failed to cancel stock take', details: err.message });
    }
};

// --- COMPLETE STOCK TAKE ---
exports.completeStockTake = async (req, res) => {
    const { id } = req.params;
    const supabase = req.app.locals.supabase;
    if (!supabase) return res.status(500).json({ success: false, error: 'Database not configured' });

    try {
        const { data: items, error: itemsErr } = await supabase
            .from('stock_take_items')
            .select('*')
            .eq('stock_take_id', id);

        if (itemsErr) throw itemsErr;

        let updatedCount = 0;

        for (const item of items) {
            if (item.physical_quantity === null) continue;

            // Update Inventory
            const { error: invUpdateErr } = await supabase
                .from('inventory')
                .update({ stock_quantity: item.physical_quantity, updated_at: new Date() })
                .eq('id', item.inventory_id);

            if (invUpdateErr) {
                console.error(`Failed to update inventory ${item.inventory_id} during stock take`, invUpdateErr);
                continue;
            }

            updatedCount++;

            // Create Movement
            try {
                await supabase.from('stock_movements').insert({
                    inventory_id: item.inventory_id,
                    movement_type: 'adjustment',
                    quantity_change: (item.physical_quantity - item.system_quantity),
                    previous_quantity: item.system_quantity,
                    new_quantity: item.physical_quantity,
                    reason: 'Stock Take Adjustment'
                });
            } catch (moveErr) {
                console.warn('⚠️  Could not log stock movement:', moveErr.message);
            }
        }

        const { error: completeErr } = await supabase
            .from('stock_takes')
            .update({ status: 'completed' })
            .eq('id', id);

        if (completeErr) throw completeErr;

        try { await maybeNotifyLowStock(1, supabase); } catch (_) { }

        res.json({ success: true, message: 'Stock take completed', items_updated: updatedCount });
    } catch (err) {
        console.error('❌ Error completing stock take:', err);
        res.status(500).json({ success: false, error: 'Failed to complete stock take', details: err.message });
    }
};

// --- GET COMPLETED STOCK TAKES ---
exports.getCompletedStockTakes = async (req, res) => {
    try {
        const supabase = req.app.locals.supabase;
        if (!supabase) return res.status(500).json({ success: false, error: 'Database not configured' });

        const { data, error } = await supabase
            .from('stock_takes')
            .select('*, stock_take_items(count)')
            .eq('status', 'completed')
            .order('created_at', { ascending: false });

        if (error) throw error;

        const history = data.map(take => ({
            ...take,
            total_items: take.stock_take_items?.[0]?.count || 0,
            stock_take_items: undefined
        }));

        res.json({ success: true, history });
    } catch (err) {
        console.error('❌ Error fetching completed stock takes:', err);
        res.status(500).json({ success: false, error: 'Failed to fetch stock take history', details: err.message });
    }
};

// --- CREATE INVENTORY ITEM ---
exports.createInventoryItem = async (req, res) => {
    const { name, category, sku, stock_quantity, unit_price, low_stock_threshold, location, notes, supplier_id, model, color } = req.body;

    if (!name) {
        return res.status(400).json({ success: false, error: 'Item name is required' });
    }

    const supabase = req.app.locals.supabase;
    if (!supabase) return res.status(500).json({ success: false, error: 'Database not configured' });

    try {
        const { data, error } = await supabase
            .from('inventory')
            .insert({
                name,
                category: category || 'other',
                sku: (sku && sku.trim() !== '') ? sku.trim() : null,
                stock_quantity: stock_quantity || 0,
                unit_price: unit_price || 0,
                low_stock_threshold: low_stock_threshold || 2,
                location: location || 'Manekeng',
                notes: notes || null,
                supplier_id: supplier_id || null,
                model: model || null,
                color: color || null
            })
            .select()
            .single();

        if (error) {
            if (error.code === '23505') { // Unique violation
                return res.status(400).json({ success: false, error: 'Duplicate item or SKU' });
            }
            throw error;
        }

        console.log(`✅ Created inventory item: ${name} (${model || ''} ${color || ''})`);
        res.status(201).json({ success: true, item: data });
    } catch (err) {
        console.error('❌ Error creating inventory item:', err);
        res.status(500).json({ success: false, error: 'Failed to create inventory item', details: err.message });
    }
};

// --- UPDATE INVENTORY ITEM ---
exports.updateInventoryItem = async (req, res) => {
    const { id } = req.params;
    const { name, category, sku, stock_quantity, unit_price, low_stock_threshold, location, notes, supplier_id, model, color } = req.body;

    const supabase = req.app.locals.supabase;
    if (!supabase) return res.status(500).json({ success: false, error: 'Database not configured' });

    try {
        // Fetch existing first
        const { data: existing, error: fetchErr } = await supabase
            .from('inventory')
            .select('stock_quantity')
            .eq('id', id)
            .single();

        if (fetchErr || !existing) {
            return res.status(404).json({ success: false, error: 'Inventory item not found' });
        }

        const previousQty = existing.stock_quantity;

        const updates = { updated_at: new Date() };
        if (name !== undefined) updates.name = name;
        if (category !== undefined) updates.category = category;
        if (sku !== undefined) updates.sku = (sku && sku.trim() !== '') ? sku.trim() : null;
        if (stock_quantity !== undefined) updates.stock_quantity = stock_quantity;
        if (unit_price !== undefined) updates.unit_price = unit_price;
        if (low_stock_threshold !== undefined) updates.low_stock_threshold = low_stock_threshold;
        if (location !== undefined) updates.location = location;
        if (notes !== undefined) updates.notes = notes;
        if (supplier_id !== undefined) updates.supplier_id = supplier_id;
        if (model !== undefined) updates.model = model;
        if (color !== undefined) updates.color = color;

        const { data: updatedItem, error: updateErr } = await supabase
            .from('inventory')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (updateErr) throw updateErr;

        try {
            if (stock_quantity !== undefined) {
                const newQty = updatedItem.stock_quantity;
                const change = (parseInt(newQty, 10) || 0) - (parseInt(previousQty, 10) || 0);

                if (change !== 0) {
                    await supabase
                        .from('stock_movements')
                        .insert({
                            inventory_id: id,
                            case_id: null,
                            movement_type: 'adjustment',
                            quantity_change: change,
                            previous_quantity: previousQty,
                            new_quantity: newQty,
                            reason: 'Edit item',
                            recorded_by: (req.user?.email) || 'system'
                        });
                }
            }
        } catch (movementErr) {
            console.warn('⚠️  Could not log stock movement (updateInventoryItem):', movementErr.message);
        }

        console.log(`✅ Updated inventory item ID ${id}`);
        res.json({ success: true, item: updatedItem });
    } catch (err) {
        console.error('❌ Error updating inventory item:', err);
        res.status(500).json({ success: false, error: 'Failed to update inventory item', details: err.message });
    }
};

// --- GET SINGLE INVENTORY ITEM ---
exports.getInventoryItem = async (req, res) => {
    const { id } = req.params;

    const supabase = req.app.locals.supabase;
    if (!supabase) return res.status(500).json({ success: false, error: 'Database not configured' });

    try {
        const { data: item, error } = await supabase
            .from('inventory')
            .select('*')
            .eq('id', id)
            .single();

        if (error || !item) {
            return res.status(404).json({ success: false, error: 'Inventory item not found' });
        }

        res.json({ success: true, item });
    } catch (err) {
        console.error('❌ Error fetching inventory item:', err);
        res.status(500).json({ success: false, error: 'Failed to fetch inventory item', details: err.message });
    }
};

// --- DELETE INVENTORY ITEM ---
exports.deleteInventoryItem = async (req, res) => {
    const { id } = req.params;

    const supabase = req.app.locals.supabase;
    if (!supabase) return res.status(500).json({ success: false, error: 'Database not configured' });

    try {
        // 1. Check for ACTIVE reservations (cannot delete if currently reserved)
        const { count, error: countErr } = await supabase
            .from('reservations')
            .select('*', { count: 'exact', head: true })
            .eq('inventory_id', id)
            .is('released_at', null);

        if (countErr) throw countErr;

        if (count > 0) {
            return res.status(400).json({ success: false, error: 'Cannot delete item with active reservations' });
        }

        // 2. Cascade Delete: Remove dependencies (History)
        // We delete these first to satisfy Foreign Key constraints

        // A. Stock Take Items
        const { error: stiErr } = await supabase
            .from('stock_take_items')
            .delete()
            .eq('inventory_id', id);
        if (stiErr) throw stiErr;

        // B. Stock Movements
        const { error: smErr } = await supabase
            .from('stock_movements')
            .delete()
            .eq('inventory_id', id);
        if (smErr) throw smErr;

        // C. Inactive Reservations (Active ones checked above)
        const { error: resErr } = await supabase
            .from('reservations')
            .delete()
            .eq('inventory_id', id);
        if (resErr) throw resErr;

        // 3. Delete the Inventory Item itself
        const { error: deleteErr } = await supabase
            .from('inventory')
            .delete()
            .eq('id', id);

        if (deleteErr) throw deleteErr;

        console.log(`✅ Deleted inventory item ID ${id} and its history`);
        res.json({ success: true, message: 'Inventory item and history deleted successfully' });
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
        try { await query(`CREATE INDEX IF NOT EXISTS idx_inventory_model_color ON inventory (UPPER(model), UPPER(color))`); } catch (_) { }
        try { await query(`ALTER TABLE inventory ALTER COLUMN low_stock_threshold SET DEFAULT 1`); } catch (_) { }

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

exports.sendWeeklyReportManual = async (req, res) => {
    try {
        const { days, startDate, endDate } = req.body;
        // Pass the whole object as options
        const result = await sendWeeklyReportLogic({ days, startDate, endDate });
        if (result.success) {
            res.json({ success: true, message: result.message });
        } else {
            res.status(500).json({ success: false, error: result.error || result.message });
        }
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

// --- MANUAL STOCK EMAIL REPORT ---
exports.sendStockReportManual = async (req, res) => {
    try {
        console.log('📧 Manual trigger: sending stock report...');
        const result = await sendStockReportLogic();
        if (result.success) {
            res.json({ success: true, message: 'Stock report email sent successfully' });
        } else {
            res.status(500).json({ success: false, error: result.error || 'Failed to send report' });
        }
    } catch (err) {
        console.error('❌ Manual stock report error:', err);
        res.status(500).json({ success: false, error: err.message });
    }
};

// --- STOCK TRANSFERS ---

// GET Transfers
exports.getTransfers = async (req, res) => {
    try {
        const supabase = req.app.locals.supabase;
        if (!supabase) return res.status(500).json({ success: false, error: 'Database not configured' });

        const { status } = req.query; // pending, in_transit, completed

        // Manual join for drivers since we need name (drivers is INT id, stock_transfers.driver_id is INT)
        let query = supabase
            .from('stock_transfers')
            .select('*')
            .order('created_at', { ascending: false });

        if (status) query = query.eq('status', status);

        const { data: transfers, error } = await query;
        if (error) throw error;

        // Fetch driver names manually
        const driverIds = [...new Set(transfers.map(t => t.driver_id).filter(Boolean))];
        let driversMap = {};
        if (driverIds.length > 0) {
            const { data: drivers } = await supabase.from('drivers').select('id, name').in('id', driverIds);
            if (drivers) drivers.forEach(d => driversMap[d.id] = d.name);
        }

        const enriched = transfers.map(t => ({
            ...t,
            driver_name: driversMap[t.driver_id] || 'Unknown'
        }));

        res.json({ success: true, transfers: enriched });

    } catch (err) {
        console.error('❌ Get Transfers Error:', err);
        res.status(500).json({ success: false, error: err.message });
    }
};

// CREATE Transfer (Gate Pass Request)
exports.createTransfer = async (req, res) => {
    try {
        console.log('📦 createTransfer called with body:', JSON.stringify(req.body));
        const { from_location, to_location, driver_id, items, notes } = req.body;
        // items: [{ inventory_id, quantity, name, model, color }]

        const supabase = req.app.locals.supabase;
        if (!supabase) {
            console.error('❌ Database not configured');
            return res.status(500).json({ success: false, error: 'Database not configured' });
        }
        console.log('Context: Supabase client exists');

        // Generate Transfer Number
        const year = new Date().getFullYear();
        const { data: max } = await supabase.from('stock_transfers')
            .select('transfer_number')
            .ilike('transfer_number', `TRF-${year}-%`)
            .order('transfer_number', { ascending: false })
            .limit(1)
            .maybeSingle();
        console.log('🔢 Max transfer number query result:', max);

        let seq = 1;
        if (max && max.transfer_number) {
            const match = max.transfer_number.match(/TRF-\d+-(\d+)/);
            if (match) seq = parseInt(match[1]) + 1;
        }
        const transfer_number = `TRF-${year}-${String(seq).padStart(3, '0')}`;

        const { data, error } = await supabase.from('stock_transfers').insert({
            transfer_number,
            from_location,
            to_location,
            driver_id: driver_id || null,
            items: items || [],
            status: 'pending',
            notes,
            created_by: req.user ? req.user.email : 'system'
        }).select().single();

        if (error) {
            console.error('❌ Insert Error:', error);
            throw error;
        }
        console.log('✅ Transfer created:', data);

        res.status(201).json({ success: true, transfer: data });

    } catch (err) {
        console.error('❌ Create Transfer Error:', err);
        res.status(500).json({ success: false, error: err.message });
    }
};



// UPDATE Transfer (Edit Driver/Notes)
exports.updateTransfer = async (req, res) => {
    try {
        const { id } = req.params;
        const { driver_id, notes } = req.body;
        const supabase = req.app.locals.supabase;

        if (!supabase) return res.status(500).json({ success: false, error: 'Database not configured' });

        // Update fields
        const updates = {};
        if (driver_id !== undefined) updates.driver_id = driver_id === '' ? null : driver_id;
        if (notes !== undefined) updates.notes = notes;
        if (notes !== undefined) updates.notes = notes;

        const { data: updated, error } = await supabase
            .from('stock_transfers')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;

        // If driver changed and it's already dispatched, maybe notify new driver?
        // keeping it simple for now, just update record.

        res.json({ success: true, transfer: updated });

    } catch (err) {
        console.error('❌ Update Transfer Error:', err);
        res.status(500).json({ success: false, error: err.message });
    }
};

// DISPATCH Transfer (Deduct Stock)
exports.dispatchTransfer = async (req, res) => {
    try {
        const { id } = req.params; // Transfer ID
        const supabase = req.app.locals.supabase;
        if (!supabase) return res.status(500).json({ success: false, error: 'Database not configured' });

        const { data: transfer, error: fetchError } = await supabase
            .from('stock_transfers')
            .select('*')
            .eq('id', id)
            .single();

        if (fetchError || !transfer) return res.status(404).json({ success: false, error: 'Transfer not found' });
        if (transfer.status !== 'pending') return res.status(400).json({ success: false, error: 'Transfer already dispatched or processed' });

        // Process Items
        const items = transfer.items || [];
        for (const item of items) {
            // 1. Deduct from Source
            const { data: invItem } = await supabase.from('inventory').select('stock_quantity, reserved_quantity').eq('id', item.inventory_id).single();
            if (invItem) {
                const newQty = (invItem.stock_quantity || 0) - (item.quantity || 0);

                await supabase.from('inventory').update({ stock_quantity: newQty }).eq('id', item.inventory_id);

                // Log Movement
                await supabase.from('stock_movements').insert({
                    inventory_id: item.inventory_id,
                    movement_type: 'transfer_out',
                    quantity_change: -1 * Math.abs(item.quantity),
                    previous_quantity: invItem.stock_quantity,
                    new_quantity: newQty,
                    reason: `Transfer ${transfer.transfer_number} to ${transfer.to_location}`,
                    driver_id: transfer.driver_id,
                    transfer_id: transfer.id,
                    recorded_by: req.user ? req.user.email : 'system'
                });
            }
        }

        // Update Transfer Status
        const { data: updated, error: updateError } = await supabase
            .from('stock_transfers')
            .update({
                status: 'in_transit',
                dispatched_at: new Date().toISOString()
            })
            .eq('id', id)
            .select()
            .single();

        if (updateError) throw updateError;

        // --- NEW: Notify Driver via SMS ---
        if (transfer.driver_id) {
            try {
                // Fetch driver phone
                const { data: driver } = await supabase.from('drivers').select('phone_number, name').eq('id', transfer.driver_id).single();
                if (driver && driver.phone_number) {
                    const msg = `TFS Dispatch: Hello ${driver.name}, new transfer ${transfer.transfer_number} assigned. From: ${transfer.from_location} To: ${transfer.to_location}. Please collect items.`;
                    await smsService.sendSMS(driver.phone_number, msg);
                }
            } catch (smsErr) {
                console.warn('⚠️ Driver notification failed:', smsErr.message);
            }
        }

        res.json({ success: true, transfer: updated });

    } catch (err) {
        console.error('❌ Dispatch Transfer Error:', err);
        res.status(500).json({ success: false, error: err.message });
    }
};

// RECEIVE Transfer (Add Stock)
exports.receiveTransfer = async (req, res) => {
    try {
        const { id } = req.params;
        const supabase = req.app.locals.supabase;

        const { data: transfer, error: fetchError } = await supabase
            .from('stock_transfers')
            .select('*')
            .eq('id', id)
            .single();

        if (fetchError || !transfer) return res.status(404).json({ success: false, error: 'Transfer not found' });
        if (transfer.status !== 'in_transit') return res.status(400).json({ success: false, error: 'Transfer not in transit' });

        const items = transfer.items || [];
        for (const item of items) {
            // Find equivalent item at Dest
            // Matching by Name + Category + Model + Color + Location = Dest
            let query = supabase.from('inventory')
                .select('id, stock_quantity')
                .eq('location', transfer.to_location)
                .ilike('name', item.name) // Name match
                .eq('category', 'coffin');

            if (item.model) query = query.ilike('model', item.model);
            if (item.color) query = query.ilike('color', item.color);

            const { data: matches } = await query;
            let destItemId = null;
            let prevQty = 0;

            if (matches && matches.length > 0) {
                // Found existing pile
                destItemId = matches[0].id;
                prevQty = matches[0].stock_quantity;
            } else {
                // Create new item pile at Dest
                const { data: sourceItem } = await supabase.from('inventory').select('*').eq('id', item.inventory_id).single();
                const newItem = {
                    ...sourceItem,
                    id: undefined,
                    created_at: undefined,
                    updated_at: undefined,
                    location: transfer.to_location,
                    stock_quantity: 0,
                    reserved_quantity: 0
                };
                const { data: created } = await supabase.from('inventory').insert(newItem).select().single();
                destItemId = created.id;
            }

            // Increment
            const newQty = prevQty + (item.quantity || 0);
            await supabase.from('inventory').update({ stock_quantity: newQty }).eq('id', destItemId);

            // Log Movement
            await supabase.from('stock_movements').insert({
                inventory_id: destItemId,
                movement_type: 'transfer_in',
                quantity_change: item.quantity,
                previous_quantity: prevQty,
                new_quantity: newQty,
                reason: `Transfer ${transfer.transfer_number} from ${transfer.from_location}`,
                driver_id: transfer.driver_id,
                transfer_id: transfer.id,
                recorded_by: req.user ? req.user.email : 'system'
            });
        }

        // Complete Transfer
        const { data: updated, error: updateError } = await supabase
            .from('stock_transfers')
            .update({
                status: 'completed',
                received_at: new Date().toISOString(),
                received_by: req.user ? req.user.email : 'system'
            })
            .eq('id', id)
            .select()
            .single();

        if (updateError) throw updateError;

        res.json({ success: true, transfer: updated });

    } catch (err) {
        console.error('❌ Receive Transfer Error:', err);
        res.status(500).json({ success: false, error: err.message });
    }
};

// CANCEL TRANSFER
exports.cancelTransfer = async (req, res) => {
    try {
        const { id } = req.params;
        const supabase = req.app.locals.supabase;

        // Only allow cancel if pending
        const { data: transfer } = await supabase.from('stock_transfers').select('status').eq('id', id).single();
        if (transfer && transfer.status !== 'pending') {
            return res.status(400).json({ success: false, error: 'Cannot cancel transfer that is already dispatched' });
        }

        const { error } = await supabase.from('stock_transfers').update({ status: 'cancelled' }).eq('id', id);
        if (error) throw error;

        res.json({ success: true, message: 'Transfer cancelled' });

    } catch (err) {
        console.error('Cancel Transfer Error:', err);
        res.status(500).json({ success: false, error: err.message });
    }
};

exports.notifyCasketUsage = notifyCasketUsage;
exports.maybeNotifyLowStock = maybeNotifyLowStock;
