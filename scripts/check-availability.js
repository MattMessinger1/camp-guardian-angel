#!/usr/bin/env node

/**
 * Availability Checker CLI
 * 
 * Usage: npm run check-availability --all [--batch-size=5]
 * Usage: node scripts/check-availability.js --urls=url1,url2,url3
 */

const https = require('https');

const SUPABASE_URL = 'https://ezvwyfqtyanwnoyymhav.supabase.co';
const FUNCTION_URL = `${SUPABASE_URL}/functions/v1/check-availability`;

async function makeRequest(url, data) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(data);
    
    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
        'Authorization': `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV6dnd5ZnF0eWFud25veXltaGF2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ4NjY5MjQsImV4cCI6MjA3MDQ0MjkyNH0.FxQZcpBxYVmnUI-yyE15N7y-ai6ADPiQV9X8szQtIjI`
      }
    };
    
    const req = https.request(url, options, (res) => {
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

function validateUrls(urlString) {
  const urls = urlString.split(',').map(url => url.trim());
  const invalid = urls.filter(url => {
    try {
      new URL(url);
      return false;
    } catch {
      return true;
    }
  });
  
  if (invalid.length > 0) {
    throw new Error(`Invalid URLs: ${invalid.join(', ')}`);
  }
  
  return urls;
}

async function main() {
  const args = parseArguments();
  
  // Check for help
  if (args.help || args.h) {
    console.log(`
Availability Checker CLI

Usage:
  npm run check-availability --all [--batch-size=5]
  npm run check-availability --source-id=uuid [--batch-size=5]
  npm run check-availability --sessions=id1,id2,id3
  node scripts/check-availability.js --urls=url1,url2,url3

Options:
  --all               Check all sessions with signup URLs
  --source-id         Check sessions from specific source (UUID)
  --sessions          Check specific session IDs (comma-separated)
  --urls              Check specific URLs (comma-separated)
  --batch-size        Process N URLs at a time (default: 5)
  --help, -h          Show this help message

Examples:
  npm run check-availability --all --batch-size=10
  npm run check-availability --source-id=123e4567-e89b-12d3-a456-426614174000
  npm run check-availability --urls="https://example.com/camp1,https://example.com/camp2"
    `);
    return;
  }
  
  // Validate arguments
  if (!args.all && !args['source-id'] && !args.sessions && !args.urls) {
    console.error('❌ Error: Must specify --all, --source-id, --sessions, or --urls');
    console.error('Usage: npm run check-availability --all');
    process.exit(1);
  }
  
  const batchSize = args['batch-size'] ? parseInt(args['batch-size'], 10) : 5;
  
  if (isNaN(batchSize) || batchSize < 1 || batchSize > 20) {
    console.error('❌ Error: --batch-size must be a number between 1 and 20');
    process.exit(1);
  }
  
  // Prepare request
  const checkRequest = {
    batchSize: batchSize
  };
  
  if (args['source-id']) {
    checkRequest.sourceId = args['source-id'];
  }
  
  if (args.sessions) {
    checkRequest.sessionIds = args.sessions.split(',').map(id => id.trim());
  }
  
  if (args.urls) {
    try {
      checkRequest.urls = validateUrls(args.urls);
    } catch (error) {
      console.error('❌ Error:', error.message);
      process.exit(1);
    }
  }
  
  console.log('🔍 Starting availability check...');
  console.log(`   Scope: ${args.all ? 'All sessions with URLs' : args['source-id'] ? `Source ${args['source-id']}` : args.sessions ? `${checkRequest.sessionIds.length} specific sessions` : `${checkRequest.urls.length} specific URLs`}`);
  console.log(`   Batch size: ${batchSize}`);
  console.log('');
  
  try {
    const startTime = Date.now();
    
    const response = await makeRequest(FUNCTION_URL, checkRequest);
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    
    if (response.status === 200 && response.data.success) {
      const data = response.data;
      
      console.log('✅ AVAILABILITY CHECK COMPLETED!');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(`📊 Summary:`);
      console.log(`   Duration: ${duration}s`);
      console.log(`   Processed: ${data.processed} URLs`);
      console.log(`   Updated: ${data.updated} sessions`);
      console.log(`   Errors: ${data.errors.length}`);
      console.log('');
      
      if (data.results && data.results.length > 0) {
        // Group results by status
        const statusGroups = data.results.reduce((groups, result) => {
          if (!groups[result.status]) groups[result.status] = [];
          groups[result.status].push(result);
          return groups;
        }, {});
        
        console.log('📋 AVAILABILITY RESULTS:');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        
        const statusEmojis = {
          'open': '🟢',
          'limited': '🟡', 
          'waitlist': '🔵',
          'full': '🔴',
          'unknown': '⚪'
        };
        
        Object.entries(statusGroups).forEach(([status, results]) => {
          const emoji = statusEmojis[status] || '❓';
          console.log(`\n${emoji} ${status.toUpperCase()} (${results.length}):`);
          
          results.forEach(result => {
            console.log(`   ${result.url}`);
            if (result.sessionId) {
              console.log(`      Session: ${result.sessionId}`);
            }
            console.log(`      Confidence: ${(result.confidence * 100).toFixed(1)}%`);
            
            if (result.evidence && result.evidence.length > 0) {
              console.log(`      Evidence:`);
              result.evidence.slice(0, 3).forEach(evidence => {
                console.log(`        • ${evidence}`);
              });
              if (result.evidence.length > 3) {
                console.log(`        ... +${result.evidence.length - 3} more`);
              }
            }
            
            if (result.error) {
              console.log(`      ❌ Error: ${result.error}`);
            }
            console.log('');
          });
        });
        
        // Show statistics
        console.log('📈 STATISTICS:');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        Object.entries(statusGroups).forEach(([status, results]) => {
          const percentage = (results.length / data.results.length * 100).toFixed(1);
          const avgConfidence = results.reduce((sum, r) => sum + r.confidence, 0) / results.length;
          console.log(`   ${statusEmojis[status]} ${status}: ${results.length} (${percentage}%) - avg confidence: ${(avgConfidence * 100).toFixed(1)}%`);
        });
        
        const highConfidence = data.results.filter(r => r.confidence >= 0.7).length;
        console.log(`   🎯 High confidence (≥70%): ${highConfidence}/${data.results.length} (${(highConfidence/data.results.length*100).toFixed(1)}%)`);
      }
      
      if (data.errors && data.errors.length > 0) {
        console.log('\n❌ ERRORS:');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        data.errors.slice(0, 10).forEach(error => {
          console.log(`   • ${error}`);
        });
        if (data.errors.length > 10) {
          console.log(`   ... +${data.errors.length - 10} more errors`);
        }
      }
      
    } else {
      console.error('❌ AVAILABILITY CHECK FAILED');
      console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.error(`   Status: ${response.status}`);
      console.error(`   Duration: ${duration}s`);
      
      if (response.data.error) {
        console.error(`   Error: ${response.data.error}`);
      }
      
      if (response.data.errors && response.data.errors.length > 0) {
        console.error(`   Detailed errors:`);
        response.data.errors.forEach(error => {
          console.error(`     ❌ ${error}`);
        });
      }
      
      process.exit(1);
    }
    
  } catch (error) {
    console.error('❌ Check request failed');
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

module.exports = { main, parseArguments, validateUrls };