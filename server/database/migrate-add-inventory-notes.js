/**
 * Migration script to add notes column to inventory table
 * Run: node server/database/migrate-add-inventory-notes.js
 */

const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL?.includes('supabase') ? { rejectUnauthorized: false } : false
});

async function runMigration() {
    const client = await pool.connect();
    
    try {
        console.log('🚀 Starting migration: Add notes column to inventory...\n');

        // Add notes column
        console.log('Adding notes column...');
        await client.query(`
            ALTER TABLE inventory ADD COLUMN IF NOT EXISTS notes TEXT;
        `);
        console.log('✅ Notes column added (or already exists)');

        // Add SKU column if missing
        console.log('Checking SKU column...');
        await client.query(`
            ALTER TABLE inventory ADD COLUMN IF NOT EXISTS sku VARCHAR(50);
        `);
        console.log('✅ SKU column verified');

        // Add supplier_id column if missing
        console.log('Checking supplier_id column...');
        await client.query(`
            ALTER TABLE inventory ADD COLUMN IF NOT EXISTS supplier_id INT REFERENCES suppliers(id);
        `);
        console.log('✅ Supplier_id column verified');

        // Create index
        console.log('Creating index...');
        await client.query(`
            CREATE INDEX IF NOT EXISTS idx_inventory_supplier_id ON inventory(supplier_id);
        `);
        console.log('✅ Index created');

        // Verify structure
        const result = await client.query(`
            SELECT column_name, data_type, character_maximum_length 
            FROM information_schema.columns 
            WHERE table_name = 'inventory' 
            ORDER BY ordinal_position;
        `);

        console.log('\n📋 Current inventory table structure:');
        console.table(result.rows);

        console.log('\n✅ Migration completed successfully!');

    } catch (err) {
        console.error('❌ Migration failed:', err.message);
        throw err;
    } finally {
        client.release();
        await pool.end();
    }
}

runMigration().catch(console.error);

