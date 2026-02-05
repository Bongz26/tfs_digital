const { query } = require('../config/db');
const fs = require('fs');
const path = require('path');

async function runMigration() {
  try {
    console.log('🔄 Starting migration: Add additional services to cases table...');
    
    const sqlPath = path.join(__dirname, 'migrate-add-additional-services.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    // Split by semicolon and execute each statement
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));
    
    for (const statement of statements) {
      if (statement.trim()) {
        await query(statement);
      }
    }
    
    console.log('✅ Migration completed successfully!');
    console.log('   Added columns: requires_catering, requires_grocery, requires_bus');
    
    // Verify the columns exist
    const checkResult = await query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'cases' 
      AND column_name IN ('requires_catering', 'requires_grocery', 'requires_bus')
      ORDER BY column_name
    `);
    
    console.log('✅ Verified columns added:');
    checkResult.rows.forEach(row => {
      console.log(`   - ${row.column_name}`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

runMigration();

