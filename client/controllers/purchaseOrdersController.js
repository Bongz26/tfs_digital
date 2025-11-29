const { query, getClient } = require('../config/db');
const supabase = require('../config/supabaseClient');
const nodemailer = require('nodemailer');

// --- GET ALL SUPPLIERS ---
exports.getSuppliers = async (req, res) => {
    try {
        const suppliers = await query(
            'SELECT id, name, email, phone, contact_person, supplier_system_type, supplier_system_id, supplier_api_endpoint FROM suppliers ORDER BY name'
        );
        res.json({ success: true, suppliers: suppliers.rows || [] });
    } catch (err) {
        console.error('❌ Error fetching suppliers:', err);
        res.status(500).json({ success: false, error: 'Failed to fetch suppliers', details: err.message });
    }
};

// --- CREATE NEW PURCHASE ORDER ---
// --- CREATE NEW PURCHASE ORDER ---
exports.createPurchaseOrder = async (req, res) => {
    console.log("📥 POST /api/purchase-orders - Request received at", new Date().toISOString());

    const client = await getClient();

    try {
        const { po_number, supplier_id, supplier_name, order_date, expected_delivery, created_by, manual_supplier_email, items } = req.body;

        if (!po_number || !order_date) {
            return res.status(400).json({
                success: false,
                message: "Missing required fields",
                error: "PO number and order date are required"
            });
        }

        if (!supplier_name) {
            return res.status(400).json({
                success: false,
                message: "Supplier name is required",
                error: "Please provide supplier_name"
            });
        }

        await client.query('BEGIN');

        let finalSupplierId = supplier_id ? parseInt(supplier_id, 10) : null;

        // Resolve Supplier
        if (finalSupplierId) {
            const verifyResult = await client.query('SELECT id FROM suppliers WHERE id = $1', [finalSupplierId]);
            if (!verifyResult.rows.length) {
                finalSupplierId = null;
            }
        }

        if (!finalSupplierId && supplier_name) {
            const supplierResult = await client.query('SELECT id FROM suppliers WHERE name = $1', [supplier_name]);

            if (!supplierResult.rows.length) {
                console.log(`📝 Creating new supplier: ${supplier_name}`);
                const newSupplierResult = await client.query(
                    'INSERT INTO suppliers (name, email) VALUES ($1, $2) RETURNING id',
                    [supplier_name, manual_supplier_email || null]
                );
                finalSupplierId = newSupplierResult.rows[0].id;
            } else {
                finalSupplierId = supplierResult.rows[0].id;
            }
        }

        if (!finalSupplierId) {
            await client.query('ROLLBACK');
            return res.status(400).json({
                success: false,
                message: "Failed to resolve supplier",
                error: "Could not find or create supplier"
            });
        }

        // Create PO Header
        const insertPO = await client.query(
            `INSERT INTO purchase_orders 
             (po_number, supplier_id, order_date, expected_delivery, created_by, manual_supplier_email, status)
             VALUES ($1, $2, $3, $4, $5, $6, 'draft')
             RETURNING *`,
            [po_number, finalSupplierId, order_date, expected_delivery || null, created_by || 'system', manual_supplier_email || null]
        );

        const newPO = insertPO.rows[0];

        // Insert Items if provided
        if (items && Array.isArray(items) && items.length > 0) {
            for (const item of items) {
                if (!item.inventory_id) {
                    console.warn(`⚠️ Skipping item without inventory_id:`, item);
                    continue;
                }

                // Always fetch price from inventory first (as source of truth)
                const inventoryRes = await client.query(
                    'SELECT unit_price FROM inventory WHERE id = $1',
                    [item.inventory_id]
                );

                let finalUnitCost = 0;
                if (inventoryRes.rows.length > 0) {
                    const inventoryPrice = inventoryRes.rows[0].unit_price;
                    finalUnitCost = inventoryPrice !== null && inventoryPrice !== undefined ? parseFloat(inventoryPrice) : 0;
                } else {
                    console.log(`⚠️ Inventory item ${item.inventory_id} not found, using default price 0`);
                }

                // Parse provided unit_cost - only use if it's a valid positive number
                if (item.unit_cost !== null && item.unit_cost !== undefined && item.unit_cost !== '') {
                    const parsedCost = parseFloat(item.unit_cost);
                    if (!isNaN(parsedCost) && parsedCost > 0) {
                        finalUnitCost = parsedCost;
                        console.log(`💰 Using provided unit_cost: R${finalUnitCost} for item ${item.inventory_id} (inventory price: R${inventoryRes.rows[0]?.unit_price || 0})`);
                    } else {
                        console.log(`📦 Provided unit_cost is invalid (${item.unit_cost}), using inventory price: R${finalUnitCost} for item ${item.inventory_id}`);
                    }
                } else {
                    console.log(`📦 No unit_cost provided, using inventory price: R${finalUnitCost} for item ${item.inventory_id}`);
                }

                await client.query(
                    `INSERT INTO purchase_order_items 
                     (po_id, inventory_id, quantity_ordered, unit_cost)
                     VALUES ($1, $2, $3, $4)`,
                    [newPO.id, item.inventory_id, item.quantity_ordered, finalUnitCost]
                );
            }
        }

        await client.query('COMMIT');

        console.log("✅ Purchase Order created successfully:", newPO.po_number);

        // Fetch full PO with items to return
        const fullPOResult = await client.query('SELECT * FROM purchase_orders WHERE id = $1', [newPO.id]);
        const fullPO = fullPOResult.rows[0];

        // Attach items (simplified fetch for response)
        if (items && items.length > 0) {
            fullPO.items = items;
        }

        return res.json({
            success: true,
            message: "Purchase Order created successfully",
            purchase_order: fullPO
        });

    } catch (err) {
        await client.query('ROLLBACK');
        console.error("❌ Server Error:", err);
        return res.status(500).json({
            success: false,
            message: "Server error during PO creation",
            error: err.message
        });
    } finally {
        client.release();
    }
};

