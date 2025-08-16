#!/usr/bin/env node

/**
 * Test Session Parser with Sample HTML
 * 
 * Usage: node test-sessions-parser.js
 */

const https = require('https');

// Sample HTML content for testing
const SAMPLE_HTML = `
<!DOCTYPE html>
<html>
<head>
    <title>Summer Camps 2024 - Madison Parks & Recreation</title>
</head>
<body>
    <div class="programs">
        <h1>Summer Youth Programs 2024</h1>
        
        <div class="program-card">
            <h2>Adventure Camp</h2>
            <p>Join us for an exciting outdoor adventure camp featuring hiking, rock climbing, and nature exploration.</p>
            <div class="details">
                <p><strong>Ages:</strong> 8-12 years</p>
                <p><strong>Dates:</strong> June 10 - July 15, 2024</p>
                <p><strong>Time:</strong> 9:00 AM - 3:00 PM</p>
                <p><strong>Cost:</strong> $185 per week</p>
                <p><strong>Location:</strong> Olin Park, Madison, WI</p>
                <p><strong>Capacity:</strong> 20 campers</p>
                <a href="/register/adventure-camp" class="btn">Register Now</a>
            </div>
        </div>
        
        <div class="program-card">
            <h2>Soccer Skills Camp</h2>
            <p>Improve your soccer skills with professional coaching and fun drills.</p>
            <div class="details">
                <p><strong>Ages:</strong> 6-14 years</p>
                <p><strong>Dates:</strong> July 8 - August 2, 2024</p>
                <p><strong>Time:</strong> 1:00 PM - 4:00 PM</p>
                <p><strong>Cost:</strong> $125-$150 per session</p>
                <p><strong>Location:</strong> Elver Park Soccer Fields, Madison, WI</p>
                <p><strong>Days:</strong> Monday, Wednesday, Friday</p>
                <a href="https://activecommunities.com/madison/Activity_Search/1234" class="register-link">Sign Up Online</a>
            </div>
        </div>
        
        <div class="program-card">
            <h2>Art & Crafts Workshop</h2>
            <p>Creative arts program for young artists to explore painting, sculpture, and mixed media.</p>
            <div class="details">
                <p><strong>Ages:</strong> 5-10 years old</p>
                <p><strong>When:</strong> June 15 to July 20, 2024</p>
                <p><strong>Schedule:</strong> 10:00 AM - 12:00 PM</p>
                <p><strong>Fee:</strong> $95</p>
                <p><strong>Where:</strong> Community Arts Center, 123 Main St, Madison, Wisconsin</p>
                <p><strong>Max participants:</strong> 15</p>
            </div>
        </div>
        
        <div class="program-card">
            <h2>Teen Leadership Program</h2>
            <p>Leadership development and community service opportunities for teens.</p>
            <div class="details">
                <p><strong>Age Range:</strong> 13-17</p>
                <p><strong>Duration:</strong> 4 weeks starting July 1st</p>
                <p><strong>Hours:</strong> 2pm to 5pm</p>
                <p><strong>Investment:</strong> $200 total</p>
                <p><strong>Meeting Location:</strong> Central Library, Madison</p>
                <p><strong>Requirements:</strong> Application required, community service interest</p>
            </div>
        </div>
        
        <div class="program-card">
            <h2>Swimming Lessons</h2>
            <p>Learn to swim or improve your swimming skills with certified instructors.</p>
            <div class="details">
                <p><strong>Age Groups:</strong> 4-6 years (Beginner), 7-12 years (Intermediate)</p>
                <p><strong>Sessions:</strong> Multiple sessions throughout summer</p>
                <p><strong>Times:</strong> Various times available</p>
                <p><strong>Pricing:</strong> $80-$120 per 2-week session</p>
                <p><strong>Venue:</strong> Goodman Pool, Madison Parks & Rec</p>
                <p><strong>Contact:</strong> Call (608) 555-0123 to register</p>
            </div>
        </div>
    </div>
</body>
</html>
`;

const SUPABASE_URL = 'https://ezvwyfqtyanwnoyymhav.supabase.co';
const FUNCTION_URL = `${SUPABASE_URL}/functions/v1/parse-sessions`;

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

