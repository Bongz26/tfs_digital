const { exec } = require('child_process');
const fs = require('fs');
require('dotenv').config();

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
    console.error('DATABASE_URL not found in environment');
    process.exit(1);
}

// Extract connection details (basic parsing)
// postgresql://user:password@host:port/dbname
const match = DATABASE_URL.match(/postgresql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)/);
if (!match) {
    console.error('Could not parse DATABASE_URL');
    process.exit(1);
}

// We will use a script to query schema since pg_dump might not be in PATH
const { query } = require('./config/db');

async function dumpSchema() {
    try {
        let sql = '-- DATABASE SCHEMA DUMP\n';
        sql += `-- Generated: ${new Date().toISOString()}\n\n`;

        // Get Tables
        const tables = await query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            ORDER BY table_name
        `);

        for (const t of tables.rows) {
            const tableName = t.table_name;
            sql += `-- Table: ${tableName}\n`;
            sql += `CREATE TABLE IF NOT EXISTS ${tableName} (\n`;

            // Get Columns
            const cols = await query(`
                SELECT column_name, data_type, character_maximum_length, is_nullable, column_default
                FROM information_schema.columns 
                WHERE table_name = $1
                ORDER BY ordinal_position
            `, [tableName]);

            const colDefs = cols.rows.map(c => {
                let def = `    ${c.column_name} ${c.data_type}`;
                if (c.character_maximum_length) def += `(${c.character_maximum_length})`;
                if (c.is_nullable === 'NO') def += ' NOT NULL';
                if (c.column_default) def += ` DEFAULT ${c.column_default}`;
                return def;
            });

            sql += colDefs.join(',\n');
            sql += '\n);\n\n';
        }

        fs.writeFileSync('database/schema_live_dump.sql', sql);
        console.log('✅ Schema dumped to database/schema_live_dump.sql');
        process.exit(0);

    } catch (e) {
        console.error('Schema dump failed:', e);
        process.exit(1);
    }
}

dumpSchema();
