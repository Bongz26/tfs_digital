// Quick database connection test
require('dotenv').config();
const { Pool } = require('pg');

console.log('🔍 Testing database connection...\n');

// Check if DATABASE_URL is set
if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL is not set in .env file!');
  process.exit(1);
}

// Show connection details (without password)
const dbUrl = process.env.DATABASE_URL;
const urlParts = dbUrl.match(/postgresql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)/);
if (urlParts) {
  console.log('📋 Connection details:');
  console.log('   Username:', urlParts[1]);
  console.log('   Password:', urlParts[2].substring(0, 3) + '***' + urlParts[2].substring(urlParts[2].length - 3));
  console.log('   Host:', urlParts[3]);
  console.log('   Port:', urlParts[4]);
  console.log('   Database:', urlParts[5]);
  console.log('');
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  },
  connectionTimeoutMillis: 10000
});

pool.connect()
  .then(client => {
    console.log('✅ Connection successful!');
    return client.query('SELECT NOW() as current_time, version() as pg_version')
      .then(res => {
        console.log('   Current time:', res.rows[0].current_time);
        console.log('   PostgreSQL version:', res.rows[0].pg_version.split(',')[0]);
        client.release();
        pool.end();
        process.exit(0);
      });
  })
  .catch(err => {
    console.error('❌ Connection failed!');
    console.error('   Error:', err.message);
    console.error('   Code:', err.code);
    
    if (err.code === 'ENOTFOUND') {
      console.error('\n💡 This means the hostname cannot be resolved. Possible causes:');
      console.error('   1. Supabase project is paused - check dashboard');
      console.error('   2. Hostname is incorrect');
      console.error('   3. Network/DNS issue');
      console.error('\n   Go to: https://supabase.com/dashboard/project/uucjdcbtpunfsyuixsmc');
      console.error('   Check if project is active, then copy the connection string again');
    } else if (err.code === 'XX000' || err.message.includes('Tenant')) {
      console.error('\n💡 Username or authentication issue');
      console.error('   Check your password and username format');
    } else if (err.code === 'ECONNREFUSED') {
      console.error('\n💡 Connection refused');
      console.error('   Check if the hostname and port are correct');
    }
    
    pool.end();
    process.exit(1);
  });

