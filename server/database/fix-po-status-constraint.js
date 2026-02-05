const { query } = require('../config/db');
const fs = require('fs');
const path = require('path');

async function fixPOStatusConstraint() {
    try {
        console.log('🔧 Fixing purchase_orders status constraint...');
        
        // Drop existing constraint
        await query(`
            ALTER TABLE purchase_orders 
            DROP CONSTRAINT IF EXISTS purchase_orders_status_check;
        `);
        console.log('✅ Dropped existing constraint');
        
        // Add new constraint with all valid values
        await query(`
            ALTER TABLE purchase_orders 
            ADD CONSTRAINT purchase_orders_status_check 
            CHECK (status IN ('draft', 'sent', 'received', 'partial', 'completed', 'cancelled'));
        `);
        console.log('✅ Added new constraint with all valid status values');
        
        console.log('✅ Migration completed successfully!');
        console.log('Valid status values: draft, sent, received, partial, completed, cancelled');
        
        process.exit(0);
    } catch (err) {
        console.error('❌ Error running migration:', err.message);
        process.exit(1);
    }
}

fixPOStatusConstraint();

