#!/usr/bin/env node

/**
 * Test Availability Checker with Sample URLs
 * 
 * Usage: node test-availability-checker.js
 */

const https = require('https');

const SUPABASE_URL = 'https://ezvwyfqtyanwnoyymhav.supabase.co';
const FUNCTION_URL = `${SUPABASE_URL}/functions/v1/check-availability`;

// Sample test URLs representing different availability scenarios
const TEST_URLS = [
  // These would be real URLs in practice - using examples for demonstration
  'https://www.madisonparks.org/programs/summer-camps',
  'https://ymcadane.org/programs/camps',
  'https://www.activekids.com/camps/madison',
  'https://example-camp.com/register',
  'https://fullcamp.org/sold-out',
  'https://waitlist-camp.com/programs',
  'https://open-registration.org/summer',
  'https://limited-spots.com/camps',
  'https://coming-soon-camp.org/2024',
  'https://registration-closed.com/programs'
];

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

function testPatternMatching() {
  console.log('🧪 Testing Availability Detection Patterns');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  const testCases = [
    {
      html: '<button disabled>Register Now</button><p>This camp is sold out</p>',
      expected: 'full',
      description: 'Disabled button + sold out text'
    },
    {
      html: '<div>Join Waitlist</div><p>Registration is currently full but you can join our waiting list</p>',
      expected: 'waitlist', 
      description: 'Waitlist language'
    },
    {
      html: '<button>Register Now</button><p>Few spots left! Register today.</p>',
      expected: 'limited',
      description: 'Limited availability warning'
    },
    {
      html: '<div class="availability">Spaces available</div><button>Sign Up Now</button>',
      expected: 'open',
      description: 'Open registration indicators'
    },
    {
      html: '<p>Registration opens March 15th</p><div>Coming Soon</div>',
      expected: 'waitlist',
      description: 'Future registration date'
    },
    {
      html: '<span style="text-decoration: line-through">$200</span><p>Registration Closed</p>',
      expected: 'full',
      description: 'Strikethrough price + closed message'
    }
  ];
  
  // Simple pattern matching test (would use actual function in real implementation)
  const patterns = {
    full: /\b(sold\s?out|fully\s?booked|registration\s?closed|disabled.*register)\b/i,
    waitlist: /\b(join\s?waitlist|waiting\s?list|registration\s?opens?|coming\s?soon)\b/i,
    limited: /\b(few\s?spots?\s?left|limited\s?spaces?|hurry)\b/i,
    open: /\b(register\s?now|sign\s?up\s?now|spaces?\s?available)\b/i
  };
  
  console.log('Test cases:');
  testCases.forEach((testCase, index) => {
    let detectedStatus = 'unknown';
    let maxMatches = 0;
    
    for (const [status, pattern] of Object.entries(patterns)) {
      const matches = (testCase.html.match(pattern) || []).length;
      if (matches > maxMatches) {
        maxMatches = matches;
        detectedStatus = status;
      }
    }
    
    const match = detectedStatus === testCase.expected ? '✅' : '❌';
    console.log(`   ${index + 1}. ${match} ${testCase.description}`);
    console.log(`      Expected: ${testCase.expected}, Got: ${detectedStatus}`);
    console.log(`      HTML: ${testCase.html.substring(0, 80)}...`);
    console.log('');
  });
}

