// server/routes/purchaseOrders.js

const express = require('express');
const router = express.Router();
const nodemailer = require('nodemailer');
// Use shared DB config (Supabase/Postgres via DATABASE_URL)
const { pool, query, getClient } = require('../config/db');

const { createClient } = require("@supabase/supabase-js");
require("dotenv").config();

// Initialize Supabase client with fallback to SUPABASE_KEY if SUPABASE_ANON_KEY is not set
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("⚠️  WARNING: Supabase credentials not found!");
  console.error("   SUPABASE_URL:", supabaseUrl ? "✅ Set" : "❌ Missing");
  console.error("   SUPABASE_ANON_KEY or SUPABASE_KEY:", supabaseKey ? "✅ Set" : "❌ Missing");
  console.error("   Please check your .env file");
}

const supabase = supabaseUrl && supabaseKey 
  ? createClient(supabaseUrl, supabaseKey)
  : null;

// --- GET ALL SUPPLIERS ---
router.get('/suppliers', async (req, res) => {
  try {
    const suppliers = await query('SELECT id, name, email, phone, contact_person FROM suppliers ORDER BY name');
    res.json({ success: true, suppliers: suppliers.rows || [] });
  } catch (err) {
    console.error('❌ Error fetching suppliers:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch suppliers', details: err.message });
  }
});

// --- CREATE NEW PURCHASE ORDER ---
router.post("/", async (req, res) => {
  console.log("📥 POST /api/purchase-orders - Request received at", new Date().toISOString());
  console.log("📦 Request body:", req.body);

  // Set a timeout for the response
  const timeout = setTimeout(() => {
    if (!res.headersSent) {
      console.error("⏱️  Request timeout - no response sent after 10 seconds");
      res.status(500).json({
        success: false,
        message: "Request timeout - database operation took too long",
        error: "Timeout after 10 seconds"
      });
    }
  }, 10000);

  try {
    // Check if Supabase is configured
    if (!supabase) {
      clearTimeout(timeout);
      console.error("❌ Supabase client not initialized!");
      return res.status(500).json({
        success: false,
        message: "Supabase not configured",
        error: "SUPABASE_URL and SUPABASE_ANON_KEY (or SUPABASE_KEY) must be set in .env file"
      });
    }

    const { po_number, supplier_id, supplier_name, order_date, expected_delivery, created_by } = req.body;

    // Validate required fields
    if (!po_number || !order_date) {
      clearTimeout(timeout);
      return res.status(400).json({
        success: false,
        message: "Missing required fields",
        required: ["po_number", "order_date", "supplier_id or supplier_name"]
      });
    }

    // Lookup supplier_id if supplier_name is provided
    let finalSupplierId = supplier_id;
    if (supplier_name && !supplier_id) {
      const supplierResult = await query('SELECT id FROM suppliers WHERE name = $1', [supplier_name]);
      if (!supplierResult.rows.length) {
        clearTimeout(timeout);
        return res.status(400).json({
          success: false,
          message: "Supplier not found",
          error: `Supplier "${supplier_name}" does not exist. Please add the supplier first.`
        });
      }
      finalSupplierId = supplierResult.rows[0].id;
    }

    if (!finalSupplierId) {
      clearTimeout(timeout);
      return res.status(400).json({
        success: false,
        message: "Supplier required",
        error: "Please provide either supplier_id or supplier_name"
      });
    }

    console.log("🔄 Attempting Supabase insert...");
    const startTime = Date.now();

    // Create a promise with timeout wrapper
    const insertPromise = supabase
      .from("purchase_orders")
      .insert([
        { po_number, supplier_id: finalSupplierId, order_date, expected_delivery, created_by }
      ])
      .select();

    // Wrap with timeout
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error("Supabase query timeout after 8 seconds")), 8000);
    });

    let result;
    try {
      result = await Promise.race([insertPromise, timeoutPromise]);
    } catch (timeoutErr) {
      if (timeoutErr.message.includes("timeout")) {
        clearTimeout(timeout);
        console.error("⏱️  Supabase query timed out");
        return res.status(500).json({
          success: false,
          message: "Database operation timed out",
          error: "The database query took too long to complete. Please check your Supabase connection."
        });
      }
      throw timeoutErr;
    }

    const { data, error } = result;

    const duration = Date.now() - startTime;
    console.log(`⏱️  Supabase query completed in ${duration}ms`);

    clearTimeout(timeout);

    if (error) {
      console.error("❌ Supabase Error:", error);
      return res.status(500).json({
        success: false,
        message: "Database insert failed",
        error: error.message,
        details: error
      });
    }

    console.log("✅ Purchase Order created successfully:", data);
    const purchaseOrder = data?.[0] || data;
    return res.json({
      success: true,
      message: "Purchase Order created successfully",
      purchase_order: purchaseOrder,
      data: purchaseOrder // Also include as 'data' for compatibility
    });

  } catch (err) {
    clearTimeout(timeout);
    console.error("❌ Server Error:", err);
    console.error("   Error stack:", err.stack);
    
    // Make sure we send a response
    if (!res.headersSent) {
      return res.status(500).json({
        success: false,
        message: "Server error during PO creation",
        error: err.message
      });
    }
  }
});


