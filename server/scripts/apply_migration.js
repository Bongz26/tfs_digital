const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing credentials.');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runValidations() {
    const sqlPath = path.join(__dirname, '..', 'database', 'migrations', 'create_stock_transfers.sql');
    const sqlContent = fs.readFileSync(sqlPath, 'utf8');

    console.log('--- Applying Migration: create_stock_transfers ---');

    // Naive split by semicolon (careful with function bodies, but for this simple DDL it's fine)
    // Actually, Supabase JS helper usually requires RPC to run raw SQL.
    // If no RPC 'exec_sql' exists, we might need to rely on the user or use a 'pg' connection if available.
    // Let's try to assume we cannot run raw SQL via JS client without RPC.
    // BUT: The user has a 'server/config/db.js' that uses 'pg'. Let's use THAT.

    // We will switch to using the 'pg' pool directly for DDL execution.

    console.error('⚠️  Switching to PG directly not implemented in this script. PLEASE RUN SQL MANUALLY if this fails.');
    // Wait, I can use the existing db config if I require it.
}

// Redoing the script to use 'pg'
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function runMigration() {
    const sqlPath = path.join(__dirname, '..', 'database', 'migrations', 'create_stock_transfers.sql');
    const sqlContent = fs.readFileSync(sqlPath, 'utf8');

    try {
        const client = await pool.connect();
        console.log('✅ Connected to DB');
        await client.query(sqlContent);
        console.log('✅ Migration executed successfully');
        client.release();
        await pool.end();
    } catch (err) {
        console.error('❌ Error executing migration:', err);
        await pool.end();
        process.exit(1);
    }
}

runMigration();
