#!/usr/bin/env node
/**
 * Concurrent Stock Update Test
 * Tests that atomic decrement prevents race conditions
 * 
 * This simulates multiple staff members trying to use the same inventory item
 * at the exact same time. Without atomic operations, this would cause bugs.
 */

require('dotenv').config();
const { decrementStock, getSupabaseClient } = require('../utils/dbUtils');

async function setup() {
    const supabase = getSupabaseClient();

    // Find or create a test inventory item
    const { data: items } = await supabase
        .from('inventory')
        .select('*')
        .eq('category', 'coffin')
        .limit(1);

    if (!items || items.length === 0) {
        console.error('❌ No inventory items found. Please add test data first.');
        process.exit(1);
    }

    const testItem = items[0];

    // Set it to a known quantity
    await supabase
        .from('inventory')
        .update({ stock_quantity: 10 })
        .eq('id', testItem.id);

    console.log(`✅ Test setup complete. Item ${testItem.id} (${testItem.name}) set to quantity 10\n`);
    return testItem.id;
}

async function runConcurrentTest(itemId, concurrentRequests = 5) {
    console.log(`🧪 Running concurrent decrement test with ${concurrentRequests} simultaneous requests...`);
    console.log('─'.repeat(70));

    const promises = [];
    const startTime = Date.now();

    // Create multiple simultaneous requests
    for (let i = 0; i < concurrentRequests; i++) {
        const promise = decrementStock(
            itemId,
            1,
            `test-user-${i}@example.com`,
            `Concurrent test ${i + 1}`
        ).then(result => {
            const elapsed = Date.now() - startTime;
            console.log(`[${elapsed}ms] Worker ${i + 1}: ${result.success ? '✅ SUCCESS' : '❌ FAIL'} - New qty: ${result.newQuantity} - ${result.message}`);
            return result;
        }).catch(err => {
            const elapsed = Date.now() - startTime;
            console.log(`[${elapsed}ms] Worker ${i + 1}: ❌ ERROR - ${err.message}`);
            return { success: false, error: err.message };
        });

        promises.push(promise);
    }

    // Wait for all to complete
    const results = await Promise.all(promises);

    return results;
}

async function verify(itemId, expectedQuantity) {
    console.log('\n' + '─'.repeat(70));
    console.log('🔍 Verifying final state...\n');

    const supabase = getSupabaseClient();

    // Check final inventory quantity
    const { data: item } = await supabase
        .from('inventory')
        .select('stock_quantity')
        .eq('id', itemId)
        .single();

    console.log(`📦 Final inventory quantity: ${item.stock_quantity}`);
    console.log(`🎯 Expected quantity: ${expectedQuantity}`);

    const correct = item.stock_quantity === expectedQuantity;

    if (correct) {
        console.log('✅ PASS: Quantity matches expected value!');
        console.log('   Atomic operations prevented race conditions.');
    } else {
        console.log('❌ FAIL: Quantity mismatch!');
        console.log(`   Difference: ${Math.abs(item.stock_quantity - expectedQuantity)} units`);
        console.log('   This indicates a race condition occurred.');
    }

    // Check stock movements
    const { data: movements, count } = await supabase
        .from('stock_movements')
        .select('*', { count: 'exact' })
        .eq('inventory_id', itemId)
        .gte('movement_date', new Date(Date.now() - 10000).toISOString());

    console.log(`\n📝 Stock movements logged: ${count}`);

    if (movements) {
        movements.forEach((m, i) => {
            console.log(`   ${i + 1}. ${m.recorded_by}: ${m.quantity_change} (${m.previous_quantity} → ${m.new_quantity})`);
        });
    }

    return correct;
}

async function main() {
    console.log('═'.repeat(70));
    console.log('🧪 Concurrent Stock Update Test');
    console.log('═'.repeat(70));
    console.log('Purpose: Verify atomic operations prevent race conditions\n');

    try {
        // Setup
        const itemId = await setup();

        // Run test with 5 concurrent requests
        const concurrentRequests = 5;
        const initialQuantity = 10;
        const expectedFinalQuantity = initialQuantity - concurrentRequests; // Should be 5

        await runConcurrentTest(itemId, concurrentRequests);

        // Verify results
        const passed = await verify(itemId, expectedFinalQuantity);

        console.log('\n' + '═'.repeat(70));
        if (passed) {
            console.log('✅ TEST PASSED: Atomic operations working correctly!');
            console.log('═'.repeat(70));
            process.exit(0);
        } else {
            console.log('❌ TEST FAILED: Race condition detected!');
            console.log('═'.repeat(70));
            process.exit(1);
        }

    } catch (error) {
        console.error('\n❌ Test error:', error.message);
        console.error(error.stack);
        process.exit(1);
    }
}

// Run test
if (require.main === module) {
    main();
}
