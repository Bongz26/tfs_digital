// server/index.js — API ONLY (NO FRONTEND SERVING)

// ---------------------
// 1️⃣ Import dependencies
// ---------------------
const express = require("express");
const cors = require("cors");
const { createClient } = require("@supabase/supabase-js");
require("dotenv").config();

// ---------------------
// 2️⃣ Initialize Express
// ---------------------
const app = express();

// ---------------------
// 3️⃣ CORS CONFIGURATION
// ---------------------
const allowedOrigins = [
  "http://localhost:3000",
  "https://admintfs.onrender.com",
  "https://tfs-frontend.onrender.com",
];

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      } else {
        console.warn("❌ Blocked by CORS:", origin);
        return callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  })
);

// Parse JSON bodies
app.use(express.json());

// ---------------------
// 4️⃣ CONNECT TO SUPABASE
// ---------------------
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

console.log('SUPABASE_URL:', process.env.SUPABASE_URL);
console.log('SUPABASE_ANON_KEY:', process.env.SUPABASE_ANON_KEY ? 'OK' : 'MISSING');

// Quick test to confirm DB connectivity on startup
async function testDB() {
  try {
    const { count, error } = await supabase
      .from("cases")
      .select("*", { count: "exact", head: true });
    if (error) {
      console.error("⚠️ DB ERROR:", error.message);
    } else {
      console.log(`✅ DB CONNECTED — ${count} cases`);
    }
  } catch (err) {
    console.error("❌ Supabase Connection Failed:", err.message);
  }
}
testDB();

// Store supabase client in app.locals for route access
app.locals.supabase = supabase;

// ---------------------
// 5️⃣ BASIC HEALTH CHECK ROUTE
// ---------------------
app.get("/api/health", (req, res) => {
  res.json({ status: "OK", time: new Date().toISOString() });
});

// ---------------------
// 6️⃣ IMPORT AND USE ROUTES
// ---------------------

// Load routes with error handling
function loadRoute(routePath, routeName) {
  try {
    const route = require(routePath);
    if (typeof route === 'function') {
      console.log(`✅ Loaded route: ${routeName}`);
      return route;
    } else {
      console.error(`❌ Route ${routeName} is not a function:`, typeof route);
      return null;
    }
  } catch (error) {
    console.error(`❌ Failed to load route ${routeName}:`, error.message);
    return null;
  }
}

// Load all routes
const casesRoute = loadRoute('./routes/cases', 'cases');
const dashboardRoute = loadRoute('./routes/dashboard', 'dashboard');
const rosterRoute = loadRoute('./routes/roster', 'roster');
const activeCasesRoute = loadRoute('./routes/activeCases', 'activeCases');
const vehiclesRoute = loadRoute('./routes/vehicles', 'vehicles');
const inventoryRoute = loadRoute('./routes/inventory', 'inventory');

// Register routes that loaded successfully
if (casesRoute) app.use("/api/cases", casesRoute);
if (dashboardRoute) app.use("/api/dashboard", dashboardRoute);
if (rosterRoute) app.use("/api/roster", rosterRoute);
if (activeCasesRoute) app.use("/api/activeCases", activeCasesRoute);
if (vehiclesRoute) app.use("/api/vehicles", vehiclesRoute);
if (inventoryRoute) app.use("/api/inventory", inventoryRoute);

// ---------------------
// 🚀 ENHANCED PROFESSIONAL INVENTORY ROUTES
// ---------------------