async function runTest() {
  console.log('🧪 Testing Session Parser with Sample HTML');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');
  
  const testUrl = 'https://test-example.com/summer-programs';
  const minConfidence = 0.6;
  
  console.log(`📊 Test Parameters:`);
  console.log(`   URL: ${testUrl}`);
  console.log(`   Min confidence: ${minConfidence}`);
  console.log(`   HTML length: ${SAMPLE_HTML.length} characters`);
  console.log('');
  
  try {
    const startTime = Date.now();
    
    console.log('🤖 Sending to AI parser...');
    
    const response = await makeRequest(FUNCTION_URL, {
      html: SAMPLE_HTML,
      url: testUrl,
      minConfidence: minConfidence
    });
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    
    console.log(`⏱️  Processing completed in ${duration}s`);
    console.log('');
    
    if (response.status === 200 && response.data.success) {
      const data = response.data;
      
      console.log('✅ PARSING SUCCESSFUL!');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(`📈 Results Summary:`);
      console.log(`   Total extracted: ${data.totalExtracted}`);
      console.log(`   Valid candidates (≥${minConfidence} confidence): ${data.validCandidates}`);
      console.log(`   Stored in database: ${data.storedCandidates}`);
      console.log('');
      
      if (data.candidates && data.candidates.length > 0) {
        console.log('📋 EXTRACTED SESSION CANDIDATES:');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        
        data.candidates.forEach((candidate, index) => {
          const confidence = (candidate.confidence * 100).toFixed(1);
          const confidenceEmoji = candidate.confidence >= 0.8 ? '🟢' : candidate.confidence >= 0.6 ? '🟡' : '🔴';
          
          console.log(`\n${index + 1}. ${confidenceEmoji} ${candidate.title || 'Untitled Session'}`);
          console.log(`   Confidence: ${confidence}%`);
          
          if (candidate.startDate) {
            const dateRange = candidate.endDate && candidate.endDate !== candidate.startDate 
              ? `${candidate.startDate} to ${candidate.endDate}`
              : candidate.startDate;
            console.log(`   📅 Dates: ${dateRange}`);
          }
          
          if (candidate.ageRange && candidate.ageRange !== '?-?') {
            console.log(`   👶 Ages: ${candidate.ageRange} years`);
          }
          
          if (candidate.priceRange && candidate.priceRange !== '$?-?') {
            console.log(`   💰 Price: ${candidate.priceRange}`);
          }
          
          if (candidate.location) {
            console.log(`   📍 Location: ${candidate.location}`);
          }
        });
        
        console.log('');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        
        // Quality assessment
        const highConfidence = data.candidates.filter(c => c.confidence >= 0.7).length;
        const mediumConfidence = data.candidates.filter(c => c.confidence >= 0.6 && c.confidence < 0.7).length;
        
        console.log('🎯 QUALITY ASSESSMENT:');
        console.log(`   🟢 High confidence (≥70%): ${highConfidence} candidates`);
        console.log(`   🟡 Medium confidence (60-69%): ${mediumConfidence} candidates`);
        
        if (highConfidence >= 5) {
          console.log(`   ✅ SUCCESS: Found ${highConfidence} high-quality candidates (target: ≥5)`);
        } else {
          console.log(`   ⚠️  WARNING: Only ${highConfidence} high-quality candidates (target: ≥5)`);
        }
        
      } else {
        console.log('❌ No valid candidates found');
        console.log('   This might indicate:');
        console.log('   - HTML content not matching expected patterns');
        console.log('   - Confidence threshold too high');
        console.log('   - AI model needs better prompting');
      }
      
    } else {
      console.error('❌ PARSING FAILED');
      console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.error(`   Status: ${response.status}`);
      console.error(`   Duration: ${duration}s`);
      
      if (response.data.error) {
        console.error(`   Error: ${response.data.error}`);
      } else {
        console.error(`   Response: ${JSON.stringify(response.data, null, 2)}`);
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
  runTest().catch(error => {
    console.error('❌ Test error:', error);
    process.exit(1);
  });
}

module.exports = { runTest, SAMPLE_HTML };