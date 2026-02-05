// server/config/db.js
const { Pool } = require('pg');
const path = require('path');
const dns = require('dns');
const util = require('util');

require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
require('dotenv').config();

// Check if DATABASE_URL is set
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error('❌ ERROR: DATABASE_URL environment variable is not set!');
  process.exit(1);
}

// Helper to resolve IPv4
const resolveIPv4 = async (hostname) => {
  return new Promise((resolve, reject) => {
    // First try system DNS
    dns.resolve4(hostname, (err, addresses) => {
      if (!err && addresses && addresses.length > 0) {
        return resolve(addresses[0]);
      }

      // If system DNS fails or returns no IPv4, try Google DNS (8.8.8.8) as fallback
      const { Resolver } = dns;
      const resolver = new Resolver();
      resolver.setServers(['8.8.8.8', '8.8.4.4']);

      resolver.resolve4(hostname, (errFallback, addressesFallback) => {
        if (!errFallback && addressesFallback && addressesFallback.length > 0) {
          return resolve(addressesFallback[0]);
        }
        reject(err || errFallback || new Error('No IPv4 address found'));
      });
    });
  });
};

const initPool = async () => {
  let connectionString = databaseUrl;

  try {
    const url = new URL(databaseUrl);
    // Attempt to resolve IPv4 to bypass ENOTFOUND/IPv6 issues
    console.log(`🔍 Resolving IPv4 for ${url.hostname}...`);
    const ip = await resolveIPv4(url.hostname);
    console.log(`✅ Resolved ${url.hostname} to IPv4: ${ip}`);

    // Replace hostname with resolved IP
    const fixedUrl = new URL(databaseUrl);
    fixedUrl.hostname = ip;
    connectionString = fixedUrl.toString();
  } catch (e) {
    console.warn('⚠️ DNS resolution failed/skipped, using original URL:', e.message);
  }

  const pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 10000,
    idleTimeoutMillis: 30000,
    max: 20
  });

  pool.on('connect', () => console.log('✅ Database connected successfully'));
  pool.on('error', (err) => console.error('❌ Database connection error:', err.message));

  return pool;
};

// Singleton pool promise
let poolPromise = null;

const getPool = () => {
  if (!poolPromise) {
    poolPromise = initPool();
  }
  return poolPromise;
};

const query = async (text, params) => {
  const pool = await getPool();
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    if (duration > 100 || !text.trim().toLowerCase().startsWith('select')) {
      console.log('Executed query', { text: text.substring(0, 50) + '...', duration, rows: res.rowCount });
    }
    return res;
  } catch (error) {
    console.error('Query error', { text, error: error.message });
    throw error;
  }
};

const getClient = async () => {
  const pool = await getPool();
  const client = await pool.connect();
  // ... monkey patch release ...
  const release = client.release.bind(client);
  client.release = () => release();
  return client;
};

module.exports = {
  query,
  getClient
  // Note: We don't export pool directly to force usage of async query/getClient
};
