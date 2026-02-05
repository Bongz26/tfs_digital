// index.js
require('dotenv').config();
const express = require('express');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const bodyParser = require('body-parser');
const { createClient } = require('@supabase/supabase-js');

const inventoryRoutes = require('./routes/inventory');
const inventoryController = require('./controllers/inventoryController');
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

const { scheduleWeeklyReport } = require('./cron/weeklyReport');
const { scheduleStockReport } = require('./cron/weeklyStockEmail');

const app = express();

// Initialize Services
scheduleWeeklyReport();
scheduleStockReport();

// Initialize Supabase client for routes that need it
// Initialize Supabase client for routes that need it
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_KEY;

// Prefer Service Role Key for backend operations to bypass RLS
const supabaseKey = supabaseServiceKey || supabaseAnonKey;

if (supabaseUrl && supabaseKey) {
  const supabase = createClient(supabaseUrl, supabaseKey);
  app.locals.supabase = supabase;

  if (supabaseServiceKey) {
    console.log('✅ Supabase client initialized (Service Role - RLS Bypassed)');
  } else {
    console.log('⚠️ Supabase client initialized (Anon Key - RLS Enforced)');
    console.warn('   To fix "Permission Denied" errors, add SUPABASE_SERVICE_ROLE_KEY to your .env file.');
  }
} else {
  console.warn('⚠️  Supabase credentials not found - dashboard and activeCases routes may not work');
  console.warn('   SUPABASE_URL:', supabaseUrl ? '✅ Set' : '❌ Missing');
  console.warn('   SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? '✅ Set' : '❌ Missing');
  console.warn('   SUPABASE_ANON_KEY:', supabaseAnonKey ? '✅ Set' : '❌ Missing');
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
app.get('/api/public/coffin-usage-raw', inventoryController.getPublicCoffinUsageRaw);

// Public test route for stock email (GET/POST)
app.get('/api/public/stock-email', inventoryController.sendStockReportManual);
app.post('/api/public/stock-email', inventoryController.sendStockReportManual);

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
app.use('/api/locations', requireAuth, require('./routes/locations'));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

const clientBuildPath = path.join(__dirname, '../client/build');
if (fs.existsSync(clientBuildPath)) {
  app.use(express.static(clientBuildPath));
  app.get('*', (req, res) => {
    res.sendFile(path.join(clientBuildPath, 'index.html'));
  });
}
// If client build is not present (e.g., backend-only deploy), redirect known app routes to frontend origin
else {
  const frontendOrigin = process.env.FRONTEND_URL || 'https://tfs-digital.onrender.com';
  // Redirect all non-API routes to the frontend root to ensure SPA loads
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) {
      return next();
    }
    res.redirect(`${frontendOrigin}/`);
  });
}

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Start server
const port = process.env.PORT || 5001;
app.listen(port, () => {
  console.log(`🚀 Server running on port ${port}`);
  console.log(`📍 API endpoints: http://localhost:${port}/api`);
  console.log(`🧪 Test endpoint: http://localhost:${port}/api/purchase-orders/test`);
  console.log(`🏥 Health check: http://localhost:${port}/api/health`);
});

module.exports = app;
