// server/index.js — API ONLY (NO FRONTEND SERVING)

// ---------------------
// 1️⃣ Import dependencies
// ---------------------
const express = require("express");
const cors = require("cors");
const { createClient } = require("@supabase/supabase-js");
require("dotenv").config(); // Loads .env variables into process.env

// ---------------------
// 2️⃣ Initialize Express
// ---------------------
const app = express();

// ---------------------
// 3️⃣ CORS CONFIGURATION
// ---------------------
// Allow only trusted domains to access the API.
// These are your frontend URLs that should be allowed to call the backend.
const allowedOrigins = [
  "http://localhost:3000", // For local development
  "https://admintfs.onrender.com", // ✅ Your admin frontend (main site)
  "https://tfs-frontend.onrender.com", // Optional fallback if you had another frontend domain
];

app.use('/api/ping', require('./routes/ping'));

// The middleware checks each request’s origin and decides if it’s allowed.
app.use(
  cors({
    origin: function (origin, callback) {
      // Some requests (like from Postman or mobile apps) have no origin — allow them
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin)) {
        // ✅ Allowed
        return callback(null, true);
      } else {
        // ❌ Blocked — will show in your Render logs
        console.warn("❌ Blocked by CORS:", origin);
        return callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true, // Allow cookies or authorization headers if used
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

//
const casesRouter = require('./routes/cases');
app.use('/api/cases', casesRouter);

// mounting vehicles
const vehiclesRouter = require('./routes/vehicles');
app.use('/api/vehicles', vehiclesRouter);

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
// Quick endpoint to check server status from Render or frontend
app.get("/api/health", (req, res) => {
  res.json({ status: "OK", time: new Date().toISOString() });
});


const activeCasesRouter = require('./routes/activeCases');
app.use('/api/activeCases', activeCasesRouter);
const rosterRouter = require('./routes/roster');
app.use('/api/roster', rosterRouter);


// ---------------------
// 6️⃣ IMPORT AND USE ROUTES
// ---------------------
// Make sure you have these files inside "server/routes/"
app.use("/api/cases", require("./routes/cases"));
app.use("/api/dashboard", require("./routes/dashboard"));




// ---------------------
// 7️⃣ DO NOT SERVE FRONTEND FILES HERE
// ---------------------
// ❌ Remove or comment out any "express.static" or "app.get('*')" lines
// This Render service is backend only, so your React app must be hosted separately.

// ---------------------
// 8️⃣ START SERVER
// ---------------------
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 TFS API LIVE on port ${PORT}`);
  console.log(`📍 API endpoints: http://localhost:${PORT}/api`);
  console.log(`🏥 Health check: http://localhost:${PORT}/api/health`);
  console.log(`📋 Roster: http://localhost:${PORT}/api/roster`);
  console.log(`📊 Dashboard: http://localhost:${PORT}/api/dashboard`);
  console.log(`\n✅ All routes registered. Server ready!\n`);
});

// ---------------------
//  💤 KEEP SERVER AWAKE (PING ITSELF EVERY 14 MINUTES)
// ---------------------
// Only run keep-alive if RENDER_EXTERNAL_URL is set (production)
if (process.env.RENDER_EXTERNAL_URL) {
  const SELF_URL = process.env.RENDER_EXTERNAL_URL;
  setInterval(() => {
    fetch(`${SELF_URL}/api/health`)
      .then(res => res.ok && console.log('💓 Keep-alive ping OK'))
      .catch(err => console.warn('⚠️ Keep-alive failed:', err.message));
  }, 14 * 60 * 1000); // every 14 minutes
}
