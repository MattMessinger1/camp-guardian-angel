#!/usr/bin/env node

/**
 * B.5 Availability Tagging Test
 * Tests the availability checking system
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

async function main() {
  console.log('🚀 B.5 Availability Tagging Test');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Testing availability checking system...\n');

  try {
    const startTime = Date.now();
    
    // Test with the sessions we created
    const response = await makeRequest(FUNCTION_URL, {
      sessionIds: [
        '550e8400-e29b-41d4-a716-446655440010', // register-now
        '550e8400-e29b-41d4-a716-446655440011', // few-spots-left  
        '550e8400-e29b-41d4-a716-446655440012', // sold-out
        '550e8400-e29b-41d4-a716-446655440013'  // join-waitlist
      ],
      batchSize: 4
    });
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    
    console.log(`✅ Test completed in ${duration}s`);
    console.log(`📊 Status: ${response.status}`);
    
    if (response.status === 200 && response.data.success) {
      const data = response.data;
      
      console.log('\n📋 RESULTS:');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(`   Processed: ${data.processed} URLs`);
      console.log(`   Updated: ${data.updated} sessions`);
      console.log(`   Errors: ${data.errors?.length || 0}`);
      
      if (data.results && data.results.length > 0) {
        console.log('\n🎯 SESSION AVAILABILITY STATUS:');
        data.results.forEach(result => {
          const statusEmoji = {
            'open': '🟢',
            'limited': '🟡', 
            'waitlist': '🔵',
            'full': '🔴',
            'unknown': '⚪'
          }[result.status] || '❓';
          
          console.log(`\n${statusEmoji} ${result.status.toUpperCase()}`);
          console.log(`   URL: ${result.url}`);
          console.log(`   Session: ${result.sessionId}`);
          console.log(`   Confidence: ${(result.confidence * 100).toFixed(1)}%`);
          
          if (result.evidence && result.evidence.length > 0) {
            console.log(`   Evidence:`);
            result.evidence.slice(0, 2).forEach(evidence => {
              console.log(`     • ${evidence}`);
            });
          }
        });
        
        // Check for expected statuses
        console.log('\n✅ STATUS VALIDATION:');
        const statusCounts = data.results.reduce((counts, r) => {
          counts[r.status] = (counts[r.status] || 0) + 1;
          return counts;
        }, {});
        
        const expectedStatuses = ['open', 'limited', 'waitlist', 'full', 'unknown'];
        expectedStatuses.forEach(status => {
          const count = statusCounts[status] || 0;
          const hasStatus = count > 0 ? '✅' : '⚪';
          console.log(`   ${hasStatus} ${status}: ${count} sessions`);
        });
        
        const validStatuses = data.results.every(r => expectedStatuses.includes(r.status));
        console.log(`\n🎯 All statuses valid: ${validStatuses ? '✅' : '❌'}`);
        
      } else {
        console.log('\n⚠️  No results returned');
      }
      
      if (data.errors && data.errors.length > 0) {
        console.log('\n❌ ERRORS:');
        data.errors.forEach(error => console.log(`   • ${error}`));
      }
      
    } else {
      console.error('\n❌ Test failed');
      console.error(`   Status: ${response.status}`);
      console.error(`   Response: ${JSON.stringify(response.data, null, 2)}`);
    }
    
  } catch (error) {
    console.error('\n❌ Test error:', error.message);
  }
}

main().catch(console.error);