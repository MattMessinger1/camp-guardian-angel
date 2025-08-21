// Minimal test without any imports to isolate the vitest issue
console.log('🔍 Checking if basic Node.js execution works...');

const { exec } = require('child_process');

// First, let's see what's in the tests directory
exec('ls -la tests/', (error, stdout, stderr) => {
  if (error) {
    console.error('Error listing tests:', error);
    return;
  }
  console.log('Tests directory contents:');
  console.log(stdout);
  
  // Now try to run playwright with the simplest possible command
  console.log('\n🔍 Trying simplest Playwright command...');
  
  const env = { 
    ...process.env, 
    NODE_OPTIONS: '', 
    VITEST: 'false',
    NODE_ENV: 'test'
  };
  
  exec('npx playwright --version', { env }, (error, stdout, stderr) => {
    if (error) {
      console.error('Playwright version check failed:', error);
      return;
    }
    console.log('Playwright version:', stdout);
    
    // If that works, try listing tests
    console.log('\n🔍 Trying to list tests...');
    exec('npx playwright test --list --reporter=line', { env }, (error, stdout, stderr) => {
      console.log('STDOUT:', stdout);
      console.log('STDERR:', stderr);
      if (error) {
        console.error('Test listing failed:', error);
      }
    });
  });
});