// server/config/db.js
const { Pool } = require('pg');
require('dotenv').config();

// Supabase requires SSL connections
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false // Supabase uses self-signed certificates
  },
  // Additional connection options
  connectionTimeoutMillis: 10000, // 10 seconds
  idleTimeoutMillis: 30000, // 30 seconds
  max: 20 // Maximum number of clients in the pool
});

// Test database connection
pool.on('connect', () => {
  console.log('✅ Database connected successfully');
});

pool.on('error', (err) => {
  console.error('❌ Database connection error:', err);
  process.exit(-1);
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

