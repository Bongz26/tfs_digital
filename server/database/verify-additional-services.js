const { query } = require('../config/db');

async function verifyColumns() {
  try {
    const result = await query(`
      SELECT column_name, data_type, column_default
      FROM information_schema.columns 
      WHERE table_name = 'cases' 
      AND column_name LIKE 'requires_%'
      ORDER BY column_name
    `);
    
    console.log('\n📋 All requires_* columns in cases table:');
    console.log('─'.repeat(60));
    
    if (result.rows.length === 0) {
      console.log('❌ No requires_* columns found!');
    } else {
      result.rows.forEach(row => {
        console.log(`✅ ${row.column_name.padEnd(25)} | ${row.data_type.padEnd(15)} | Default: ${row.column_default || 'NULL'}`);
      });
    }
    
    console.log('─'.repeat(60));
    
    // Check specifically for the new columns
    const newColumns = ['requires_catering', 'requires_grocery', 'requires_bus'];
    const foundColumns = result.rows.map(r => r.column_name);
    
    console.log('\n🔍 Checking for new service columns:');
    newColumns.forEach(col => {
      if (foundColumns.includes(col)) {
        console.log(`✅ ${col} - EXISTS`);
      } else {
        console.log(`❌ ${col} - MISSING`);
      }
    });
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

verifyColumns();

