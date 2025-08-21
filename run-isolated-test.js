#!/usr/bin/env node

// Complete isolation script - runs Playwright in fresh process
const { spawn } = require('child_process');
const path = require('path');

console.log('🚀 Running Playwright in completely isolated process...');

// Completely clean environment
const cleanEnv = {
  ...process.env,
  NODE_OPTIONS: '',
  VITEST: 'false',
  NODE_ENV: 'test',
  // Remove any vitest-related variables
};

// Remove vitest keys
Object.keys(cleanEnv).forEach(key => {
  if (key.toLowerCase().includes('vitest') || key.toLowerCase().includes('jest')) {
    delete cleanEnv[key];
  }
});

// Run playwright in fresh process
const child = spawn('npx', [
  'playwright', 
  'test', 
  'tests/manual-backup-fixed.spec.ts',
  '--headed',
  '--reporter=line'
], {
  env: cleanEnv,
  stdio: 'inherit',
  shell: true
});

child.on('close', (code) => {
  console.log(`\n🎯 Test process exited with code: ${code}`);
  process.exit(code);
});

child.on('error', (error) => {
  console.error('❌ Failed to start test:', error);
  process.exit(1);
});