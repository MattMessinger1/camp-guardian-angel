#!/usr/bin/env node

// Custom module loader to block Vitest/Jest modules during Playwright execution
const Module = require('module');
const originalRequire = Module.prototype.require;

// List of blocked modules that cause symbol conflicts
const blockedModules = [
  '@vitest/expect',
  '@vitest/runner',
  '@vitest/ui',
  'vitest',
  '@jest/expect',
  '@jest/globals',
  'jest'
];

// Override require to block problematic modules
Module.prototype.require = function(id) {
  // Block any Vitest/Jest modules
  if (blockedModules.some(blocked => id.includes(blocked))) {
    console.log(`🚫 Blocked module: ${id}`);
    return {};
  }
  
  // Allow all other modules
  return originalRequire.apply(this, arguments);
};

// Set environment to prevent Vitest from loading
process.env.NODE_ENV = 'playwright-test';
process.env.VITEST = 'false';
process.env.JEST_WORKER_ID = undefined;

// Clear any existing Jest/Vitest globals
if (global.vi) delete global.vi;
if (global.vitest) delete global.vitest;
if (global.jest) delete global.jest;

console.log('✅ Module loader initialized - Vitest/Jest modules blocked');

// Now safely load and run Playwright
const { spawn } = require('child_process');
const args = process.argv.slice(2);

const playwright = spawn('npx', ['playwright', ...args], {
  stdio: 'inherit',
  env: {
    ...process.env,
    NODE_ENV: 'playwright-test',
    VITEST: 'false'
  }
});

playwright.on('close', (code) => {
  process.exit(code);
});