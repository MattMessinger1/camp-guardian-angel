#!/usr/bin/env node

/**
 * Session Merger CLI
 * 
 * Usage: npm run merge --source-id=uuid [--confidence=0.6] [--threshold=0.85] [--dry-run]
 * Usage: node scripts/merge-sessions.js --all [--dry-run]
 */

const https = require('https');

const SUPABASE_URL = 'https://ezvwyfqtyanwnoyymhav.supabase.co';
const FUNCTION_URL = `${SUPABASE_URL}/functions/v1/merge-sessions`;

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

function validateUuid(uuid) {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

async function main() {
  const args = parseArguments();
  
  // Check for help
  if (args.help || args.h) {
    console.log(`
Session Merger CLI

Usage:
  npm run merge --all [--confidence=0.6] [--threshold=0.85] [--dry-run]
  npm run merge --source-id=uuid [--confidence=0.6] [--threshold=0.85] [--dry-run]
  node scripts/merge-sessions.js --candidates=id1,id2,id3 [--dry-run]

Options:
  --all               Process all pending candidates
  --source-id         Process candidates from specific source (UUID)
  --candidates        Process specific candidate IDs (comma-separated)
  --confidence        Minimum confidence score (default: 0.6)
  --threshold         Fuzzy matching threshold (default: 0.85)
  --dry-run           Preview changes without applying them
  --help, -h          Show this help message

Examples:
  npm run merge --all --dry-run
  npm run merge --source-id=123e4567-e89b-12d3-a456-426614174000 --confidence=0.7
  npm run merge --candidates=abc-123,def-456 --threshold=0.9
    `);
    return;
  }
  
  // Validate arguments
  if (!args.all && !args['source-id'] && !args.candidates) {
    console.error('❌ Error: Must specify --all, --source-id, or --candidates');
    console.error('Usage: npm run merge --all [options]');
    process.exit(1);
  }
  
  if (args['source-id'] && !validateUuid(args['source-id'])) {
    console.error('❌ Error: Invalid UUID format for --source-id');
    process.exit(1);
  }
  
  const minConfidence = args.confidence ? parseFloat(args.confidence) : 0.6;
  const matchThreshold = args.threshold ? parseFloat(args.threshold) : 0.85;
  const dryRun = args['dry-run'] || false;
  
  if (isNaN(minConfidence) || minConfidence < 0 || minConfidence > 1) {
    console.error('❌ Error: --confidence must be a number between 0 and 1');
    process.exit(1);
  }
  
  if (isNaN(matchThreshold) || matchThreshold < 0 || matchThreshold > 1) {
    console.error('❌ Error: --threshold must be a number between 0 and 1');
    process.exit(1);
  }
  
  // Prepare request
  const mergeRequest = {
    minConfidence: minConfidence,
    matchThreshold: matchThreshold,
    dryRun: dryRun
  };
  
  if (args['source-id']) {
    mergeRequest.sourceId = args['source-id'];
  }
  
  if (args.candidates) {
    mergeRequest.candidateIds = args.candidates.split(',').map(id => id.trim());
  }
  
  console.log('🔄 Starting session merge operation...');
  console.log(`   Scope: ${args.all ? 'All pending candidates' : args['source-id'] ? `Source ${args['source-id']}` : `${mergeRequest.candidateIds.length} specific candidates`}`);
  console.log(`   Min confidence: ${minConfidence}`);
  console.log(`   Match threshold: ${matchThreshold}`);
  console.log(`   Mode: ${dryRun ? 'DRY RUN (preview only)' : 'LIVE (will make changes)'}`);
  console.log('');
  
  try {
    const startTime = Date.now();
    
    const response = await makeRequest(FUNCTION_URL, mergeRequest);
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    
    if (response.status === 200 && response.data.success) {
      const data = response.data;
      
      console.log('✅ MERGE COMPLETED SUCCESSFULLY!');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(`📊 Summary:`);
      console.log(`   Duration: ${duration}s`);
      console.log(`   Processed: ${data.processed} candidates`);
      console.log(`   Merged: ${data.merged} into existing sessions`);
      console.log(`   Created: ${data.created} new sessions`);
      console.log(`   Conflicts: ${data.conflicts} sessions with conflicts`);
      
      if (data.errors && data.errors.length > 0) {
        console.log(`   Errors: ${data.errors.length}`);
      }
      
      console.log('');
      
      if (data.details && data.details.length > 0) {
        console.log('📋 DETAILED RESULTS:');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        
        // Group by action
        const grouped = data.details.reduce((acc, detail) => {
          if (!acc[detail.action]) acc[detail.action] = [];
          acc[detail.action].push(detail);
          return acc;
        }, {});
        
        if (grouped.merged) {
          console.log(`\n🔄 MERGED (${grouped.merged.length}):`);
          grouped.merged.forEach(detail => {
            console.log(`   ${detail.candidateId} → ${detail.sessionId}`);
            if (detail.conflicts && detail.conflicts.length > 0) {
              console.log(`      ⚠️  Conflicts: ${detail.conflicts.join(', ')}`);
            }
          });
        }
        
        if (grouped.created) {
          console.log(`\n✨ CREATED (${grouped.created.length}):`);
          grouped.created.forEach(detail => {
            console.log(`   ${detail.candidateId} → ${detail.sessionId} (new)`);
          });
        }
        
        if (grouped.error) {
          console.log(`\n❌ ERRORS (${grouped.error.length}):`);
          grouped.error.forEach(detail => {
            console.log(`   ${detail.candidateId}: ${detail.error}`);
          });
        }
      }
      
      // Show efficiency metrics
      const totalChanges = data.merged + data.created;
      if (totalChanges > 0) {
        console.log('');
        console.log('📈 EFFICIENCY:');
        console.log(`   Deduplication: ${data.merged}/${data.processed} (${(data.merged/data.processed*100).toFixed(1)}%) merged vs created new`);
        console.log(`   Conflict rate: ${data.conflicts}/${totalChanges} (${(data.conflicts/totalChanges*100).toFixed(1)}%) sessions with conflicts`);
      }
      
      if (dryRun) {
        console.log('');
        console.log('🔍 DRY RUN COMPLETE - No changes were made');
        console.log('   Remove --dry-run flag to apply these changes');
      }
      
    } else {
      console.error('❌ MERGE FAILED');
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
    console.error('❌ Merge request failed');
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

module.exports = { main, parseArguments, validateUuid };