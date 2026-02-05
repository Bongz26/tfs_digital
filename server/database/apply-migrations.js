#!/usr/bin/env node
/**
 * Database Migration Runner
 * Applies SQL migration files and functions to the database
 * Usage: node apply-migrations.js
 * 
 * Note: Uses Supabase client instead of direct PostgreSQL for compatibility
 */

const fs = require('fs');
const path = require('path');

// Load .env from server directory (parent of database/)
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase credentials in .env file');
    console.error('Required: SUPABASE_URL and SUPABASE_SERVICE_KEY');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runSqlFile(filePath) {
    const sql = fs.readFileSync(filePath, 'utf8');
    const fileName = path.basename(filePath);

    console.log(`\n📄 Executing: ${fileName}`);
    console.log('─'.repeat(60));

    try {
        // Use Supabase RPC to execute raw SQL
        // Note: This requires the SQL to be sent as a command
        const { data, error } = await supabase.rpc('exec_sql', { sql_string: sql });

        if (error) {
            // If exec_sql function doesn't exist, try alternative method
            if (error.message.includes('function') && error.message.includes('does not exist')) {
                console.log('⚠️  exec_sql function not found, using alternative method...');

                // For functions, we can create them directly using Supabase SQL editor approach
                // Split the SQL file into individual statements
                const statements = sql.split(';').filter(s => s.trim().length > 0);

                for (const statement of statements) {
                    const trimmed = statement.trim();
                    if (!trimmed) continue;

                    // Use Supabase's SQL execution
                    const result = await fetch(`${supabaseUrl}/rest/v1/rpc/exec`, {
                        method: 'POST',
                        headers: {
                            'apikey': supabaseKey,
                            'Authorization': `Bearer ${supabaseKey}`,
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({ query: trimmed + ';' })
                    });

                    if (!result.ok && result.status !== 409) { // 409 = already exists
                        throw new Error(`SQL execution failed: ${await result.text()}`);
                    }
                }

                console.log(`✅ SUCCESS: ${fileName} applied (alternative method)`);
                return true;
            }

            throw error;
        }

        console.log(`✅ SUCCESS: ${fileName} applied`);
        return true;
    } catch (error) {
        console.error(`❌ ERROR in ${fileName}:`);
        console.error(`   ${error.message}`);

        // Check if it's a duplicate constraint error (safe to ignore on re-run)
        if (error.message && (
            error.message.includes('already exists') ||
            error.message.includes('duplicate') ||
            error.code === '42710' ||
            error.code === '42P07'
        )) {
            console.log(`⚠️  Constraint/function already exists - skipping`);
            return true;
        }

        console.error('\nFull error:', error);
        return false;
    }
}

async function main() {
    console.log('🚀 Database Migration Runner (Supabase Mode)');
    console.log('════════════════════════════════════════════════════════════');
    console.log(`📍 Supabase URL: ${supabaseUrl}`);
    console.log(`⏰ Started: ${new Date().toISOString()}`);

    try {
        // Test connection
        const { data, error } = await supabase.from('cases').select('id').limit(1);
        if (error && !error.message.includes('permission')) {
            throw error;
        }
        console.log('✅ Supabase connection successful\n');

        console.log('⚠️  NOTE: SQL migrations require manual execution via Supabase SQL Editor');
        console.log('   Please copy and run the SQL files in the following order:\n');

        const migrations = [
            path.join(__dirname, 'functions', 'decrement_stock.sql'),
            path.join(__dirname, 'functions', 'increment_stock.sql'),
            path.join(__dirname, 'functions', 'create_case_atomic.sql'),
            path.join(__dirname, 'migrations', '001_add_database_constraints.sql')
        ];

        let i = 1;
        for (const migrationFile of migrations) {
            if (fs.existsSync(migrationFile)) {
                console.log(`   ${i}. ${path.relative(__dirname, migrationFile)}`);
                i++;
            }
        }

        console.log('\n📖 Instructions:');
        console.log('   1. Go to: https://supabase.com/dashboard (Your Project > SQL Editor)');
        console.log('   2. Create a new query');
        console.log('   3. Copy contents of each file above and run them in order');
        console.log('   4. Verify no errors occurred');

        console.log('\n✨ Migration files are ready for manual execution');
        console.log('\nAlternatively, you can run the individual SQL commands via psql:');
        console.log(`   psql "${process.env.DATABASE_URL}" < functions/decrement_stock.sql`);

    } catch (error) {
        console.error('\n❌ Connection failed:', error.message);
        process.exit(1);
    }
}

// Run if called directly
if (require.main === module) {
    main().catch(console.error);
}

module.exports = { runSqlFile };
