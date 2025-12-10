
const axios = require('axios');

async function testRoute() {
    try {
        console.log('Testing GET http://localhost:5000/api/sms/airtime-requests...');
        // We expect 401 Unauthorized because we don't provide a token, 
        // but that PROVES the route exists. 
        // If we get 404, the route is missing.
        const res = await axios.get('http://localhost:5000/api/sms/airtime-requests');
        console.log('Response Status:', res.status); // Should not happen without token
    } catch (error) {
        if (error.response) {
            console.log('Response Status:', error.response.status);
            console.log('Response Data:', error.response.data);
            if (error.response.status === 404) {
                console.error('❌ FAILURE: Endpoint returned 404 Not Found.');
            } else if (error.response.status === 401) {
                console.log('✅ SUCCESS: Endpoint returned 401 (Unauthorized), which means it exists!');
            } else {
                console.log('⚠️ Unexpected status:', error.response.status);
            }
        } else {
            console.error('Network Error (Is server running?):', error.message);
        }
    }
}

testRoute();