// --- UPDATE PURCHASE ORDER ---
exports.updatePurchaseOrder = async (req, res) => {
    const { id } = req.params;
    const { po_number, order_date, expected_delivery, manual_supplier_email } = req.body;

    const client = await getClient();

    try {
        const result = await client.query(
            `UPDATE purchase_orders 
             SET po_number = COALESCE($1, po_number),
                 order_date = COALESCE($2, order_date),
                 expected_delivery = COALESCE($3, expected_delivery),
                 manual_supplier_email = COALESCE($4, manual_supplier_email),
                 updated_at = NOW()
             WHERE id = $5 AND status = 'draft'
             RETURNING *`,
            [po_number, order_date, expected_delivery, manual_supplier_email, id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Purchase order not found or not in draft status'
            });
        }

        res.json({ success: true, purchase_order: result.rows[0] });
    } catch (err) {
        console.error('Error updating PO:', err);
        res.status(500).json({ success: false, error: 'Failed to update purchase order' });
    } finally {
        client.release();
    }
};

// --- ADD ITEM TO PURCHASE ORDER ---
exports.addPOItem = async (req, res) => {
    const { poId } = req.params;
    const { inventory_id, quantity_ordered, unit_cost } = req.body;

    try {
        if (!inventory_id) {
            return res.status(400).json({ 
                success: false, 
                error: 'inventory_id is required' 
            });
        }

        // Always fetch price from inventory first (as source of truth)
        const inventoryRes = await query(
            'SELECT unit_price FROM inventory WHERE id = $1',
            [inventory_id]
        );

        if (inventoryRes.rows.length === 0) {
            return res.status(404).json({ 
                success: false, 
                error: 'Inventory item not found' 
            });
        }

        const inventoryPrice = inventoryRes.rows[0].unit_price;
        const defaultPrice = inventoryPrice !== null && inventoryPrice !== undefined ? parseFloat(inventoryPrice) : 0;

        // Parse provided unit_cost - handle string, number, null, undefined
        let finalUnitCost = defaultPrice; // Default to inventory price
        if (unit_cost !== null && unit_cost !== undefined && unit_cost !== '') {
            const parsedCost = parseFloat(unit_cost);
            // Only use provided cost if it's a valid positive number
            if (!isNaN(parsedCost) && parsedCost > 0) {
                finalUnitCost = parsedCost;
                console.log(`💰 Using provided unit_cost: R${finalUnitCost} for item ${inventory_id} (inventory price: R${defaultPrice})`);
            } else {
                console.log(`📦 Provided unit_cost is invalid (${unit_cost}), using inventory price: R${defaultPrice} for item ${inventory_id}`);
            }
        } else {
            console.log(`📦 No unit_cost provided, using inventory price: R${defaultPrice} for item ${inventory_id}`);
        }

        const result = await query(
            `INSERT INTO purchase_order_items 
       (po_id, inventory_id, quantity_ordered, unit_cost)
       VALUES ($1, $2, $3, $4) RETURNING *`,
            [poId, inventory_id, quantity_ordered, finalUnitCost]
        );

        res.json({ success: true, item: result.rows[0] });
    } catch (err) {
        console.error('❌ Error adding PO item:', err);
        res.status(500).json({ success: false, error: 'Failed to add item to purchase order' });
    }
};

