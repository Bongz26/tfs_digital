const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const connectionString = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL;

if (!connectionString) {
    console.error('Missing DATABASE_URL or SUPABASE_DB_URL');
    process.exit(1);
}

const pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false }
});

async function runMigration() {
    try {
        const sqlPath = path.join(__dirname, 'database', 'migrations', 'create_locations.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');

        console.log('Running migration...');

        const client = await pool.connect();
        try {
            await client.query(sql);
            console.log('✅ Migration returned successfully.');
        } finally {
            client.release();
        }

    } catch (err) {
        console.error('Migration failed:', err);
    } finally {
        await pool.end();
    }
}

runMigration();
