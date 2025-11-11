// server/index.js
const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// CREATE APP FIRST
const app = express();

// CORS - ALLOW YOUR FRONTEND
app.use(cors({
  origin: 'https://admintfs.onrender.com'  // YOUR FRONTEND
}));

app.use(express.json());

// SUPABASE CLIENT
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// TEST CONNECTION
async function testSupabase() {
  const { data, error, count } = await supabase
    .from('cases')
    .select('*', { count: 'exact', head: true });

  if (error) {
    console.error('Supabase connection failed:', error.message);
  } else {
    console.log(`TFS DATABASE CONNECTED — ${count} cases found`);
  }
}
testSupabase();

app.locals.supabase = supabase;

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'TFS API is running',
    timestamp: new Date().toISOString()
  });
});

// API Routes
app.use('/api/cases', require('./routes/cases'));
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/roster', require('./routes/roster'));

// Error handling
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ error: 'Internal server error', message: err.message });
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