// --- RECEIVE GRV ---
exports.receiveGRV = async (req, res) => {
    const { poId } = req.params;
    const { received_items, received_by } = req.body;

    const client = await getClient();

    try {
        await client.query('BEGIN');

        let totalAmount = 0;

        for (const item of received_items) {
            const { inventory_id, quantity_received, new_unit_cost } = item;

            const inventoryRes = await client.query(
                'SELECT stock_quantity, unit_price FROM inventory WHERE id = $1',
                [inventory_id]
            );
            if (inventoryRes.rows.length === 0)
                throw new Error(`Inventory item ${inventory_id} not found`);

            const previous_quantity = inventoryRes.rows[0].stock_quantity;
            const unit_price = inventoryRes.rows[0].unit_price;
            const new_quantity = previous_quantity + quantity_received;

            // Update Inventory Stock & Price (if provided)
            if (new_unit_cost !== undefined && new_unit_cost !== null && new_unit_cost !== "") {
                await client.query(
                    'UPDATE inventory SET stock_quantity = $1, unit_price = $2, updated_at = NOW() WHERE id = $3',
                    [new_quantity, parseFloat(new_unit_cost), inventory_id]
                );
            } else {
                await client.query(
                    'UPDATE inventory SET stock_quantity = $1, updated_at = NOW() WHERE id = $2',
                    [new_quantity, inventory_id]
                );
            }

            // Log Movement
            await client.query(
                `INSERT INTO stock_movements
         (inventory_id, movement_type, quantity_change, previous_quantity, new_quantity, reason, recorded_by)
         VALUES ($1, 'purchase', $2, $3, $4, 'GRV Received', $5)`,
                [inventory_id, quantity_received, previous_quantity, new_quantity, received_by || 'system']
            );

            // Update PO Item Received Quantity (INCREMENT instead of overwrite)
            await client.query(
                `UPDATE purchase_order_items 
                 SET received_quantity = COALESCE(received_quantity, 0) + $1 
                 WHERE po_id = $2 AND inventory_id = $3`,
                [quantity_received, poId, inventory_id]
            );

            totalAmount += quantity_received * unit_price;
        }

        // Check if all items are fully received to determine status
        const poItemsRes = await client.query(
            'SELECT quantity_ordered, received_quantity FROM purchase_order_items WHERE po_id = $1',
            [poId]
        );

        const allReceived = poItemsRes.rows.every(item => (item.received_quantity || 0) >= item.quantity_ordered);
        const newStatus = allReceived ? 'received' : 'partial';

        // Update PO Status and Total Amount
        // Note: We accumulate total_amount here, or we could recalculate it fully. 
        // For simplicity, let's update status. Total amount usually reflects the value of the PO, not just received.
        // But if we want to track value of received goods, we might need a separate column.
        // For now, let's just update the status.

        await client.query(
            'UPDATE purchase_orders SET status = $1 WHERE id = $2',
            [newStatus, poId]
        );

        await client.query('COMMIT');
        res.json({ success: true, message: 'GRV processed and inventory updated', status: newStatus });
    } catch (err) {
        try { await client.query('ROLLBACK'); } catch (e) { }
        console.error('❌ Error receiving GRV:', err.message);
        res.status(500).json({ success: false, error: err.message });
    } finally {
        client.release();
    }
};

