// server/database/test-connection.js
// Test database connection
require('dotenv').config();
const { Pool } = require('pg');

const testConnection = async () => {
  console.log('🔍 Testing database connection...\n');
  
  // Display connection info (without password)
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error('❌ DATABASE_URL not found in .env file');
    process.exit(1);
  }
  
  // Mask password in display
  const maskedUrl = dbUrl.replace(/:([^:@]+)@/, ':***@');
  console.log('📍 Connection String:', maskedUrl);
  console.log('🔒 SSL: Enabled (required for Supabase)\n');
  
  const pool = new Pool({
    connectionString: dbUrl,
    ssl: {
      rejectUnauthorized: false
    },
    connectionTimeoutMillis: 10000,
  });
  
  try {
    console.log('⏳ Attempting to connect...');
    const client = await pool.connect();
    console.log('✅ Connection successful!');
    
    // Test query
    const result = await client.query('SELECT NOW() as current_time, version() as postgres_version');
    console.log('✅ Query test successful!');
    console.log('📅 Current time:', result.rows[0].current_time);
    console.log('🗄️  PostgreSQL version:', result.rows[0].postgres_version.split(',')[0]);
    
    // Test table existence
    const tablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);
    
    console.log(`\n📊 Found ${tablesResult.rows.length} tables in database:`);
    tablesResult.rows.forEach(row => {
      console.log(`   - ${row.table_name}`);
    });
    
    client.release();
    await pool.end();
    
    console.log('\n✅ Database connection test completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Connection failed!');
    console.error('Error:', error.message);
    console.error('Code:', error.code);
    
    if (error.code === 'ENOTFOUND') {
      console.error('\n💡 DNS Error - Possible issues:');
      console.error('   1. Check if Supabase project is active (not paused)');
      console.error('   2. Verify the hostname is correct');
      console.error('   3. Check your internet connection');
      console.error('   4. Try using Supabase connection pooling URL');
    } else if (error.code === 'ETIMEDOUT' || error.code === 'ECONNREFUSED') {
      console.error('\n💡 Connection Timeout - Possible issues:');
      console.error('   1. Firewall blocking the connection');
      console.error('   2. Supabase project might be paused');
      console.error('   3. Network connectivity issues');
    } else if (error.code === '28P01') {
      console.error('\n💡 Authentication Error - Possible issues:');
      console.error('   1. Password might be incorrect');
      console.error('   2. Password might need URL encoding');
      console.error('   3. Check Supabase database password');
    }
    
    await pool.end();
    process.exit(1);
  }
};

testConnection();