async function runAvailabilityTest() {
  console.log('🔍 Testing Availability Checker with Sample URLs');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');
  
  // Use a subset of test URLs for demo
  const testUrls = TEST_URLS.slice(0, 5);
  
  console.log(`📋 Testing with ${testUrls.length} sample URLs:`);
  testUrls.forEach((url, index) => {
    console.log(`   ${index + 1}. ${url}`);
  });
  console.log('');
  
  try {
    const startTime = Date.now();
    
    console.log('🤖 Sending to availability checker...');
    
    const response = await makeRequest(FUNCTION_URL, {
      urls: testUrls,
      batchSize: 3
    });
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    
    if (response.status === 200 && response.data.success) {
      const data = response.data;
      
      console.log('✅ AVAILABILITY CHECK SUCCESSFUL!');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(`📊 Results Summary:`);
      console.log(`   Duration: ${duration}s`);
      console.log(`   Processed: ${data.processed} URLs`);
      console.log(`   Updated: ${data.updated} sessions`);
      console.log(`   Errors: ${data.errors.length}`);
      console.log('');
      
      if (data.results && data.results.length > 0) {
        console.log('📋 DETAILED RESULTS:');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        
        const statusEmojis = {
          'open': '🟢',
          'limited': '🟡',
          'waitlist': '🔵', 
          'full': '🔴',
          'unknown': '⚪'
        };
        
        data.results.forEach((result, index) => {
          const emoji = statusEmojis[result.status] || '❓';
          const confidence = (result.confidence * 100).toFixed(1);
          
          console.log(`\n${index + 1}. ${emoji} ${result.status.toUpperCase()} (${confidence}% confidence)`);
          console.log(`   URL: ${result.url}`);
          
          if (result.evidence && result.evidence.length > 0) {
            console.log(`   📝 Evidence (${result.evidence.length} items):`);
            result.evidence.slice(0, 3).forEach(evidence => {
              console.log(`      • ${evidence}`);
            });
            if (result.evidence.length > 3) {
              console.log(`      ... +${result.evidence.length - 3} more items`);
            }
          } else {
            console.log(`   📝 No clear evidence found`);
          }
          
          if (result.error) {
            console.log(`   ❌ Error: ${result.error}`);
          }
        });
        
        console.log('');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        
        // Quality assessment
        const statusCounts = data.results.reduce((counts, result) => {
          counts[result.status] = (counts[result.status] || 0) + 1;
          return counts;
        }, {});
        
        const highConfidence = data.results.filter(r => r.confidence >= 0.7).length;
        const mediumConfidence = data.results.filter(r => r.confidence >= 0.4 && r.confidence < 0.7).length;
        const lowConfidence = data.results.filter(r => r.confidence < 0.4).length;
        
        console.log('🎯 QUALITY ASSESSMENT:');
        console.log(`   📊 Status Distribution:`);
        Object.entries(statusCounts).forEach(([status, count]) => {
          const emoji = statusEmojis[status] || '❓';
          const percentage = (count / data.results.length * 100).toFixed(1);
          console.log(`      ${emoji} ${status}: ${count} (${percentage}%)`);
        });
        
        console.log(`   🎯 Confidence Distribution:`);
        console.log(`      🟢 High (≥70%): ${highConfidence} results`);
        console.log(`      🟡 Medium (40-69%): ${mediumConfidence} results`);
        console.log(`      🔴 Low (<40%): ${lowConfidence} results`);
        
        if (highConfidence >= Math.ceil(data.results.length * 0.6)) {
          console.log(`   ✅ SUCCESS: ${highConfidence}/${data.results.length} high-confidence results (target: ≥60%)`);
        } else {
          console.log(`   ⚠️  WARNING: Only ${highConfidence}/${data.results.length} high-confidence results (target: ≥60%)`);
        }
        
        const nonUnknown = data.results.filter(r => r.status !== 'unknown').length;
        if (nonUnknown >= Math.ceil(data.results.length * 0.7)) {
          console.log(`   ✅ SUCCESS: ${nonUnknown}/${data.results.length} classified results (target: ≥70%)`);
        } else {
          console.log(`   ⚠️  WARNING: Only ${nonUnknown}/${data.results.length} classified results (target: ≥70%)`);
        }
        
      } else {
        console.log('❌ No results returned');
      }
      
      if (data.errors && data.errors.length > 0) {
        console.log('\n❌ ERRORS ENCOUNTERED:');
        data.errors.forEach(error => {
          console.log(`   • ${error}`);
        });
      }
      
    } else {
      console.error('❌ AVAILABILITY CHECK FAILED');
      console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.error(`   Status: ${response.status}`);
      console.error(`   Duration: ${duration}s`);
      
      if (response.data.error) {
        console.error(`   Error: ${response.data.error}`);
      }
      
      process.exit(1);
    }
    
  } catch (error) {
    console.error('❌ TEST FAILED');
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.error(`   Error: ${error.message}`);
    process.exit(1);
  }
}

async function main() {
  // Test pattern matching first
  testPatternMatching();
  
  console.log('');
  
  // Test availability checking
  await runAvailabilityTest();
  
  console.log('');
  console.log('💡 NEXT STEPS:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('   1. Test with real camp URLs from your database');
  console.log('   2. Run: npm run check-availability --all');
  console.log('   3. Monitor confidence scores and adjust patterns');
  console.log('   4. Set up regular availability monitoring');
  console.log('   5. Review and validate edge cases manually');
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

module.exports = { runAvailabilityTest, testPatternMatching, TEST_URLS };