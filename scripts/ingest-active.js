#!/usr/bin/env node

/**
 * Active Network Camp Data Harvester CLI
 * 
 * Usage:
 *   npm run ingest:active Madison,WI
 *   npm run ingest:active "Chicago,IL" --keywords="summer camp"
 *   npm run ingest:active "Austin,TX" --category="sports" --keywords="youth"
 */

const https = require('https');
const url = require('url');

const SUPABASE_PROJECT_ID = 'ezvwyfqtyanwnoyymhav';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV6dnd5ZnF0eWFud25veXltaGF2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ4NjY5MjQsImV4cCI6MjA3MDQ0MjkyNH0.FxQZcpBxYVmnUI-yyE15N7y-ai6ADPiQV9X8szQtIjI';

function parseArgs() {
  const args = process.argv.slice(2);
  const location = args[0] || 'Madison,WI';
  const [city, state] = location.split(',').map(s => s.trim());
  
  const params = { city, state };
  
  // Parse additional parameters
  for (let i = 1; i < args.length; i++) {
    const arg = args[i];
    if (arg.startsWith('--keywords=')) {
      params.keywords = arg.split('=')[1].replace(/"/g, '');
    } else if (arg.startsWith('--category=')) {
      params.category = arg.split('=')[1].replace(/"/g, '');
    }
  }
  
  return params;
}

function makeRequest(payload) {
  return new Promise((resolve, reject) => {
    const functionUrl = `https://${SUPABASE_PROJECT_ID}.supabase.co/functions/v1/ingest-active-search`;
    
    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      },
    };
    
    const req = https.request(functionUrl, options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          resolve({ status: res.statusCode, data: response });
        } catch (error) {
          reject(new Error(`Failed to parse response: ${error.message}`));
        }
      });
    });
    
    req.on('error', (error) => {
      reject(error);
    });
    
    req.write(JSON.stringify(payload));
    req.end();
  });
}

async function main() {
  const params = parseArgs();
  
  console.log('🚀 Active Network Camp Harvester');
  console.log('================================');
  console.log(`📍 Location: ${params.city}, ${params.state}`);
  if (params.keywords) console.log(`🔍 Keywords: ${params.keywords}`);
  if (params.category) console.log(`📂 Category: ${params.category}`);
  console.log('');
  
  try {
    console.log('⏳ Starting harvest...');
    const startTime = Date.now();
    
    const response = await makeRequest(params);
    
    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);
    
    if (response.status === 200 && response.data.success) {
      const { results } = response.data;
      
      console.log('✅ Harvest completed successfully!');
      console.log('');
      console.log('📊 Results:');
      console.log(`   • Processed: ${results.processed} activities`);
      console.log(`   • Created: ${results.created} sessions`);
      console.log(`   • Errors: ${results.errors}`);
      console.log(`   • Duration: ${duration}s`);
      console.log('');
      
      if (results.created >= 20) {
        console.log('🎯 Success! Created 20+ sessions as required.');
      } else if (results.created > 0) {
        console.log(`⚠️  Created ${results.created} sessions (target: 20+)`);
        console.log('   Try different search parameters for more results.');
      } else {
        console.log('❌ No sessions were created. Check your search parameters.');
      }
      
    } else {
      console.error('❌ Harvest failed:');
      console.error(`   Status: ${response.status}`);
      console.error(`   Error: ${response.data.error || 'Unknown error'}`);
      process.exit(1);
    }
    
  } catch (error) {
    console.error('❌ Request failed:', error.message);
    process.exit(1);
  }
}

// Handle CLI execution
if (require.main === module) {
  main();
}

module.exports = { main, parseArgs };