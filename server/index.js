// server/index.js
const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

app.use(cors({
  origin: 'https://admintfs.onrender.com'  // YOUR FRONTEND URL
}));


// Health check endpoint

const app = express();
app.use(cors());
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
    .select('*', { count: 'exact', head: true }); // head: true = only count

  if (error) {
    console.error('Supabase connection failed:', error.message);
  } else {
    console.log(`TFS DATABASE CONNECTED — ${count} cases found`);
  }
}
testSupabase();

app.locals.supabase = supabase;

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'TFS API is running',
    timestamp: new Date().toISOString()
  });
});

// API Routes
try {
  app.use('/api/cases', require('./routes/cases'));
  console.log('✅ Cases route registered');
} catch (err) {
  console.error('❌ Error loading cases route:', err);
}

try {
  app.use('/api/dashboard', require('./routes/dashboard'));
  console.log('✅ Dashboard route registered');
} catch (err) {
  console.error('❌ Error loading dashboard route:', err);
}

try {
  app.use('/api/roster', require('./routes/roster'));
  console.log('✅ Roster route registered');
} catch (err) {
  console.error('❌ Error loading roster route:', err);
}

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ 
    error: 'Internal server error',
    message: err.message 
  });
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