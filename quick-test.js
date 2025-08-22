const { spawn } = require('child_process');

console.log('🧪 Quick Workflow Test - Homepage Smoke Test');

const test = spawn('npx', ['playwright', 'test', 'tests/smoke.spec.ts', '--reporter=line', '--timeout=15000'], {
  stdio: 'pipe',
  shell: true
});

let output = '';
let error = '';

test.stdout.on('data', (data) => {
  const text = data.toString();
  console.log(text);
  output += text;
});

test.stderr.on('data', (data) => {
  const text = data.toString();
  console.error(text);
  error += text;
});

test.on('close', (code) => {
  console.log(`\n📊 Test Result: ${code === 0 ? '✅ PASSED' : '❌ FAILED'}`);
  if (code !== 0) {
    console.log('🔍 Issues found:');
    if (error.includes('ECONNREFUSED')) {
      console.log('- Dev server not running (need to start with npm run dev)');
    }
    if (error.includes('Cannot read properties')) {
      console.log('- Component/data loading issues');
    }
    if (output.includes('expect') && output.includes('received')) {
      console.log('- Element visibility/content issues');
    }
  }
  
  console.log('\n🎯 6-Step Workflow URLs:');
  console.log('1. Search: / (Homepage)');
  console.log('2. Get Ready: /signup?sessionId=${sessionId}');
  console.log('3. Complete: same page');
  console.log('4. Ready Status: /sessions/${sessionId}/ready-to-signup');
  console.log('5. Pending: /sessions/${sessionId}/confirmation');
  console.log('6. History: /account/history ← Current location');
});