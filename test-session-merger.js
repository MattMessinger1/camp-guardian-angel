#!/usr/bin/env node

/**
 * Test Session Merger with Sample Data
 * 
 * Usage: node test-session-merger.js
 */

const https = require('https');

const SUPABASE_URL = 'https://ezvwyfqtyanwnoyymhav.supabase.co';
const MERGE_FUNCTION_URL = `${SUPABASE_URL}/functions/v1/merge-sessions`;

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

async function runMergeTest() {
  console.log('🧪 Testing Session Merger');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');
  
  // Test parameters
  const testConfigs = [
    {
      name: 'All Pending Candidates (Dry Run)',
      request: {
        minConfidence: 0.6,
        matchThreshold: 0.85,
        dryRun: true
      }
    },
    {
      name: 'High Confidence Only (Dry Run)',
      request: {
        minConfidence: 0.8,
        matchThreshold: 0.85,
        dryRun: true
      }
    },
    {
      name: 'Strict Matching (Dry Run)',
      request: {
        minConfidence: 0.6,
        matchThreshold: 0.95,
        dryRun: true
      }
    }
  ];
  
  for (const config of testConfigs) {
    console.log(`🔬 Test: ${config.name}`);
    console.log(`   Parameters:`, config.request);
    console.log('');
    
    try {
      const startTime = Date.now();
      
      const response = await makeRequest(MERGE_FUNCTION_URL, config.request);
      
      const duration = ((Date.now() - startTime) / 1000).toFixed(1);
      
      if (response.status === 200 && response.data.success) {
        const data = response.data;
        
        console.log(`   ✅ SUCCESS (${duration}s)`);
        console.log(`   📊 Results:`);
        console.log(`      Processed: ${data.processed}`);
        console.log(`      Merged: ${data.merged}`);
        console.log(`      Created: ${data.created}`);
        console.log(`      Conflicts: ${data.conflicts}`);
        console.log(`      Errors: ${data.errors?.length || 0}`);
        
        if (data.details && data.details.length > 0) {
          // Show sample results
          const sampleSize = Math.min(3, data.details.length);
          console.log(`   📋 Sample Results (showing ${sampleSize}/${data.details.length}):`);
          
          for (let i = 0; i < sampleSize; i++) {
            const detail = data.details[i];
            const actionEmoji = {
              'merged': '🔄',
              'created': '✨',
              'error': '❌'
            }[detail.action] || '❓';
            
            console.log(`      ${actionEmoji} ${detail.action.toUpperCase()}: ${detail.candidateId}`);
            if (detail.sessionId) {
              console.log(`         → Session: ${detail.sessionId}`);
            }
            if (detail.conflicts && detail.conflicts.length > 0) {
              console.log(`         ⚠️  Conflicts: ${detail.conflicts.length} items`);
            }
            if (detail.error) {
              console.log(`         ❌ Error: ${detail.error}`);
            }
          }
        }
        
        // Calculate efficiency metrics
        const totalCandidates = data.processed;
        const dedupeRate = totalCandidates > 0 ? (data.merged / totalCandidates * 100).toFixed(1) : 0;
        const conflictRate = (data.merged + data.created) > 0 ? (data.conflicts / (data.merged + data.created) * 100).toFixed(1) : 0;
        
        console.log(`   📈 Efficiency:`);
        console.log(`      Deduplication: ${dedupeRate}% (${data.merged}/${totalCandidates} merged)`);
        console.log(`      Conflict rate: ${conflictRate}% (${data.conflicts} sessions with conflicts)`);
        
      } else {
        console.log(`   ❌ FAILED (${duration}s)`);
        console.log(`      Status: ${response.status}`);
        if (response.data.error) {
          console.log(`      Error: ${response.data.error}`);
        }
      }
      
    } catch (error) {
      console.log(`   ❌ ERROR: ${error.message}`);
    }
    
    console.log('');
    console.log('   ─────────────────────────────────────────────');
    console.log('');
    
    // Small delay between tests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log('🎯 TEST SCENARIOS COMPLETED');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');
  console.log('📝 What to look for:');
  console.log('   ✅ High deduplication rate (50%+ candidates merged vs created)');
  console.log('   ✅ Low conflict rate (<20% sessions with conflicts)');
  console.log('   ✅ No errors in processing');
  console.log('   ✅ Consistent results across different thresholds');
  console.log('');
  console.log('💡 Next steps:');
  console.log('   1. If results look good, run without --dry-run');
  console.log('   2. Test with real data: npm run merge --all --dry-run');
  console.log('   3. Check session quality in database after merge');
  console.log('   4. Verify re-running same data doesn\'t create duplicates');
}

// Test fuzzy matching algorithm directly
function testFuzzyMatching() {
  console.log('🔍 Testing Fuzzy Matching Algorithm');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  // Mock fuzzy matcher (simplified version for testing)
  function jaroWinkler(s1, s2) {
    if (!s1 || !s2) return 0;
    if (s1 === s2) return 1;
    
    // Simplified implementation for testing
    const longer = s1.length > s2.length ? s1 : s2;
    const shorter = s1.length > s2.length ? s2 : s1;
    
    if (longer.length === 0) return 1;
    
    const editDistance = levenshtein(s1.toLowerCase(), s2.toLowerCase());
    return 1 - (editDistance / longer.length);
  }
  
  function levenshtein(a, b) {
    const matrix = [];
    for (let i = 0; i <= b.length; i++) {
      matrix[i] = [i];
    }
    for (let j = 0; j <= a.length; j++) {
      matrix[0][j] = j;
    }
    for (let i = 1; i <= b.length; i++) {
      for (let j = 1; j <= a.length; j++) {
        if (b.charAt(i - 1) === a.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }
    return matrix[b.length][a.length];
  }
  
  // Test cases
  const testCases = [
    { s1: 'Adventure Camp', s2: 'Adventure Summer Camp', expected: 'high' },
    { s1: 'Soccer Skills', s2: 'Soccer Training', expected: 'medium' },
    { s1: 'Art & Crafts', s2: 'Arts and Crafts Workshop', expected: 'high' },
    { s1: 'Swimming Lessons', s2: 'Basketball Camp', expected: 'low' },
    { s1: 'Teen Leadership', s2: 'Youth Leadership Program', expected: 'medium' },
    { s1: 'Madison Parks Soccer', s2: 'Madison Soccer Program', expected: 'high' }
  ];
  
  console.log('Test cases:');
  testCases.forEach((testCase, index) => {
    const score = jaroWinkler(testCase.s1, testCase.s2);
    const level = score >= 0.8 ? 'high' : score >= 0.6 ? 'medium' : 'low';
    const match = level === testCase.expected ? '✅' : '❌';
    
    console.log(`   ${index + 1}. ${match} "${testCase.s1}" vs "${testCase.s2}"`);
    console.log(`      Score: ${score.toFixed(3)} (${level}, expected: ${testCase.expected})`);
  });
  
  console.log('');
}

async function main() {
  // Test fuzzy matching first
  testFuzzyMatching();
  
  console.log('');
  
  // Test merge functionality
  await runMergeTest();
}

// Handle errors
process.on('unhandledRejection', (reason) => {
  console.error('❌ Unhandled Promise Rejection:', reason);
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  process.exit(1);
});

// Run the test
if (require.main === module) {
  main().catch(error => {
    console.error('❌ Test error:', error);
    process.exit(1);
  });
}

module.exports = { runMergeTest, testFuzzyMatching };