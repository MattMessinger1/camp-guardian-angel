#!/usr/bin/env node

/**
 * Website Crawler CLI
 * 
 * Usage: npm run crawl --base=https://example.com
 * Usage: node scripts/crawl-website.js --base=https://example.com --max-pages=100
 */

const https = require('https');
const http = require('http');

const SUPABASE_URL = 'https://ezvwyfqtyanwnoyymhav.supabase.co';
const FUNCTION_URL = `${SUPABASE_URL}/functions/v1/crawl-website`;

async function makeRequest(url, data) {
  return new Promise((resolve, reject) => {
    const isHttps = url.startsWith('https:');
    const client = isHttps ? https : http;
    
    const postData = JSON.stringify(data);
    
    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
        'Authorization': `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV6dnd5ZnF0eWFud25veXltaGF2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ4NjY5MjQsImV4cCI6MjA3MDQ0MjkyNH0.FxQZcpBxYVmnUI-yyE15N7y-ai6ADPiQV9X8szQtIjI`
      }
    };
    
    const req = client.request(url, options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        try {
          const parsed = JSON.parse(responseData);
          resolve({ status: res.statusCode, data: parsed });
        } catch (error) {
          resolve({ status: res.statusCode, data: responseData });
        }
      });
    });
    
    req.on('error', (error) => {
      reject(error);
    });
    
    req.write(postData);
    req.end();
  });
}

function parseArguments() {
  const args = process.argv.slice(2);
  const parsed = {};
  
  for (const arg of args) {
    if (arg.startsWith('--')) {
      const [key, value] = arg.substring(2).split('=');
      parsed[key] = value || true;
    }
  }
  
  return parsed;
}

function validateUrl(url) {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

async function main() {
  const args = parseArguments();
  
  // Check for help
  if (args.help || args.h) {
    console.log(`
Website Crawler CLI

Usage:
  npm run crawl --base=https://example.com [--max-pages=50]
  node scripts/crawl-website.js --base=https://example.com [--max-pages=50]

Options:
  --base          Base URL to crawl (required)
  --max-pages     Maximum number of pages to crawl (default: 50)
  --help, -h      Show this help message

Examples:
  npm run crawl --base=https://madisonparks.org --max-pages=100
  npm run crawl --base=https://ymca.org
    `);
    return;
  }
  
  // Validate required arguments
  if (!args.base) {
    console.error('❌ Error: --base URL is required');
    console.error('Usage: npm run crawl --base=https://example.com');
    process.exit(1);
  }
  
  if (!validateUrl(args.base)) {
    console.error('❌ Error: Invalid URL format for --base');
    console.error('URL must use HTTP or HTTPS protocol');
    process.exit(1);
  }
  
  const baseUrl = args.base;
  const maxPages = args['max-pages'] ? parseInt(args['max-pages'], 10) : 50;
  
  if (isNaN(maxPages) || maxPages < 1) {
    console.error('❌ Error: --max-pages must be a positive number');
    process.exit(1);
  }
  
  console.log('🕷️  Starting website crawl...');
  console.log(`   Base URL: ${baseUrl}`);
  console.log(`   Max pages: ${maxPages}`);
  console.log('');
  
  try {
    const startTime = Date.now();
    
    const response = await makeRequest(FUNCTION_URL, {
      baseUrl: baseUrl,
      maxPages: maxPages
    });
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    
    if (response.status === 200 && response.data.success) {
      console.log('✅ Crawl completed successfully!');
      console.log(`   Duration: ${duration}s`);
      console.log(`   Pages crawled: ${response.data.crawled}`);
      console.log(`   Parse jobs queued: ${response.data.queued}`);
      
      if (response.data.sourceId) {
        console.log(`   Source ID: ${response.data.sourceId}`);
      }
      
      if (response.data.errors && response.data.errors.length > 0) {
        console.log(`   Errors: ${response.data.errors.length}`);
        if (response.data.errors.length <= 5) {
          response.data.errors.forEach(error => {
            console.log(`     ⚠️  ${error}`);
          });
        } else {
          console.log('     ⚠️  (showing first 5 errors)');
          response.data.errors.slice(0, 5).forEach(error => {
            console.log(`     ⚠️  ${error}`);
          });
        }
      }
    } else {
      console.error('❌ Crawl failed');
      console.error(`   Status: ${response.status}`);
      console.error(`   Duration: ${duration}s`);
      
      if (response.data.error) {
        console.error(`   Error: ${response.data.error}`);
      }
      
      if (response.data.errors && response.data.errors.length > 0) {
        console.error(`   Detailed errors: ${response.data.errors.length}`);
        response.data.errors.forEach(error => {
          console.error(`     ❌ ${error}`);
        });
      }
      
      process.exit(1);
    }
    
  } catch (error) {
    console.error('❌ Crawl request failed');
    console.error(`   Error: ${error.message}`);
    process.exit(1);
  }
}

// Handle unhandled promises
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Promise Rejection:', reason);
  process.exit(1);
});

// Handle uncaught exceptions  
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  process.exit(1);
});

// Run the script
if (require.main === module) {
  main().catch(error => {
    console.error('❌ Script error:', error);
    process.exit(1);
  });
}

module.exports = { main, parseArguments, validateUrl };