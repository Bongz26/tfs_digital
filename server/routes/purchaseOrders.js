// server/routes/purchaseOrders.js

const express = require('express');
const router = express.Router();
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

    const { po_number, supplier_id, order_date, expected_delivery, created_by } = req.body;

    // Validate required fields
    if (!po_number || !supplier_id || !order_date) {
      clearTimeout(timeout);
      return res.status(400).json({
        success: false,
        message: "Missing required fields",
        required: ["po_number", "supplier_id", "order_date"]
      });
    }

    console.log("🔄 Attempting Supabase insert...");
    const startTime = Date.now();

    // Create a promise with timeout wrapper
    const insertPromise = supabase
      .from("purchase_orders")
      .insert([
        { po_number, supplier_id, order_date, expected_delivery, created_by }
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
