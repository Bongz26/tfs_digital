/**
 * Migration: Add user_profiles table for authentication
 * Run: node server/database/migrate-add-user-profiles.js
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
        console.log('🚀 Starting migration: Add user_profiles table...\n');

        // Create user_profiles table
        console.log('Creating user_profiles table...');
        await client.query(`
            CREATE TABLE IF NOT EXISTS user_profiles (
                id SERIAL PRIMARY KEY,
                user_id UUID UNIQUE NOT NULL,
                email VARCHAR(120) UNIQUE NOT NULL,
                full_name VARCHAR(100) NOT NULL,
                phone VARCHAR(20),
                role VARCHAR(20) DEFAULT 'staff' CHECK (role IN ('admin', 'manager', 'staff', 'driver')),
                active BOOLEAN DEFAULT TRUE,
                last_login TIMESTAMP,
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            );
        `);
        console.log('✅ user_profiles table created');

        // Create indexes
        console.log('Creating indexes...');
        await client.query(`CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON user_profiles(user_id);`);
        await client.query(`CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON user_profiles(email);`);
        await client.query(`CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON user_profiles(role);`);
        await client.query(`CREATE INDEX IF NOT EXISTS idx_user_profiles_active ON user_profiles(active);`);
        console.log('✅ Indexes created');

        // Create audit_log table
        console.log('Creating audit_log table...');
        await client.query(`
            CREATE TABLE IF NOT EXISTS audit_log (
                id SERIAL PRIMARY KEY,
                user_id UUID,
                user_email VARCHAR(120),
                action VARCHAR(50) NOT NULL,
                resource_type VARCHAR(50),
                resource_id INT,
                old_values JSONB,
                new_values JSONB,
                ip_address VARCHAR(45),
                user_agent TEXT,
                created_at TIMESTAMP DEFAULT NOW()
            );
        `);
        console.log('✅ audit_log table created');

        // Create audit_log indexes
        await client.query(`CREATE INDEX IF NOT EXISTS idx_audit_log_user_id ON audit_log(user_id);`);
        await client.query(`CREATE INDEX IF NOT EXISTS idx_audit_log_action ON audit_log(action);`);
        await client.query(`CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON audit_log(created_at);`);
        console.log('✅ audit_log indexes created');

        // Add user tracking columns to existing tables
        console.log('Adding user tracking columns to existing tables...');
        
        const tables = ['cases', 'inventory', 'purchase_orders'];
        for (const table of tables) {
            try {
                await client.query(`ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS created_by_user_id UUID;`);
                await client.query(`ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS updated_by_user_id UUID;`);
                console.log(`  ✅ ${table} - columns added`);
            } catch (e) {
                console.log(`  ⚠️ ${table} - ${e.message}`);
            }
        }

        // Add user_id to stock_movements
        try {
            await client.query(`ALTER TABLE stock_movements ADD COLUMN IF NOT EXISTS user_id UUID;`);
            console.log('  ✅ stock_movements - user_id column added');
        } catch (e) {
            console.log(`  ⚠️ stock_movements - ${e.message}`);
        }

        // Verify structure
        const result = await client.query(`
            SELECT column_name, data_type, character_maximum_length 
            FROM information_schema.columns 
            WHERE table_name = 'user_profiles' 
            ORDER BY ordinal_position;
        `);

        console.log('\n📋 user_profiles table structure:');
        console.table(result.rows);

        // Check if we have any users
        const userCount = await client.query(`SELECT COUNT(*) as count FROM user_profiles;`);
        console.log(`\n👥 Current user count: ${userCount.rows[0].count}`);

        console.log('\n✅ Migration completed successfully!');
        console.log('\n📝 Next steps:');
        console.log('   1. Set SUPABASE_SERVICE_KEY in your .env file (for admin user creation)');
        console.log('   2. Create your first admin user via the API');
        console.log('   3. Enable Row Level Security in Supabase dashboard if needed');

    } catch (err) {
        console.error('❌ Migration failed:', err.message);
        throw err;
    } finally {
        client.release();
        await pool.end();
    }
}

runMigration().catch(console.error);

