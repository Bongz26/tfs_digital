// server/index.js — API ONLY (NO FRONTEND)
const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const app = express();

// --- CORS CONFIG ---
const allowedOrigins = [
  'http://localhost:3000',
  'https://admintfs.onrender.com',  // ✅ your actual frontend
  'https://tfs-frontend.onrender.com' // optional fallback if you had an older domain
];

app.use(cors({
  origin: function (origin, callback) {
    // allow requests with no origin (like mobile apps or curl)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    } else {
      console.log('❌ Blocked by CORS:', origin);
      return callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
}));

app.use(express.json());

// SUPABASE
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// Test DB
async function testDB() {
  const { count, error } = await supabase
    .from('cases')
    .select('*', { count: 'exact', head: true });
  if (error) console.error('DB ERROR:', error.message);
  else console.log(`DB CONNECTED — ${count} cases`);
}
testDB();

app.locals.supabase = supabase;

// Health
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', time: new Date().toISOString() });
});

// API ROUTES ONLY
app.use('/api/cases', require('./routes/cases'));
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/roster', require('./routes/roster'));

// NO FRONTEND SERVING
// DELETE THESE LINES:
// app.use(express.static(...))
// app.get('*', ...)


const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 TFS API LIVE on port ${PORT}`);
  console.log(`📍 API endpoints: http://localhost:${PORT}/api`);
  console.log(`🏥 Health check: http://localhost:${PORT}/api/health`);
  console.log(`📋 Roster: http://localhost:${PORT}/api/roster`);
  console.log(`📊 Dashboard: http://localhost:${PORT}/api/dashboard`);
  console.log(`\n✅ All routes registered. Server ready!\n`);
});