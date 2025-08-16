#!/usr/bin/env node

/**
 * Session Parser CLI
 * 
 * Usage: npm run parse --url=https://example.com/page.html
 * Usage: node scripts/parse-sessions.js --url=https://example.com/page.html --confidence=0.7
 */

const https = require('https');
const http = require('http');

const SUPABASE_URL = 'https://ezvwyfqtyanwnoyymhav.supabase.co';
const FUNCTION_URL = `${SUPABASE_URL}/functions/v1/parse-sessions`;

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

async function fetchPageHtml(url) {
  return new Promise((resolve, reject) => {
    const isHttps = url.startsWith('https:');
    const client = isHttps ? https : http;
    
    const options = {
      headers: {
        'User-Agent': 'CampScheduleBot/1.0 (Session Parser CLI)',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
      }
    };
    
    const req = client.get(url, options, (res) => {
      let html = '';
      
      res.on('data', (chunk) => {
        html += chunk;
      });
      
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(html);
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${res.statusMessage}`));
        }
      });
    });
    
    req.on('error', (error) => {
      reject(error);
    });
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
Session Parser CLI

Usage:
  npm run parse --url=https://example.com/page.html [--confidence=0.6] [--source-id=uuid]
  node scripts/parse-sessions.js --url=https://example.com [--confidence=0.7]

Options:
  --url           URL to fetch and parse (required)
  --html          Parse HTML from file instead of fetching URL
  --confidence    Minimum confidence score (default: 0.6)
  --source-id     Source ID for database tracking
  --help, -h      Show this help message

Examples:
  npm run parse --url=https://madisonparks.org/programs --confidence=0.7
  npm run parse --url=https://ymca.org/camps --source-id=123e4567-e89b-12d3-a456-426614174000
    `);
    return;
  }
  
  // Validate required arguments
  if (!args.url && !args.html) {
    console.error('❌ Error: --url or --html is required');
    console.error('Usage: npm run parse --url=https://example.com/page.html');
    process.exit(1);
  }
  
  if (args.url && !validateUrl(args.url)) {
    console.error('❌ Error: Invalid URL format');
    console.error('URL must start with http:// or https://');
    process.exit(1);
  }
  
  const url = args.url;
  const minConfidence = args.confidence ? parseFloat(args.confidence) : 0.6;
  const sourceId = args['source-id'];
  
  if (isNaN(minConfidence) || minConfidence < 0 || minConfidence > 1) {
    console.error('❌ Error: --confidence must be a number between 0 and 1');
    process.exit(1);
  }
  
  console.log('🤖 Starting session parsing...');
  if (url) {
    console.log(`   URL: ${url}`);
  }
  console.log(`   Min confidence: ${minConfidence}`);
  if (sourceId) {
    console.log(`   Source ID: ${sourceId}`);
  }
  console.log('');
  
  try {
    const startTime = Date.now();
    
    // Fetch HTML if URL provided
    let html = '';
    if (url) {
      console.log('📄 Fetching page content...');
      html = await fetchPageHtml(url);
      console.log(`   Content length: ${html.length} characters`);
    } else {
      // Read from file (implement if needed)
      throw new Error('HTML file input not yet implemented');
    }
    
    // Parse sessions
    console.log('🧠 Parsing with AI...');
    const response = await makeRequest(FUNCTION_URL, {
      html: html,
      url: url,
      sourceId: sourceId,
      minConfidence: minConfidence
    });
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    
    if (response.status === 200 && response.data.success) {
      console.log('✅ Parsing completed successfully!');
      console.log(`   Duration: ${duration}s`);
      console.log(`   Total extracted: ${response.data.totalExtracted}`);
      console.log(`   Valid candidates: ${response.data.validCandidates}`);
      console.log(`   Stored in database: ${response.data.storedCandidates}`);
      console.log('');
      
      if (response.data.candidates && response.data.candidates.length > 0) {
        console.log('📋 Session Candidates:');
        response.data.candidates.forEach((candidate, index) => {
          console.log(`\n   ${index + 1}. ${candidate.title || 'Untitled'}`);
          console.log(`      Confidence: ${(candidate.confidence * 100).toFixed(1)}%`);
          if (candidate.startDate) {
            console.log(`      Dates: ${candidate.startDate}${candidate.endDate && candidate.endDate !== candidate.startDate ? ' to ' + candidate.endDate : ''}`);
          }
          if (candidate.ageRange && candidate.ageRange !== '?-?') {
            console.log(`      Ages: ${candidate.ageRange}`);
          }
          if (candidate.priceRange && candidate.priceRange !== '$?-?') {
            console.log(`      Price: ${candidate.priceRange}`);
          }
          if (candidate.location) {
            console.log(`      Location: ${candidate.location}`);
          }
        });
      } else {
        console.log('   No valid candidates found');
      }
      
    } else {
      console.error('❌ Parsing failed');
      console.error(`   Status: ${response.status}`);
      console.error(`   Duration: ${duration}s`);
      
      if (response.data.error) {
        console.error(`   Error: ${response.data.error}`);
      }
      
      process.exit(1);
    }
    
  } catch (error) {
    console.error('❌ Parsing request failed');
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