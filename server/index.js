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