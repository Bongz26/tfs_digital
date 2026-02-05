// Test script for Stock Take API endpoints
// Usage: node test-stock-take.js

const axios = require('axios');
require('dotenv').config();

const API_URL = process.env.API_URL || 'http://localhost:5000';

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function checkServer() {
  try {
    log('\n🔍 Checking if server is running...', 'cyan');
    const response = await axios.get(`${API_URL}/api/health`, { timeout: 5000 });
    log('✅ Server is running!', 'green');
    return true;
  } catch (err) {
    log('❌ Server is not running or not accessible!', 'red');
    log(`   Error: ${err.message}`, 'red');
    log(`   Make sure the server is running on ${API_URL}`, 'yellow');
    return false;
  }
}

async function testStartStockTake() {
  log('\n📋 TEST 1: Starting a new stock take', 'cyan');
  log('─'.repeat(50), 'cyan');
  
  try {
    const testData = {
      taken_by: 'Test User'
    };

    log(`📤 Sending POST to ${API_URL}/api/inventory/stock-take/start`, 'blue');
    log(`   Data: ${JSON.stringify(testData, null, 2)}`, 'blue');

    const response = await axios.post(
      `${API_URL}/api/inventory/stock-take/start`,
      testData,
      {
        headers: { 'Content-Type': 'application/json' },
        timeout: 15000
      }
    );

    log('\n✅ SUCCESS! Stock take started:', 'green');
    log(JSON.stringify(response.data, null, 2), 'green');
    
    return response.data.stock_take_id;
  } catch (err) {
    log('\n❌ FAILED to start stock take:', 'red');
    if (err.response) {
      log(`   Status: ${err.response.status}`, 'red');
      log(`   Error: ${JSON.stringify(err.response.data, null, 2)}`, 'red');
    } else if (err.request) {
      log('   ⚠️  No response from server!', 'red');
      log('   Check if the server is running and the endpoint exists', 'yellow');
    } else {
      log(`   Error: ${err.message}`, 'red');
    }
    return null;
  }
}

async function testUpdateStockTakeItem(stockTakeId, itemId) {
  log('\n📝 TEST 2: Updating stock take item', 'cyan');
  log('─'.repeat(50), 'cyan');
  
  try {
    const testData = {
      physical_quantity: 25,
      notes: 'Test count - found 25 items'
    };

    log(`📤 Sending PUT to ${API_URL}/api/inventory/stock-take/${stockTakeId}/item/${itemId}`, 'blue');
    log(`   Data: ${JSON.stringify(testData, null, 2)}`, 'blue');

    const response = await axios.put(
      `${API_URL}/api/inventory/stock-take/${stockTakeId}/item/${itemId}`,
      testData,
      {
        headers: { 'Content-Type': 'application/json' },
        timeout: 15000
      }
    );

    log('\n✅ SUCCESS! Stock take item updated:', 'green');
    log(JSON.stringify(response.data, null, 2), 'green');
    
    return response.data.item;
  } catch (err) {
    log('\n❌ FAILED to update stock take item:', 'red');
    if (err.response) {
      log(`   Status: ${err.response.status}`, 'red');
      log(`   Error: ${JSON.stringify(err.response.data, null, 2)}`, 'red');
    } else {
      log(`   Error: ${err.message}`, 'red');
    }
    return null;
  }
}

async function testCompleteStockTake(stockTakeId) {
  log('\n✅ TEST 3: Completing stock take', 'cyan');
  log('─'.repeat(50), 'cyan');
  
  try {
    log(`📤 Sending POST to ${API_URL}/api/inventory/stock-take/${stockTakeId}/complete`, 'blue');
    log('   ⚠️  This will update inventory quantities!', 'yellow');

    const response = await axios.post(
      `${API_URL}/api/inventory/stock-take/${stockTakeId}/complete`,
      {},
      {
        headers: { 'Content-Type': 'application/json' },
        timeout: 20000
      }
    );

    log('\n✅ SUCCESS! Stock take completed:', 'green');
    log(JSON.stringify(response.data, null, 2), 'green');
    
    return true;
  } catch (err) {
    log('\n❌ FAILED to complete stock take:', 'red');
    if (err.response) {
      log(`   Status: ${err.response.status}`, 'red');
      log(`   Error: ${JSON.stringify(err.response.data, null, 2)}`, 'red');
    } else {
      log(`   Error: ${err.message}`, 'red');
    }
    return false;
  }
}

async function getInventoryItems() {
  log('\n📦 Getting inventory items for testing...', 'cyan');
  
  try {
    const response = await axios.get(`${API_URL}/api/inventory`, { timeout: 10000 });
    const items = response.data.inventory || [];
    
    if (items.length === 0) {
      log('⚠️  No inventory items found!', 'yellow');
      log('   You may need to add some inventory items first', 'yellow');
      return null;
    }
    
    log(`✅ Found ${items.length} inventory items`, 'green');
    return items[0]; // Return first item for testing
  } catch (err) {
    log('❌ Failed to get inventory items:', 'red');
    log(`   Error: ${err.message}`, 'red');
    return null;
  }
}

async function runTests() {
  log('\n' + '='.repeat(60), 'cyan');
  log('🧪 STOCK TAKE API TEST SUITE', 'cyan');
  log('='.repeat(60), 'cyan');

  // Check server
  const serverRunning = await checkServer();
  if (!serverRunning) {
    log('\n❌ Cannot proceed - server is not running', 'red');
    process.exit(1);
  }

  // Get an inventory item for testing
  const inventoryItem = await getInventoryItems();
  if (!inventoryItem) {
    log('\n⚠️  Warning: No inventory items found. Some tests may fail.', 'yellow');
  }

  // Test 1: Start stock take
  const stockTakeId = await testStartStockTake();
  if (!stockTakeId) {
    log('\n❌ Cannot proceed - failed to start stock take', 'red');
    process.exit(1);
  }

  // Test 2: Update stock take item (if we have an inventory item)
  if (inventoryItem) {
    await testUpdateStockTakeItem(stockTakeId, inventoryItem.id);
  } else {
    log('\n⏭️  Skipping item update test - no inventory items available', 'yellow');
    log(`   To test manually: PUT /api/inventory/stock-take/${stockTakeId}/item/{itemId}`, 'yellow');
  }

  // Test 3: Complete stock take (commented out by default to prevent accidental updates)
  log('\n⚠️  COMPLETE TEST SKIPPED BY DEFAULT', 'yellow');
  log('   Uncomment the line below to test completing the stock take', 'yellow');
  log('   ⚠️  This will update your inventory quantities!', 'yellow');
  // await testCompleteStockTake(stockTakeId);

  log('\n' + '='.repeat(60), 'cyan');
  log('✅ TEST SUITE COMPLETED', 'green');
  log('='.repeat(60), 'cyan');
  log(`\n📝 Stock Take ID: ${stockTakeId}`, 'cyan');
  log('   You can now test the complete endpoint manually if needed', 'cyan');
  log('\n');
}

// Run tests
runTests().catch(err => {
  log(`\n❌ Unexpected error: ${err.message}`, 'red');
  process.exit(1);
});

