// Quick test to verify server routes
const http = require('http');

const testEndpoint = (path, name) => {
  return new Promise((resolve) => {
    const options = {
      hostname: 'localhost',
      port: 5000,
      path: path,
      method: 'GET',
      timeout: 2000
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        console.log(`✅ ${name}: ${res.statusCode} - ${data.substring(0, 50)}`);
        resolve({ status: res.statusCode, success: res.statusCode < 400 });
      });
    });

    req.on('error', (err) => {
      console.error(`❌ ${name}: ${err.message}`);
      resolve({ status: 0, success: false, error: err.message });
    });

    req.on('timeout', () => {
      console.error(`❌ ${name}: Timeout - Server might not be running`);
      req.destroy();
      resolve({ status: 0, success: false, error: 'timeout' });
    });

    req.end();
  });
};

async function testRoutes() {
  console.log('🔍 Testing server endpoints...\n');

  await testEndpoint('/api/health', 'Health Check');
  await testEndpoint('/api/roster', 'Roster');
  await testEndpoint('/api/dashboard', 'Dashboard');
  await testEndpoint('/api/cases', 'Cases');

  console.log('\n💡 If all endpoints fail, make sure the server is running:');
  console.log('   cd server && npm run dev');
}

testRoutes();