// Get all inventory with advanced filtering
// Enhanced /api/inventory route with debugging
// server/index.js (or inventory.js if you separate routes)
app.get('/api/inventory', async (req, res) => {
  try {
    const { category } = req.query;
    console.log('📌 /api/inventory called, category:', category);

    let query = req.app.locals.supabase
      .from('inventory')
      .select('*')
      .order('category')
      .order('name');

    if (category && category !== 'all') {
      console.log('🔹 Filtering by category:', category);
      query = query.eq('category', category);
    }

    const { data, error } = await query;
    if (error) throw error;

    console.log(`📦 Total items fetched: ${data.length}`);

    const inventoryWithAvailable = data.map(item => {
      const available = item.stock_quantity - (item.reserved_quantity || 0);
      const isLowStock = available <= item.low_stock_threshold;

      console.log(`Item: ${item.name}`);
      console.log(`  Stock: ${item.stock_quantity}, Reserved: ${item.reserved_quantity || 0}`);
      console.log(`  Available: ${available}, Low Threshold: ${item.low_stock_threshold}`);
      console.log(`  is_low_stock: ${isLowStock}`);

      return {
        ...item,
        available_quantity: available,
        is_low_stock: isLowStock
      };
    });

    const lowStockCount = inventoryWithAvailable.filter(i => i.is_low_stock).length;
    console.log(`🚨 Total low stock items: ${lowStockCount}`);

    res.json({
      success: true,
      inventory: inventoryWithAvailable,
      total: inventoryWithAvailable.length,
      low_stock_count: lowStockCount
    });
  } catch (error) {
    console.error('❌ Error fetching inventory:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/inventory/debug-low-stock', async (req, res) => {
  try {
    const { data, error } = await req.app.locals.supabase
      .from('inventory')
      .select('*');

    if (error) throw error;

    const debug = data.map(item => {
      const available = item.stock_quantity - (item.reserved_quantity || 0);
      return {
        id: item.id,
        name: item.name,
        stock_quantity: item.stock_quantity,
        reserved_quantity: item.reserved_quantity || 0,
        low_stock_threshold: item.low_stock_threshold,
        available,
        is_low_stock: available <= item.low_stock_threshold
      };
    });

    console.log('🛠 DEBUG LOW STOCK:', debug);
    res.json({ success: true, debug });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: error.message });
  }
});


// Get stock movement history (REPORTS)
app.get('/api/inventory/reports/movement', async (req, res) => {
  try {
    const { days = 30 } = req.query;
    
    const { data: movements, error } = await req.app.locals.supabase
      .from('stock_movements')
      .select(`
        *,
        inventory:inventory_id (name, category, sku),
        cases:case_id (case_number, deceased_name)
      `)
      .gte('movement_date', new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString())
      .order('movement_date', { ascending: false });

    if (error) throw error;

    res.json({ success: true, movements });
  } catch (error) {
    console.error('Error fetching movement report:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update stock quantity
app.patch('/api/inventory/:id/stock', async (req, res) => {
  try {
    const { stock_quantity, reason } = req.body;
    const { id } = req.params;
    
    console.log(`📦 Updating stock for item ${id} to ${stock_quantity}`);
    
    // Get current stock for history
    const { data: currentItem, error: fetchError } = await req.app.locals.supabase
      .from('inventory')
      .select('stock_quantity, name')
      .eq('id', id)
      .single();

    if (fetchError) throw fetchError;

    // Update stock
    const { data, error } = await req.app.locals.supabase
      .from('inventory')
      .update({ stock_quantity })
      .eq('id', id)
      .select();

    if (error) throw error;
    if (data.length === 0) {
      return res.status(404).json({ success: false, error: 'Inventory item not found' });
    }

    // Record stock movement for reporting
    await req.app.locals.supabase
      .from('stock_movements')
      .insert({
        inventory_id: id,
        movement_type: 'adjustment',
        quantity_change: stock_quantity - currentItem.stock_quantity,
        previous_quantity: currentItem.stock_quantity,
        new_quantity: stock_quantity,
        reason: reason || 'Manual adjustment',
        recorded_by: 'admin' // You can add user authentication later
      });

    res.json({ success: true, item: data[0] });
  } catch (error) {
    console.error('Error updating inventory stock:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Create new inventory item
app.post('/api/inventory', async (req, res) => {
  try {
    const { name, category, sku, stock_quantity, unit_price, low_stock_threshold, location } = req.body;
    
    const { data, error } = await req.app.locals.supabase
      .from('inventory')
      .insert([
        {
          name,
          category,
          sku,
          stock_quantity: stock_quantity || 0,
          unit_price: unit_price || 0,
          low_stock_threshold: low_stock_threshold || 2,
          location: location || 'Manekeng Showroom'
        }
      ])
      .select();

    if (error) throw error;

    res.status(201).json({ success: true, item: data[0] });
  } catch (error) {
    console.error('Error creating inventory item:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Add this temporary debug route
app.get('/api/inventory/debug-low-stock', async (req, res) => {
  try {
    const { data, error } = await req.app.locals.supabase
      .from('inventory')
      .select('*');

    if (error) throw error;

    const debugInfo = data.map(item => {
      const available = item.stock_quantity - (item.reserved_quantity || 0);
      return {
        name: item.name,
        stock_quantity: item.stock_quantity,
        reserved_quantity: item.reserved_quantity || 0,
        available: available,
        low_stock_threshold: item.low_stock_threshold,
        should_be_low_stock: available <= item.low_stock_threshold,
        calculation: `${available} <= ${item.low_stock_threshold} = ${available <= item.low_stock_threshold}`
      };
    });

    res.json({ success: true, debug: debugInfo });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get inventory statistics for dashboard 
app.get('/api/inventory/stats', async (req, res) => {
  try {
    const { data, error } = await req.app.locals.supabase
      .from('inventory')
      .select('*');

    if (error) throw error;

    const stats = {
      total_items: data.length,
      total_value: data.reduce((sum, item) => sum + (item.stock_quantity * (item.unit_price || 0)), 0),
      low_stock_items: data.filter(item => {
        const available = item.stock_quantity - (item.reserved_quantity || 0);
        return available <= item.low_stock_threshold;
      }).length,
      out_of_stock: data.filter(item => {
        const available = item.stock_quantity - (item.reserved_quantity || 0);
        return available <= 0;
      }).length,
      categories: {}
    };

    // Count by category
    data.forEach(item => {
      stats.categories[item.category] = (stats.categories[item.category] || 0) + 1;
    });

    console.log(`📊 Inventory Stats: ${stats.total_items} items, R${stats.total_value} value, ${stats.low_stock_items} low stock`);

    res.json({ success: true, stats });
  } catch (error) {
    console.error('Error fetching inventory stats:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get stock movement history (REPORTS) 
app.get('/api/inventory/reports/movement', async (req, res) => {
  try {
    // First, let's check if the stock_movements table exists
    const { data, error } = await req.app.locals.supabase
      .from('stock_movements')
      .select(`
        *,
        inventory:inventory_id (name, category, sku)
      `)
      .order('movement_date', { ascending: false })
      .limit(50);

    if (error) {
      console.log('Stock movements table might not exist yet:', error.message);
      // Return empty array if table doesn't exist
      return res.json({ success: true, movements: [] });
    }

    res.json({ success: true, movements: data });
  } catch (error) {
    console.error('Error fetching movement report:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ---------------------
// 7️⃣ START SERVER
// ---------------------
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 TFS API LIVE on port ${PORT}`);
  console.log(`📍 API endpoints: http://localhost:${PORT}/api`);
  console.log(`🏥 Health check: http://localhost:${PORT}/api/health`);
});

// ---------------------
//  💤 KEEP SERVER AWAKE
// ---------------------
if (process.env.RENDER_EXTERNAL_URL) {
  const SELF_URL = process.env.RENDER_EXTERNAL_URL;
  setInterval(() => {
    fetch(`${SELF_URL}/api/health`)
      .then(res => res.ok && console.log('💓 Keep-alive ping OK'))
      .catch(err => console.warn('⚠️ Keep-alive failed:', err.message));
  }, 14 * 60 * 1000);
}