// --- GET ALL PURCHASE ORDERS ---
exports.getAllPurchaseOrders = async (req, res) => {
    try {
        const tableCheck = await query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'purchase_orders'
      );
    `);

        if (!tableCheck.rows[0].exists) {
            return res.status(500).json({
                success: false,
                error: 'Database table not found',
                message: 'The purchase_orders table does not exist.'
            });
        }

        const poRes = await query('SELECT * FROM purchase_orders ORDER BY order_date DESC');
        const pos = poRes.rows || [];

        for (const po of pos) {
            try {
                const itemsRes = await query(
                    `SELECT poi.*, i.name AS inventory_name, i.sku, i.unit_price AS current_inventory_price
           FROM purchase_order_items poi
           LEFT JOIN inventory i ON poi.inventory_id = i.id
           WHERE poi.po_id = $1`,
                    [po.id]
                );
                po.items = itemsRes.rows || [];
            } catch (innerErr) {
                po.items = [];
            }
        }

        res.json({ success: true, purchase_orders: pos });
    } catch (err) {
        console.error('❌ Error fetching POs:', err.message);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch purchase orders',
            message: err.message
        });
    }
};

// --- PROCESS/SEND PURCHASE ORDER ---
exports.processPurchaseOrder = async (req, res) => {
    const { poId } = req.params;
    const { admin_email } = req.body;

    try {
        const poResult = await query(
            `SELECT po.*, s.name as supplier_name, 
              COALESCE(po.manual_supplier_email, s.email) as supplier_email, 
              s.contact_person, s.phone
       FROM purchase_orders po
       JOIN suppliers s ON po.supplier_id = s.id
       WHERE po.id = $1`,
            [poId]
        );

        if (!poResult.rows.length) {
            return res.status(404).json({ success: false, error: 'Purchase order not found' });
        }

        const po = poResult.rows[0];

        const itemsResult = await query(
            `SELECT poi.*, i.name AS inventory_name, i.category, i.unit_price AS current_inventory_price
       FROM purchase_order_items poi
       LEFT JOIN inventory i ON poi.inventory_id = i.id
       WHERE poi.po_id = $1
       ORDER BY poi.id`,
            [poId]
        );

        const items = itemsResult.rows || [];
        if (items.length === 0) {
            return res.status(400).json({ success: false, error: 'Purchase order has no items' });
        }

        const subtotal = items.reduce((sum, item) => sum + (item.quantity_ordered * item.unit_cost), 0);
        const vatRate = 0.15;
        const vatAmount = subtotal * vatRate;
        const total = subtotal + vatAmount;

        if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
            return res.status(500).json({
                success: false,
                error: 'Email configuration missing',
                message: 'SMTP_USER and SMTP_PASS environment variables must be set'
            });
        }

        if (!po.supplier_email) {
            return res.status(400).json({
                success: false,
                error: 'Supplier email not found',
                supplier_name: po.supplier_name
            });
        }

        const transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST || 'smtp.gmail.com',
            port: parseInt(process.env.SMTP_PORT || '587'),
            secure: false,
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS,
            },
        });

        const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: sans-serif; line-height: 1.6; color: #333; }
          table { width: 100%; border-collapse: collapse; margin: 20px 0; }
          th, td { padding: 10px; border: 1px solid #ddd; }
          th { background-color: #f4f4f4; }
        </style>
      </head>
      <body>
        <h1>PURCHASE ORDER: ${po.po_number}</h1>
        <p><strong>Supplier:</strong> ${po.supplier_name}</p>
        <p><strong>Date:</strong> ${new Date(po.order_date).toLocaleDateString()}</p>
        
        <table>
          <thead>
            <tr>
              <th>Item</th>
              <th>Quantity</th>
              <th>Unit Price</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            ${items.map(item => `
              <tr>
                <td>${item.inventory_name || 'Item #' + item.inventory_id}</td>
                <td>${item.quantity_ordered}</td>
                <td>R ${parseFloat(item.unit_cost).toFixed(2)}</td>
                <td>R ${(item.quantity_ordered * item.unit_cost).toFixed(2)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        
        <p><strong>Subtotal:</strong> R ${subtotal.toFixed(2)}</p>
        <p><strong>VAT (15%):</strong> R ${vatAmount.toFixed(2)}</p>
        <p><strong>Total:</strong> R ${total.toFixed(2)}</p>
      </body>
      </html>
    `;

        let supplierEmailSent = false;
        try {
            await transporter.sendMail({
                from: process.env.SMTP_USER,
                to: po.supplier_email,
                subject: `Purchase Order ${po.po_number} - TFS Digital`,
                html: emailHtml,
            });
            supplierEmailSent = true;
        } catch (emailErr) {
            console.error('❌ Error sending email to supplier:', emailErr);
        }

        let adminEmailSent = false;
        if (admin_email) {
            try {
                await transporter.sendMail({
                    from: process.env.SMTP_USER,
                    to: admin_email,
                    subject: `Purchase Order ${po.po_number} - Copy`,
                    html: emailHtml,
                });
                adminEmailSent = true;
            } catch (emailErr) {
                console.error('❌ Error sending copy to admin:', emailErr);
            }
        }

        if (supplierEmailSent || adminEmailSent) {
            await query('UPDATE purchase_orders SET status = $1 WHERE id = $2', ['sent', poId]);
        }

        res.json({
            success: true,
            message: supplierEmailSent ? 'Purchase order sent successfully' : 'Purchase order processed with errors',
            supplier_email_sent: supplierEmailSent,
            admin_email_sent: adminEmailSent
        });

    } catch (err) {
        console.error('❌ Error processing PO:', err);
        res.status(500).json({
            success: false,
            error: err.message
        });
    }
};

// --- GET SUPPLIER ITEMS ---
exports.getSupplierItems = async (req, res) => {
    const { supplierId } = req.params;

    try {
        const supplierResult = await query(
            `SELECT id, name, supplier_system_type, supplier_system_id, supplier_api_endpoint, supplier_api_key 
       FROM suppliers WHERE id = $1`,
            [supplierId]
        );

        if (!supplierResult.rows.length) {
            return res.status(404).json({ success: false, error: 'Supplier not found' });
        }

        const supplier = supplierResult.rows[0];

        if (supplier.supplier_system_type && supplier.supplier_api_endpoint) {
            try {
                const response = await fetch(supplier.supplier_api_endpoint, {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': supplier.supplier_api_key ? `Bearer ${supplier.supplier_api_key}` : '',
                        ...(supplier.supplier_system_id && { 'X-Supplier-ID': supplier.supplier_system_id })
                    }
                });

                if (!response.ok) {
                    throw new Error(`Supplier API returned ${response.status}`);
                }

                const supplierItems = await response.json();
                return res.json({ success: true, items: supplierItems, source: 'external' });
            } catch (apiErr) {
                console.warn(`⚠️ Failed to fetch from supplier API: ${apiErr.message}`);
            }
        }

        const itemsResult = await query(
            'SELECT * FROM inventory WHERE supplier_id = $1 ORDER BY name',
            [supplierId]
        );

        res.json({ success: true, items: itemsResult.rows || [], source: 'internal' });

    } catch (err) {
        console.error('❌ Error fetching supplier items:', err);
        res.status(500).json({ success: false, error: 'Failed to fetch supplier items' });
    }
};

// --- DELETE PURCHASE ORDER ---
exports.deletePurchaseOrder = async (req, res) => {
    const { id } = req.params;

    try {
        // Check if PO exists and is in draft status
        const check = await query('SELECT status FROM purchase_orders WHERE id = $1', [id]);

        if (check.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Purchase order not found' });
        }

        if (check.rows[0].status !== 'draft') {
            return res.status(400).json({ success: false, error: 'Only draft purchase orders can be deleted' });
        }

        // Delete items first (if no cascade delete)
        await query('DELETE FROM purchase_order_items WHERE po_id = $1', [id]);

        // Delete the PO
        await query('DELETE FROM purchase_orders WHERE id = $1', [id]);

        res.json({ success: true, message: 'Purchase order deleted successfully' });
    } catch (err) {
        console.error('❌ Error deleting purchase order:', err);
        res.status(500).json({ success: false, error: 'Failed to delete purchase order' });
    }
};
