// Debug script to find what's loading Vitest
const Module = require('module');
const originalRequire = Module.prototype.require;

console.log('🔍 Tracking all module loads...');

Module.prototype.require = function(...args) {
  const [id] = args;
  
  if (id && (id.includes('vitest') || id.includes('@vitest'))) {
    console.log(`🚨 VITEST LOADED: ${id}`);
    console.log(`📁 From: ${this.filename || 'unknown'}`);
    console.trace('Stack trace:');
  }
  
  return originalRequire.apply(this, args);
};

// Load Playwright to see what imports Vitest
console.log('Loading Playwright...');
require('@playwright/test');