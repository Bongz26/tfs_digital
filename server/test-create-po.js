const axios = require("axios");

const BASE_URL = "http://localhost:5000";
const API_URL = `${BASE_URL}/api/purchase-orders`;

// Test if server is running - try multiple endpoints
async function checkServer() {
  // Try the test endpoint first (we know this exists)
  try {
    const response = await axios.get(`${API_URL}/test`, { timeout: 3000 });
    console.log("✅ Server is running and purchase orders endpoint is accessible!");
    console.log("   Response:", response.data.message);
    return true;
  } catch (err) {
    // If test endpoint fails, try health endpoint
    try {
      const healthResponse = await axios.get(`${BASE_URL}/api/health`, { timeout: 3000 });
      console.log("✅ Server is running (health check):", healthResponse.data);
      return true;
    } catch (healthErr) {
      // If both fail, try root endpoint
      try {
        await axios.get(`${BASE_URL}/`, { timeout: 3000 });
        console.log("✅ Server is running (root endpoint responded)");
        return true;
      } catch (rootErr) {
        console.error("❌ Server is not running or not accessible!");
        console.error("   Make sure the server is started with: npm start (or npm run dev)");
        console.error("   Tried endpoints:");
        console.error("     - /api/purchase-orders/test");
        console.error("     - /api/health");
        console.error("     - /");
        if (err.response) {
          console.error("   Last error status:", err.response.status);
        } else {
          console.error("   Last error:", err.message);
        }
        return false;
      }
    }
  }
}

// Test the test endpoint
async function testEndpoint() {
  try {
    const response = await axios.get(`${API_URL}/test`);
    console.log("✅ Test endpoint works:", response.data);
    return true;
  } catch (err) {
    console.error("❌ Test endpoint failed!");
    console.error("   Error:", err.response?.data || err.message);
    return false;
  }
}

// Main test function
async function testCreatePO() {
  console.log("\n🧪 Testing Purchase Order Creation...");
  console.log("📝 Note: Make sure the server is running in a separate terminal:");
  console.log("   Terminal 1: npm start (or npm run dev)");
  console.log("   Terminal 2: node test-create-po.js\n");

  // Step 1: Check if server is running
  console.log("Step 1: Checking if server is running...");
  const serverRunning = await checkServer();
  if (!serverRunning) {
    process.exit(1);
  }

  // Step 2: Test the endpoint (optional, already checked in Step 1)
  console.log("\nStep 2: Verifying purchase orders endpoint...");
  const endpointWorks = await testEndpoint();
  if (!endpointWorks) {
    console.log("\n⚠️  Endpoint verification failed, but continuing with PO creation test...");
  }

  // Step 3: Create a PO
  console.log("\nStep 3: Creating purchase order...");
  try {
    const testData = {
      po_number: `PO-TEST-${Date.now()}`, // Unique PO number
      supplier_id: 1,
      order_date: "2025-01-10",
      expected_delivery: "2025-01-18",
      created_by: "test-user"
    };

    console.log("📤 Sending request with data:", testData);
    console.log("⏳ Waiting for response (timeout: 15 seconds)...");

    const startTime = Date.now();
    const response = await axios.post(API_URL, testData, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 15000 // 15 second timeout to match server timeout
    });
    const duration = Date.now() - startTime;
    console.log(`⏱️  Response received in ${duration}ms`);

    console.log("\n✅ SUCCESS! Purchase Order Created:");
    console.log(JSON.stringify(response.data, null, 2));
  } catch (err) {
    console.error("\n❌ FAILED to create Purchase Order!");
    
    if (err.response) {
      // Server responded with error status
      console.error("   Status:", err.response.status);
      console.error("   Response:", JSON.stringify(err.response.data, null, 2));
      
      if (err.response.status === 500) {
        console.error("\n💡 Tip: Check your database connection and ensure:");
        console.error("   - Database is running");
        console.error("   - Tables exist (purchase_orders, suppliers, etc.)");
        console.error("   - supplier_id exists in suppliers table");
      }
    } else if (err.request) {
      // Request was made but no response received
      console.error("   ⚠️  No response from server!");
      console.error("   This usually means:");
      console.error("     1. The server is hanging on the database query");
      console.error("     2. Check the server console for error messages");
      console.error("     3. Verify Supabase credentials in .env file");
      console.error("     4. Check if SUPABASE_URL and SUPABASE_ANON_KEY are set");
      if (err.code === 'ECONNABORTED') {
        console.error("   Request timed out after 15 seconds");
      }
    } else {
      // Error setting up the request
      console.error("   Error:", err.message);
      if (err.code) {
        console.error("   Error code:", err.code);
      }
    }
    
    process.exit(1);
  }
}

// Run the test
testCreatePO()
  .then(() => {
    console.log("\n✨ Test completed successfully!");
    process.exit(0);
  })
  .catch((err) => {
    console.error("\n💥 Unexpected error:", err);
    process.exit(1);
  });
