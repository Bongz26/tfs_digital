// Migration script to add stock_takes and stock_take_items tables
// Usage: node database/migrate-add-stock-takes.js

const fs = require('fs');
const path = require('path');
const { query } = require('../config/db');

async function checkTableExists(tableName) {
  try {
    const result = await query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = $1
      );
    `, [tableName]);
    return result.rows[0].exists;
  } catch (err) {
    return false;
  }
}

async function checkColumnExists(tableName, columnName) {
  try {
    const result = await query(`
      SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = $1 
        AND column_name = $2
      );
    `, [tableName, columnName]);
    return result.rows[0].exists;
  } catch (err) {
    return false;
  }
}

async function runMigration() {
  try {
    console.log('🔄 Running stock takes migration...');
    
    // Check if stock_take_items exists with wrong structure
    const itemsTableExists = await checkTableExists('stock_take_items');
    const hasStockTakeIdColumn = await checkColumnExists('stock_take_items', 'stock_take_id');
    
    if (itemsTableExists && !hasStockTakeIdColumn) {
      console.log('⚠️  stock_take_items table exists but has wrong structure');
      console.log('   Dropping and recreating...');
      await query('DROP TABLE IF EXISTS stock_take_items CASCADE');
    }
    
    // Create stock_takes table
    await query(`
      CREATE TABLE IF NOT EXISTS stock_takes (
        id SERIAL PRIMARY KEY,
        taken_by VARCHAR(100) NOT NULL,
        status VARCHAR(20) DEFAULT 'in_progress',
        created_at TIMESTAMP DEFAULT NOW(),
        completed_at TIMESTAMP
      )
    `);
    console.log('✅ Created/verified stock_takes table');
    
    // Create stock_take_items table
    await query(`
      CREATE TABLE stock_take_items (
        id SERIAL PRIMARY KEY,
        stock_take_id INT NOT NULL REFERENCES stock_takes(id) ON DELETE CASCADE,
        inventory_id INT NOT NULL REFERENCES inventory(id),
        system_quantity INT NOT NULL,
        physical_quantity INT,
        difference INT,
        notes TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log('✅ Created stock_take_items table');
    
    // Create indexes
    await query('CREATE INDEX IF NOT EXISTS idx_stock_takes_status ON stock_takes(status)');
    await query('CREATE INDEX IF NOT EXISTS idx_stock_takes_created_at ON stock_takes(created_at)');
    await query('CREATE INDEX IF NOT EXISTS idx_stock_take_items_stock_take_id ON stock_take_items(stock_take_id)');
    await query('CREATE INDEX IF NOT EXISTS idx_stock_take_items_inventory_id ON stock_take_items(inventory_id)');
    console.log('✅ Created indexes');
    
    console.log('\n✅ Migration completed successfully!');
    console.log('   Tables ready:');
    console.log('   - stock_takes');
    console.log('   - stock_take_items');
    
    process.exit(0);
  } catch (err) {
    console.error('❌ Migration failed:', err.message);
    if (err.code === '42P07') {
      console.error('   Table already exists. If you need to recreate it, drop it first.');
    } else if (err.code === '42703') {
      console.error('   Column does not exist. The table may have wrong structure.');
      console.error('   Try running: DROP TABLE IF EXISTS stock_take_items CASCADE;');
    }
    console.error('   Full error:', err);
    process.exit(1);
  }
}

runMigration();