// --- ADD ITEM TO PURCHASE ORDER ---
router.post('/:poId/items', async (req, res) => {
  const { poId } = req.params;
  const { inventory_id, quantity_ordered, unit_cost } = req.body;

  try {
    const result = await query(
      `INSERT INTO purchase_order_items 
       (po_id, inventory_id, quantity_ordered, unit_cost)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [poId, inventory_id, quantity_ordered, unit_cost]
    );

    res.json({ success: true, item: result.rows[0] });
  } catch (err) {
    console.error('Error adding PO item:', err);
    res.status(500).json({ success: false, error: 'Failed to add item to purchase order' });
  }
});

// --- RECEIVE GRV (Update Inventory & Stock Movements) ---
router.post('/:poId/receive', async (req, res) => {
  const { poId } = req.params;
  const { received_items, received_by } = req.body;
  // received_items: [{ inventory_id, quantity_received }]

  const client = await getClient();

  try {
    await client.query('BEGIN');

    let totalAmount = 0;

    for (const item of received_items) {
      const { inventory_id, quantity_received } = item;

      // 1. Get current stock and unit cost
      const inventoryRes = await client.query(
        'SELECT stock_quantity, unit_price FROM inventory WHERE id = $1',
        [inventory_id]
      );
      if (inventoryRes.rows.length === 0)
        throw new Error(`Inventory item ${inventory_id} not found`);

      const previous_quantity = inventoryRes.rows[0].stock_quantity;
      const unit_price = inventoryRes.rows[0].unit_price;

      const new_quantity = previous_quantity + quantity_received;

      // 2. Update inventory
      await client.query(
        'UPDATE inventory SET stock_quantity = $1, updated_at = NOW() WHERE id = $2',
        [new_quantity, inventory_id]
      );

      // 3. Record stock movement
      await client.query(
        `INSERT INTO stock_movements
         (inventory_id, movement_type, quantity_change, previous_quantity, new_quantity, reason, recorded_by)
         VALUES ($1, 'purchase', $2, $3, $4, 'GRV Received', $5)`,
        [inventory_id, quantity_received, previous_quantity, new_quantity, received_by || 'system']
      );

      // 4. Update PO item received quantity
      await client.query(
        'UPDATE purchase_order_items SET received_quantity = $1 WHERE po_id = $2 AND inventory_id = $3',
        [quantity_received, poId, inventory_id]
      );

      totalAmount += quantity_received * unit_price;
    }

    // 5. Update PO total amount & status
    await client.query(
      'UPDATE purchase_orders SET total_amount = $1, status = $2 WHERE id = $3',
      [totalAmount, 'received', poId]
    );

    await client.query('COMMIT');
    res.json({ success: true, message: 'GRV processed and inventory updated' });
  } catch (err) {
    try {
      await client.query('ROLLBACK');
    } catch (rollbackErr) {
      console.error('Error during rollback:', rollbackErr);
    }
    console.error('❌ Error receiving GRV:', err.message);
    console.error('   Full error:', err);
    res.status(500).json({ 
      success: false, 
      error: err.message,
      details: 'Failed to process GRV. Check server logs for details.'
    });
  } finally {
    client.release();
  }
});

// --- GET ALL PURCHASE ORDERS WITH ITEMS ---
router.get('/', async (req, res) => {
  console.log('📥 GET /api/purchase-orders - Request received at', new Date().toISOString());
  
  try {
    // Check if table exists first
    const tableCheck = await query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'purchase_orders'
      );
    `);
    
    if (!tableCheck.rows[0].exists) {
      console.error('❌ purchase_orders table does not exist!');
      return res.status(500).json({
        success: false,
        error: 'Database table not found',
        message: 'The purchase_orders table does not exist. Please run the database migration: npm run init-db',
        hint: 'Run: cd server && npm run init-db'
      });
    }

    const poRes = await query('SELECT * FROM purchase_orders ORDER BY order_date DESC');
    const pos = poRes.rows || [];
    console.log(`✅ Fetched ${pos.length} purchase orders`);

    // Fetch items for each PO
    for (const po of pos) {
      try {
        const itemsRes = await query(
          `SELECT poi.*, i.name AS inventory_name
           FROM purchase_order_items poi
           LEFT JOIN inventory i ON poi.inventory_id = i.id
           WHERE poi.po_id = $1`,
          [po.id]
        );
        po.items = itemsRes.rows || [];
      } catch (innerErr) {
        console.error(`⚠️  Error fetching items for PO ${po.id}:`, innerErr.message);
        po.items = []; // Fallback so endpoint does not fail
      }
    }

    res.json({ success: true, purchase_orders: pos });
  } catch (err) {
    console.error('❌ Error fetching POs:', err.message);
    console.error('   Error code:', err.code);
    console.error('   Error detail:', err.detail);
    console.error('   Full error:', err);
    
    // Provide more helpful error messages
    let errorMessage = err.message;
    let hint = '';
    
    if (err.code === '42P01') {
      errorMessage = 'Table does not exist';
      hint = 'Run: cd server && npm run init-db to create the database tables';
    } else if (err.code === '28P01' || err.message.includes('password')) {
      errorMessage = 'Database authentication failed';
      hint = 'Check your DATABASE_URL in the .env file';
    } else if (err.message.includes('timeout') || err.code === 'ETIMEDOUT') {
      errorMessage = 'Database connection timeout';
      hint = 'Check your database connection and network';
    }
    
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch purchase orders',
      message: errorMessage,
      code: err.code,
      hint: hint || 'Check server logs for more details'
    });
  }
});



