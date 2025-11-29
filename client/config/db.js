// server/config/db.js
const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
require('dotenv').config();

// Check if DATABASE_URL is set
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error('❌ ERROR: DATABASE_URL environment variable is not set!');
  console.error('');
  console.error('   For LOCAL development:');
  console.error('   Add DATABASE_URL to your server/.env file');
  console.error('   Format: DATABASE_URL=postgresql://postgres:[PASSWORD]@db.xxxxx.supabase.co:5432/postgres');
  console.error('');
  console.error('   For RENDER (production):');
  console.error('   1. Go to your Render dashboard → Your Service → Environment');
  console.error('   2. Click "Add Environment Variable"');
  console.error('   3. Key: DATABASE_URL');
  console.error('   4. Value: Your Supabase connection string');
  console.error('   5. Get connection string from: Supabase → Settings → Database → Connection string');
  console.error('');
  process.exit(1);
}

// Validate DATABASE_URL format
if (!databaseUrl.includes('supabase.co') && !databaseUrl.includes('@')) {
  console.warn('⚠️  WARNING: DATABASE_URL does not appear to be a Supabase connection string');
  console.warn('   Current value starts with:', databaseUrl.substring(0, 30) + '...');
}

// Parse connection string to force IPv4 if needed
let connectionConfig = {
  connectionString: databaseUrl,
  ssl: {
    rejectUnauthorized: false // Supabase uses self-signed certificates
  },
  // Additional connection options
  connectionTimeoutMillis: 10000, // 10 seconds
  idleTimeoutMillis: 30000, // 30 seconds
  max: 20 // Maximum number of clients in the pool
};

// Force IPv4 if connection string contains IPv6 (Render network issue)
// Replace IPv6 hostname with IPv4 or use connection pooling
try {
  const url = new URL(databaseUrl);
  // If hostname is an IPv6 address, try to use connection pooling instead
  if (url.hostname.includes(':') && url.hostname.includes('db.')) {
    console.warn('⚠️  Detected IPv6 address in DATABASE_URL - this may cause ENETUNREACH errors on Render');
    console.warn('   Solution: Use connection pooling string from Supabase instead');
    console.warn('   Format: postgresql://postgres:[PASSWORD]@aws-0-[region].pooler.supabase.com:6543/postgres');
  }
} catch (e) {
  // URL parsing failed, continue with original connection string
}

const pool = new Pool(connectionConfig);

// Test database connection
pool.on('connect', () => {
  console.log('✅ Database connected successfully');
});

pool.on('error', (err) => {
  console.error('❌ Database connection error:', err.message);
  if (err.code === 'ECONNREFUSED') {
    console.error('   This usually means:');
    console.error('   1. DATABASE_URL is pointing to localhost instead of Supabase');
    console.error('   2. The database server is not running (if using local PostgreSQL)');
    console.error('   3. DATABASE_URL is incorrect or missing');
    console.error('   Check your .env file and ensure DATABASE_URL points to your Supabase database');
  } else if (err.code === 'XX000' || err.message.includes('Tenant or user not found')) {
    console.error('   This usually means:');
    console.error('   1. Username format is incorrect for pooler connection');
    console.error('   2. Try using direct connection instead of pooler');
    console.error('   3. Or use username format: postgres (not postgres.PROJECT_REF)');
    console.error('   For direct connection, use: postgresql://postgres:[PASSWORD]@db.xxxxx.supabase.co:5432/postgres');
    console.error('   For pooler, username should be: postgres (not postgres.xxxxx)');
  } else if (err.code === 'ENOTFOUND') {
    console.error('   This usually means:');
    console.error('   1. Supabase project might be paused - check dashboard');
    console.error('   2. Hostname in DATABASE_URL is incorrect');
    console.error('   3. Network/DNS issue');
  }
  // Don't exit in production, just log the error
  if (process.env.NODE_ENV !== 'production') {
    // process.exit(-1);
  }
});

// Helper function to execute queries
const query = async (text, params) => {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    console.log('Executed query', { text, duration, rows: res.rowCount });
    return res;
  } catch (error) {
    console.error('Query error', { text, error: error.message });
    throw error;
  }
};

// Helper function to get a client from the pool for transactions
const getClient = async () => {
  const client = await pool.connect();
  const query = client.query.bind(client);
  const release = client.release.bind(client);
  
  // Set a timeout of 5 seconds, after which we will log this client's last query
  const timeout = setTimeout(() => {
    console.error('A client has been checked out for more than 5 seconds!');
  }, 5000);
  
  // Monkey patch the query method to log the query when a client is released
  client.release = () => {
    clearTimeout(timeout);
    return release();
  };
  
  return client;
};

module.exports = {
  query,
  getClient,
  pool
};

