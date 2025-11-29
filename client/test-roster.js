// Quick test script for roster endpoint
const http = require('http');

console.log('Testing /api/roster endpoint...\n');

const options = {
  hostname: 'localhost',
  port: 5000,
  path: '/api/roster',
  method: 'GET'
};

const req = http.request(options, (res) => {
  console.log(`Status: ${res.statusCode}`);
  console.log(`Headers:`, res.headers);

  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    console.log('\nResponse:');
    try {
      const json = JSON.parse(data);
      console.log(JSON.stringify(json, null, 2));
    } catch (e) {
      console.log(data);
    }
  });
});

req.on('error', (e) => {
  console.error(`Problem with request: ${e.message}`);
  console.error('\n💡 Make sure the server is running on port 5000');
  console.error('   Run: npm run dev');
});

req.end();

