/**
 * Verification Script: Inventory Reservation
 * Usage: node verify-reservation.js
 */

const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const { reserveStock, commitStock, releaseStock } = require('../utils/dbUtils');

// Setup Supabase (Direct)
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing credentials');
    process.exit(1);
}
const supabase = createClient(supabaseUrl, supabaseKey);

async function runTest() {
    console.log('🚀 Starting Reservation Verification (Direct DB Mode)...');

    // 1. Setup Test Item
    const testItemName = 'Test Casket ' + Date.now();
    const { data: item, error: createError } = await supabase
        .from('inventory')
        .insert({
            name: testItemName,
            category: 'coffin',
            stock_quantity: 10,
            reserved_quantity: 0,
            location: 'Head Office'
        })
        .select()
        .single();

    if (createError) {
        console.error('Create failed:', createError);
        return;
    }
    console.log(`✅ Created test item: ${testItemName} (ID: ${item.id}) | Stock: 10, Reserved: 0`);

    try {
        // 2. Reserve Stock
        console.log('--- Step 2: Reserving Stock ---');
        try {
            const result = await reserveStock(item.id, 1, 'tester', 'Test Reservation');
            console.log(`✅ Reserve Result: Success=${result.success}, NewReserved=${result.new_reserved}`);
        } catch (e) {
            console.error('❌ Reserve Failed:', e.message);
        }

        // 3. Check Reservation
        const { data: check1 } = await supabase.from('inventory').select('*').eq('id', item.id).single();
        console.log(`📊 Post-Reserve State: Stock=${check1.stock_quantity}, Reserved=${check1.reserved_quantity}`);

        if (check1.reserved_quantity !== 1) console.error('❌ FAIL: Reserved quantity should be 1');
        else console.log('✅ PASS: Reserved quantity is 1');

        // 4. Commit Stock
        console.log('--- Step 4: Committing Stock ---');
        try {
            // Passing null for caseId as we don't need a real case for this unit test
            const commitRes = await commitStock(item.id, 1, null, 'tester', 'Test Commit');
            console.log(`✅ Commit Result: Success=${commitRes.success}, NewStock=${commitRes.new_stock}`);
        } catch (e) {
            console.error('❌ Commit Failed:', e.message);
        }

        // 5. Check Final State
        const { data: check2 } = await supabase.from('inventory').select('*').eq('id', item.id).single();
        console.log(`📊 Final State: Stock=${check2.stock_quantity}, Reserved=${check2.reserved_quantity}`);

        if (check2.stock_quantity !== 9) console.error('❌ FAIL: Stock should be 9');
        else console.log('✅ PASS: Stock is 9');

        if (check2.reserved_quantity !== 0) console.error('❌ FAIL: Reserved should be 0');
        else console.log('✅ PASS: Reserved is 0');

        // Cleanup
        await supabase.from('inventory').delete().eq('id', item.id);
        console.log('🧹 Cleanup done');

    } catch (e) {
        console.error('❌ Test Failed:', e.message);
    }
}

runTest();