// --- PROCESS/SEND PURCHASE ORDER (Email to Supplier) ---
router.post('/:poId/process', async (req, res) => {
  const { poId } = req.params;
  const { admin_email } = req.body; // Email to send copy to

  try {
    // Get PO with items and supplier info
    const poResult = await query(
      `SELECT po.*, s.name as supplier_name, s.email as supplier_email, s.contact_person, s.phone
       FROM purchase_orders po
       JOIN suppliers s ON po.supplier_id = s.id
       WHERE po.id = $1`,
      [poId]
    );

    if (!poResult.rows.length) {
      return res.status(404).json({ success: false, error: 'Purchase order not found' });
    }

    const po = poResult.rows[0];

    // Get PO items with full inventory details
    const itemsResult = await query(
      `SELECT poi.*, i.name AS inventory_name, i.sku, i.category, i.description
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

    // Calculate total
    const total = items.reduce((sum, item) => sum + (item.quantity_ordered * item.unit_cost), 0);

    // Create email transporter
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: false, // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    // Create professional HTML email content
    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; background-color: #f5f5f5; }
          .email-container { max-width: 800px; margin: 20px auto; background-color: #ffffff; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
          .header { background: linear-gradient(135deg, #dc3545 0%, #c82333 100%); color: white; padding: 30px 40px; text-align: center; }
          .header h1 { font-size: 28px; margin-bottom: 5px; font-weight: 600; }
          .header .po-number { font-size: 18px; opacity: 0.95; }
          .company-info { background-color: #f8f9fa; padding: 25px 40px; border-bottom: 3px solid #dc3545; }
          .company-info h2 { color: #dc3545; font-size: 20px; margin-bottom: 15px; }
          .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-top: 15px; }
          .info-item { padding: 10px 0; }
          .info-item strong { color: #555; display: block; margin-bottom: 5px; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; }
          .info-item span { color: #333; font-size: 15px; }
          .content { padding: 30px 40px; }
          .section-title { color: #dc3545; font-size: 18px; margin-bottom: 20px; padding-bottom: 10px; border-bottom: 2px solid #e9ecef; }
          table { width: 100%; border-collapse: collapse; margin: 25px 0; background-color: white; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
          thead { background: linear-gradient(135deg, #dc3545 0%, #c82333 100%); color: white; }
          th { padding: 15px; text-align: left; font-weight: 600; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px; }
          th:nth-child(2) { text-align: center; }
          th:nth-child(3), th:nth-child(4) { text-align: right; }
          td { padding: 15px; border-bottom: 1px solid #e9ecef; }
          td:nth-child(2) { text-align: center; font-weight: 600; }
          td:nth-child(3), td:nth-child(4) { text-align: right; }
          tbody tr:hover { background-color: #f8f9fa; }
          tbody tr:last-child td { border-bottom: none; }
          .item-name { font-weight: 600; color: #333; }
          .item-description { font-size: 12px; color: #666; margin-top: 3px; }
          .totals-section { margin-top: 30px; padding-top: 20px; border-top: 2px solid #e9ecef; }
          .total-row { display: flex; justify-content: space-between; padding: 12px 0; font-size: 16px; }
          .total-row.grand-total { font-size: 22px; font-weight: 700; color: #dc3545; padding-top: 15px; border-top: 2px solid #dc3545; margin-top: 10px; }
          .total-label { font-weight: 600; }
          .instructions { background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 20px; margin: 25px 0; border-radius: 4px; }
          .instructions h3 { color: #856404; margin-bottom: 10px; font-size: 16px; }
          .instructions ul { margin-left: 20px; color: #856404; }
          .instructions li { margin: 5px 0; }
          .footer { background-color: #343a40; color: #ffffff; padding: 25px 40px; text-align: center; font-size: 13px; }
          .footer p { margin: 5px 0; opacity: 0.9; }
          .footer .company-name { font-weight: 600; font-size: 15px; margin-bottom: 10px; }
        </style>
      </head>
      <body>
        <div class="email-container">
          <div class="header">
            <h1>PURCHASE ORDER</h1>
            <div class="po-number">PO Number: ${po.po_number}</div>
          </div>
          
          <div class="company-info">
            <h2>THUSANANG FUNERAL SERVICES</h2>
            <div class="info-grid">
              <div class="info-item">
                <strong>Order Date</strong>
                <span>${new Date(po.order_date).toLocaleDateString('en-ZA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
              </div>
              <div class="info-item">
                <strong>Expected Delivery</strong>
                <span>${po.expected_delivery ? new Date(po.expected_delivery).toLocaleDateString('en-ZA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : 'To be confirmed'}</span>
              </div>
              <div class="info-item">
                <strong>Supplier</strong>
                <span>${po.supplier_name}</span>
              </div>
              ${po.contact_person ? `
              <div class="info-item">
                <strong>Contact Person</strong>
                <span>${po.contact_person}${po.phone ? ` | ${po.phone}` : ''}</span>
              </div>
              ` : ''}
            </div>
          </div>

          <div class="content">
            <h2 class="section-title">Items Requested</h2>
            <table>
              <thead>
                <tr>
                  <th style="width: 45%;">Item Description</th>
                  <th style="width: 15%;">Quantity</th>
                  <th style="width: 20%;">Unit Price</th>
                  <th style="width: 20%;">Line Total</th>
                </tr>
              </thead>
              <tbody>
                ${items.map((item, index) => `
                  <tr>
                    <td>
                      <div class="item-name">${item.inventory_name || 'Item #' + item.inventory_id}</div>
                      ${item.sku ? `<div class="item-description">SKU: ${item.sku}</div>` : ''}
                    </td>
                    <td>${item.quantity_ordered}</td>
                    <td>R ${parseFloat(item.unit_cost).toFixed(2)}</td>
                    <td><strong>R ${(item.quantity_ordered * item.unit_cost).toFixed(2)}</strong></td>
                  </tr>
                `).join('')}
              </tbody>
            </table>

            <div class="totals-section">
              <div class="total-row">
                <span class="total-label">Subtotal:</span>
                <span>R ${total.toFixed(2)}</span>
              </div>
              <div class="total-row">
                <span class="total-label">VAT (0%):</span>
                <span>R 0.00</span>
              </div>
              <div class="total-row grand-total">
                <span class="total-label">TOTAL AMOUNT:</span>
                <span>R ${total.toFixed(2)}</span>
              </div>
            </div>

            <div class="instructions">
              <h3>📋 Delivery Instructions</h3>
              <ul>
                <li>Please confirm receipt of this purchase order within 24 hours</li>
                <li>Ensure all items meet the specified quantities and quality standards</li>
                <li>Contact us immediately if there are any issues or delays</li>
                <li>Include delivery note with all items</li>
                <li>Expected delivery date: ${po.expected_delivery ? new Date(po.expected_delivery).toLocaleDateString('en-ZA') : 'To be confirmed'}</li>
              </ul>
            </div>

            <div style="margin-top: 30px; padding: 20px; background-color: #f8f9fa; border-radius: 4px;">
              <p style="margin-bottom: 10px;"><strong>Payment Terms:</strong> Payment will be processed upon receipt and verification of goods.</p>
              <p style="margin-bottom: 10px;"><strong>Delivery Address:</strong> Please confirm delivery location with our team.</p>
              <p><strong>Contact:</strong> For any queries regarding this order, please contact us immediately.</p>
            </div>
          </div>

          <div class="footer">
            <div class="company-name">THUSANANG FUNERAL SERVICES</div>
            <p>This is an official Purchase Order. Please confirm receipt.</p>
            <p style="margin-top: 15px; opacity: 0.7;">Generated by TFS Digital Purchase Order System</p>
          </div>
        </div>
      </body>
      </html>
    `;

    // Send email to supplier
    let supplierEmailSent = false;
    if (po.supplier_email) {
      try {
        await transporter.sendMail({
          from: process.env.SMTP_USER,
          to: po.supplier_email,
          subject: `Purchase Order ${po.po_number} - TFS Digital`,
          html: emailHtml,
        });
        supplierEmailSent = true;
        console.log(`✅ Email sent to supplier: ${po.supplier_email}`);
      } catch (emailErr) {
        console.error('❌ Error sending email to supplier:', emailErr);
      }
    }

    // Send copy to admin
    let adminEmailSent = false;
    if (admin_email) {
      try {
        await transporter.sendMail({
          from: process.env.SMTP_USER,
          to: admin_email,
          subject: `Purchase Order ${po.po_number} - Copy (Sent to ${po.supplier_name})`,
          html: emailHtml + `<p><strong>Note:</strong> This is a copy. Email sent to supplier: ${po.supplier_email || 'No email on file'}</p>`,
        });
        adminEmailSent = true;
        console.log(`✅ Copy sent to admin: ${admin_email}`);
      } catch (emailErr) {
        console.error('❌ Error sending copy to admin:', emailErr);
      }
    }

    // Update PO status
    await query('UPDATE purchase_orders SET status = $1 WHERE id = $2', ['sent', poId]);

    res.json({
      success: true,
      message: 'Purchase order processed',
      supplier_email_sent: supplierEmailSent,
      admin_email_sent: adminEmailSent,
      supplier_email: po.supplier_email,
      admin_email: admin_email || null,
    });

  } catch (err) {
    console.error('❌ Error processing PO:', err);
    res.status(500).json({ success: false, error: 'Failed to process purchase order', details: err.message });
  }
});

// --- TEST ENDPOINT ---
router.get('/test', (req, res) => {
  console.log('✅ Test endpoint hit at', new Date().toISOString());
  res.json({ 
    success: true, 
    message: 'Purchase Orders API test endpoint is working!',
    timestamp: new Date().toISOString(),
    path: '/api/purchase-orders/test'
  });
});

module.exports = router;
