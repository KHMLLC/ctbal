// Using built-in fetch (Node 18+)

async function testHealthAPI() {
  const baseUrl = 'http://localhost:3001';
  
  console.log('🧪 Testing CTBAL Health API...\n');

  try {
    // Test 1: Health Check
    console.log('1️⃣ Testing health check endpoint...');
    const healthResponse = await fetch(`${baseUrl}/health`);
    const healthData = await healthResponse.json();
    console.log('✅ Health check:', healthData);
    console.log('');

    // Test 2: Submit Health Data
    console.log('2️⃣ Testing health data submission...');
    const testData = {
      date: new Date().toLocaleDateString(),
      weight: 183,
      glucose: 73,
      insulin: 0,
      source: 'api_test',
      notes: 'Testing API submission from test client',
      submitToBlockchain: false // Don't submit to blockchain in test
    };

    const submitResponse = await fetch(`${baseUrl}/api/health-data`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testData)
    });

    const submitData = await submitResponse.json();
    console.log('✅ Data submission:', submitData);
    console.log('');

    // Test 3: Retrieve Health Data
    console.log('3️⃣ Testing health data retrieval...');
    const retrieveResponse = await fetch(`${baseUrl}/api/health-data`);
    const retrieveData = await retrieveResponse.json();
    console.log('✅ Data retrieval:', retrieveData);
    console.log('');

    console.log('🎉 All API tests completed successfully!');

  } catch (error) {
    console.error('❌ API test failed:', error);
  }
}

testHealthAPI();