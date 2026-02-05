// Test script to verify the /api/purchase-orders/test endpoint
const axios = require('axios');

async function testEndpoint() {
  try {
    console.log('Testing http://localhost:5000/api/purchase-orders/test...');
    const response = await axios.get('http://localhost:5000/api/purchase-orders/test', {
      timeout: 5000
    });
    console.log('✅ SUCCESS!');
    console.log('Response:', JSON.stringify(response.data, null, 2));
  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      console.error('❌ ERROR: Cannot connect to server. Is the server running?');
      console.error('   Make sure you run: npm start or npm run dev');
    } else if (error.response) {
      console.error('❌ ERROR: Server responded with error');
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    } else {
      console.error('❌ ERROR:', error.message);
    }
  }
}

testEndpoint();

