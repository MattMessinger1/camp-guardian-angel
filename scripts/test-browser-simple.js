const { execSync } = require('child_process');

console.log('🔍 Testing browser connectivity...');

try {
  // Test if dev server is running
  console.log('1. Checking if dev server is accessible...');
  
  // Simple curl test to localhost
  const result = execSync('curl -s -o /dev/null -w "%{http_code}" http://localhost:8080', { encoding: 'utf8' });
  
  if (result.trim() === '200') {
    console.log('✅ Dev server is accessible at localhost:8080');
  } else {
    console.log('❌ Dev server not responding (got status:', result.trim(), ')');
    console.log('💡 Try running: npm run dev');
  }
  
} catch (error) {
  console.log('❌ Could not reach dev server');
  console.log('💡 Make sure to run: npm run dev');
}

console.log('2. Browser test complete');