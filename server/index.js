// server/index.js
const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// 1. CREATE APP FIRST
const app = express();

// 2. DYNAMIC CORS (LOCAL + RENDER)
const allowedOrigins = [
  'http://localhost:3000',           // Local dev
  'https://admintfs.onrender.com',   // Render frontend
  'https://tfs-digital.onrender.com' // Your current frontend
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  }
}));

app.use(express.json());

// 3. SUPABASE
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// Test connection
async function testSupabase() {
  const { count, error } = await supabase
    .from('cases')
    .select('*', { count: 'exact', head: true });
  if (error) console.error('Supabase failed:', error.message);
  else console.log(`TFS DB CONNECTED — ${count} cases`);
}
testSupabase();

app.locals.supabase = supabase;

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Routes
app.use('/api/cases', require('./routes/cases'));
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/roster', require('./routes/roster'));

// Error handler
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ error: 'Server error', message: err.message });
});
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 TFS API LIVE on port ${PORT}`);
  console.log(`📍 API endpoints: http://localhost:${PORT}/api`);
  console.log(`🏥 Health check: http://localhost:${PORT}/api/health`);
  console.log(`📋 Roster: http://localhost:${PORT}/api/roster`);
  console.log(`📊 Dashboard: http://localhost:${PORT}/api/dashboard`);
  console.log(`\n✅ All routes registered. Server ready!\n`);
});