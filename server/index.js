// index.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { createClient } = require('@supabase/supabase-js');

const inventoryRoutes = require('./routes/inventory');
const casesRoutes = require('./routes/cases');
const purchaseOrdersRouter = require('./routes/purchaseOrders');
const dashboardRoutes = require('./routes/dashboard');
const activeCasesRoutes = require('./routes/activeCases');
const vehiclesRoutes = require('./routes/vehicles');
const rosterRoutes = require('./routes/roster');
const livestockRoutes = require('./routes/livestock');
const checklistRoutes = require('./routes/checklist');
const smsRoutes = require('./routes/sms');
const driversRoutes = require('./routes/drivers');
const directionsRoutes = require('./routes/directions');
const repatriationTripsRoutes = require('./routes/repatriationTrips');
const claimDraftsRoutes = require('./routes/claimDrafts');
const { requireAuth, requireMinRole } = require('./middleware/auth');
const authRoutes = require('./routes/auth');

const app = express();

// Initialize Supabase client for routes that need it
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_KEY;

if (supabaseUrl && supabaseKey) {
  const supabase = createClient(supabaseUrl, supabaseKey);
  app.locals.supabase = supabase;
  console.log('✅ Supabase client initialized');
} else {
  console.warn('⚠️  Supabase credentials not found - dashboard and activeCases routes may not work');
  console.warn('   SUPABASE_URL:', supabaseUrl ? '✅ Set' : '❌ Missing');
  console.warn('   SUPABASE_ANON_KEY or SUPABASE_KEY:', supabaseKey ? '✅ Set' : '❌ Missing');
}

// Middleware - CORS (allow all origins in development)
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? process.env.FRONTEND_URL || 'https://admintfs.onrender.com'
    : '*', // Allow all origins in development
  credentials: true
}));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/inventory', requireAuth, inventoryRoutes);
app.use('/api/cases', requireAuth, casesRoutes);
app.use('/api/purchase-orders', requireAuth, purchaseOrdersRouter);
app.use('/api/dashboard', requireAuth, dashboardRoutes);
app.use('/api/active-cases', requireAuth, activeCasesRoutes);
app.use('/api/vehicles', requireAuth, vehiclesRoutes);
app.use('/api/roster', requireAuth, rosterRoutes);
app.use('/api/livestock', requireAuth, livestockRoutes);
app.use('/api/checklist', requireAuth, checklistRoutes);
app.use('/api/sms', requireAuth, smsRoutes);
app.use('/api/drivers', requireAuth, driversRoutes);
app.use('/api/directions', requireAuth, directionsRoutes);
app.use('/api/repatriation-trips', requireAuth, repatriationTripsRoutes);
app.use('/api/claim-drafts', requireAuth, requireMinRole('staff'), claimDraftsRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Start server
const port = process.env.PORT || 5000;
app.listen(port, () => {
  console.log(`🚀 Server running on port ${port}`);
  console.log(`📍 API endpoints: http://localhost:${port}/api`);
  console.log(`🧪 Test endpoint: http://localhost:${port}/api/purchase-orders/test`);
  console.log(`🏥 Health check: http://localhost:${port}/api/health`);
});

module.exports = app;
