import { test, expect } from '@playwright/test';

/**
 * Complete User Journey End-to-End Tests
 * 
 * This test suite validates the entire Camp Guardian Angel user experience:
 * 1. Requirements Discovery - Session analysis and dynamic form generation
 * 2. Data Collection - User fills dynamic form with proper validation
 * 3. Automation Execution - Browser automation with real user data
 * 4. Results Integration - Confirmation, status tracking, and notifications
 */
test.describe('Complete User Journey - End-to-End', () => {
  
  let testSessionId: string;
  let communityPassSessionId: string;
  
  test.beforeAll(async ({ request }) => {
    // Create test sessions in database for Seattle Parks and Community Pass
    console.log('📋 Setting up test sessions for Seattle Parks and Community Pass...');
    
    // Create Seattle Parks session
    const seattleParksResponse = await request.post('/api/test-setup', {
      data: {
        action: 'create_session',
        session_data: {
          title: 'YMCA Summer Day Camp - Week 1',
          name: 'YMCA Summer Adventure Camp',
          platform: 'seattle_parks',
          signup_url: 'https://web1.myvscloud.com/wbwsc/seattlewashington.wsc/search.html',
          source_url: 'https://web1.myvscloud.com/wbwsc/seattlewashington.wsc/search.html',
          start_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
          end_at: new Date(Date.now() + 35 * 24 * 60 * 60 * 1000).toISOString(),
          location: 'Green Lake Community Center',
          location_city: 'Seattle',
          location_state: 'WA',
          age_min: 6,
          age_max: 12,
          price_min: 245,
          price_max: 245,
          capacity: 20,
          spots_available: 15,
          availability_status: 'open',
          registration_open_at: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString() // Tomorrow
        }
      }
    });
    
    const seattleParksData = await seattleParksResponse.json();
    testSessionId = seattleParksData.session_id;
    
    // Create Community Pass session
    const communityPassResponse = await request.post('/api/test-setup', {
      data: {
        action: 'create_session',
        session_data: {
          title: 'Soccer Skills Camp - Beginner',
          name: 'Youth Soccer Development',
          platform: 'community_pass',
          signup_url: 'https://register.communitypass.net/seattle',
          source_url: 'https://register.communitypass.net/seattle',
          start_at: new Date(Date.now() + 25 * 24 * 60 * 60 * 1000).toISOString(),
          end_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          location: 'Magnolia Playfield',
          location_city: 'Seattle',
          location_state: 'WA',
          age_min: 8,
          age_max: 14,
          price_min: 180,
          price_max: 180,
          capacity: 16,
          spots_available: 8,
          availability_status: 'open',
          registration_open_at: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString() // In 2 days
        }
      }
    });
    
    const communityPassData = await communityPassResponse.json();
    communityPassSessionId = communityPassData.session_id;
    
    console.log(`✅ Created test sessions: Seattle Parks (${testSessionId}), Community Pass (${communityPassSessionId})`);
  });

  test.afterAll(async ({ request }) => {
    // Cleanup test sessions
    console.log('🧹 Cleaning up test sessions...');
    
    try {
      await request.post('/api/test-cleanup', {
        data: {
          action: 'delete_sessions',
          session_ids: [testSessionId, communityPassSessionId]
        }
      });
      console.log('✅ Test sessions cleaned up successfully');
    } catch (error) {
      console.log('⚠️ Cleanup warning:', error);
    }
  });

  test('E2E-001: Complete Seattle Parks User Journey', async ({ page }) => {
    console.log('\n🎯 PHASE 1: Requirements Discovery Test');
    
    // Step 1: Navigate to signup with session ID
    await page.goto(`/signup?sessionId=${testSessionId}`);
    
    // Wait for requirements analysis to complete
    await page.waitForSelector('[data-testid="dynamic-requirements-form"]', { timeout: 15000 });
    
    // Verify session analysis completed
    await expect(page.locator('[data-testid="session-analysis-summary"]')).toBeVisible();
    await expect(page.locator('[data-testid="session-analysis-summary"]')).toContainText('YMCA Summer Day Camp');
    
    console.log('✅ Session analysis completed and summary displayed');
    
    // Verify dynamic form shows Seattle Parks specific fields
    const formContainer = page.locator('[data-testid="dynamic-requirements-form"]');
    await expect(formContainer).toBeVisible();
    
    // Check for expected Seattle Parks fields
    await expect(page.locator('label:has-text("Parent/Guardian Name")')).toBeVisible();
    await expect(page.locator('label:has-text("Participant Name")')).toBeVisible();
    await expect(page.locator('label:has-text("Participant Date of Birth")')).toBeVisible();
    await expect(page.locator('label:has-text("Email Address")')).toBeVisible();
    await expect(page.locator('label:has-text("Emergency Contact")')).toBeVisible();
    
    console.log('✅ Dynamic form generated with Seattle Parks specific requirements');
    
    console.log('\n🎯 PHASE 2: Data Collection Test');
    
    // Step 2: Fill out the dynamically generated form
    await page.fill('input[name="guardian_name"]', 'John Smith');
    await page.fill('input[name="child_name"]', 'Emma Smith');
    await page.fill('input[name="child_dob"]', '2015-08-15');
    await page.fill('input[name="email"]', 'john.smith@example.com');
    await page.fill('input[name="phone"]', '(206) 555-0123');
    await page.fill('input[name="emergency_contact_name"]', 'Sarah Smith');
    await page.fill('input[name="emergency_contact_phone"]', '(206) 555-0124');
    
    console.log('✅ Form data entered successfully');
    
    // Verify form validation passes
    const submitButton = page.locator('[data-testid="submit-signup-form"]');
    await expect(submitButton).toBeEnabled();
    
    // Step 3: Submit form and verify data collection
    await submitButton.click();
    
    // Wait for form processing
    await page.waitForSelector('[data-testid="automation-status"]', { timeout: 10000 });
    
    console.log('✅ Form submitted and data collected successfully');
    
    console.log('\n🎯 PHASE 3: End-to-End Automation Execution');
    
    // Step 4: Monitor automation progress
    const automationStatus = page.locator('[data-testid="automation-status"]');
    await expect(automationStatus).toBeVisible();
    
    // Wait for browser initialization
    await expect(page.locator('[data-testid="browser-session-init"]')).toBeVisible({ timeout: 20000 });
    console.log('✅ Browser session initialized');
    
    // Wait for navigation to signup URL
    await expect(page.locator('[data-testid="navigation-complete"]')).toBeVisible({ timeout: 30000 });
    console.log('✅ Navigation to Seattle Parks signup page completed');
    
    // Wait for form analysis
    await expect(page.locator('[data-testid="form-analysis-complete"]')).toBeVisible({ timeout: 20000 });
    console.log('✅ Form analysis completed');
    
    // Monitor for potential CAPTCHA detection
    const captchaDetected = await page.locator('[data-testid="captcha-detected"]').isVisible({ timeout: 5000 });
    
    if (captchaDetected) {
      console.log('🧩 CAPTCHA detected - testing human assistance flow');
      
      // Verify CAPTCHA assistance UI appears
      await expect(page.locator('[data-testid="captcha-assistance-ui"]')).toBeVisible();
      await expect(page.locator('[data-testid="sms-notification-sent"]')).toBeVisible({ timeout: 10000 });
      
      // Simulate CAPTCHA resolution
      await page.click('[data-testid="simulate-captcha-resolved"]');
      console.log('✅ CAPTCHA assistance flow tested');
    }
    
    // Wait for form filling completion
    await expect(page.locator('[data-testid="form-filling-complete"]')).toBeVisible({ timeout: 30000 });
    console.log('✅ Form filling completed with user data');
    
    // Wait for final submission
    await expect(page.locator('[data-testid="registration-submitted"]')).toBeVisible({ timeout: 20000 });
    console.log('✅ Registration submitted to Seattle Parks');
    
    console.log('\n🎯 PHASE 4: Results Integration Test');
    
    // Step 5: Verify automation completion status
    const completionStatus = page.locator('[data-testid="automation-complete"]');
    await expect(completionStatus).toBeVisible({ timeout: 30000 });
    
    // Verify confirmation details
    await expect(page.locator('[data-testid="confirmation-number"]')).toBeVisible();
    await expect(page.locator('[data-testid="registration-success"]')).toContainText('Successfully registered Emma Smith');
    
    console.log('✅ Registration confirmation displayed');
    
    // Step 6: Test account history integration
    await page.goto('/account/history');
    await page.waitForSelector('[data-testid="registration-history"]', { timeout: 10000 });
    
    // Verify registration appears in history
    const historyItems = page.locator('[data-testid="history-item"]');
    await expect(historyItems.first()).toContainText('YMCA Summer Day Camp');
    await expect(historyItems.first()).toContainText('Emma Smith');
    await expect(historyItems.first()).toContainText('Completed');
    
    console.log('✅ Registration appears correctly in account history');
    
    // Step 7: Verify SMS notification was triggered
    const notificationStatus = await page.locator('[data-testid="sms-notification-status"]').textContent();
    expect(notificationStatus).toContain('SMS sent to (206) 555-0123');
    
    console.log('✅ SMS notification triggered successfully');
    
    console.log('\n🎉 Complete Seattle Parks user journey test PASSED!');
  });

  test('E2E-002: Complete Community Pass User Journey', async ({ page }) => {
    console.log('\n🎯 Testing Community Pass Complete User Journey');
    
    // Step 1: Navigate to Community Pass session
    await page.goto(`/signup?sessionId=${communityPassSessionId}`);
    
    // Wait for requirements analysis
    await page.waitForSelector('[data-testid="dynamic-requirements-form"]', { timeout: 15000 });
    
    // Verify Community Pass specific requirements
    await expect(page.locator('[data-testid="session-analysis-summary"]')).toContainText('Soccer Skills Camp');
    await expect(page.locator('[data-testid="auth-required-indicator"]')).toBeVisible(); // Community Pass requires auth
    
    console.log('✅ Community Pass requirements analyzed');
    
    // Step 2: Fill Community Pass specific form
    await page.fill('input[name="guardian_name"]', 'Maria Rodriguez');
    await page.fill('input[name="child_name"]', 'Diego Rodriguez');
    await page.fill('input[name="child_dob"]', '2012-03-22');
    await page.fill('input[name="email"]', 'maria.rodriguez@example.com');
    await page.fill('input[name="phone"]', '(206) 555-0125');
    
    // Community Pass specific fields
    await page.fill('input[name="username"]', 'mrodriguez2024');
    await page.fill('input[name="password"]', 'SecurePass123!');
    await page.fill('input[name="emergency_contact_name"]', 'Carlos Rodriguez');
    await page.fill('input[name="emergency_contact_phone"]', '(206) 555-0126');
    
    console.log('✅ Community Pass form filled with auth requirements');
    
    // Step 3: Submit and monitor automation
    await page.click('[data-testid="submit-signup-form"]');
    
    // Monitor Community Pass specific automation steps
    await expect(page.locator('[data-testid="browser-session-init"]')).toBeVisible({ timeout: 20000 });
    await expect(page.locator('[data-testid="account-creation-started"]')).toBeVisible({ timeout: 30000 });
    
    console.log('✅ Community Pass account creation initiated');
    
    // Wait for authentication and form filling
    await expect(page.locator('[data-testid="authentication-complete"]')).toBeVisible({ timeout: 30000 });
    await expect(page.locator('[data-testid="registration-submitted"]')).toBeVisible({ timeout: 30000 });
    
    // Step 4: Verify completion and results
    await expect(page.locator('[data-testid="automation-complete"]')).toBeVisible({ timeout: 30000 });
    await expect(page.locator('[data-testid="registration-success"]')).toContainText('Successfully registered Diego Rodriguez');
    
    console.log('✅ Community Pass registration completed successfully');
    
    console.log('\n🎉 Complete Community Pass user journey test PASSED!');
  });

  test('E2E-003: Error Handling and Recovery', async ({ page }) => {
    console.log('\n🎯 Testing Error Handling and Recovery Scenarios');
    
    // Test 1: Invalid session ID
    await page.goto('/signup?sessionId=invalid-session-id');
    await expect(page.locator('[data-testid="session-not-found-error"]')).toBeVisible({ timeout: 10000 });
    
    console.log('✅ Invalid session ID handled gracefully');
    
    // Test 2: Network interruption during requirements analysis
    await page.goto(`/signup?sessionId=${testSessionId}`);
    
    // Simulate network failure during requirements discovery
    await page.route('**/analyze-session-requirements', route => route.abort());
    
    // Should show fallback requirements
    await page.waitForSelector('[data-testid="fallback-requirements-form"]', { timeout: 15000 });
    await expect(page.locator('[data-testid="requirements-error-notice"]')).toBeVisible();
    
    console.log('✅ Network failure recovery with fallback requirements works');
    
    // Test 3: Automation failure recovery
    await page.unroute('**/analyze-session-requirements');
    await page.reload();
    
    // Wait for normal flow to start
    await page.waitForSelector('[data-testid="dynamic-requirements-form"]', { timeout: 15000 });
    
    // Fill form and start automation
    await page.fill('input[name="guardian_name"]', 'Test Parent');
    await page.fill('input[name="child_name"]', 'Test Child');
    await page.fill('input[name="child_dob"]', '2015-01-01');
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="phone"]', '(206) 555-0100');
    
    // Simulate automation failure
    await page.route('**/browser-automation-simple', route => {
      route.fulfill({
        status: 500,
        body: JSON.stringify({ error: 'Automation service unavailable' })
      });
    });
    
    await page.click('[data-testid="submit-signup-form"]');
    
    // Verify error handling
    await expect(page.locator('[data-testid="automation-error"]')).toBeVisible({ timeout: 15000 });
    await expect(page.locator('[data-testid="manual-backup-option"]')).toBeVisible();
    
    console.log('✅ Automation failure handled with manual backup option');
    
    console.log('\n🎉 Error handling and recovery tests PASSED!');
  });

  test('E2E-004: Performance and Load Testing', async ({ page }) => {
    console.log('\n🎯 Testing Performance Under Load');
    
    const startTime = Date.now();
    
    // Test rapid form submission
    await page.goto(`/signup?sessionId=${testSessionId}`);
    
    // Measure requirements discovery time
    const discoveryStart = Date.now();
    await page.waitForSelector('[data-testid="dynamic-requirements-form"]', { timeout: 20000 });
    const discoveryTime = Date.now() - discoveryStart;
    
    console.log(`✅ Requirements discovery completed in ${discoveryTime}ms`);
    expect(discoveryTime).toBeLessThan(15000); // Should complete within 15 seconds
    
    // Test form responsiveness
    const formFillStart = Date.now();
    await page.fill('input[name="guardian_name"]', 'Performance Test Parent');
    await page.fill('input[name="child_name"]', 'Performance Test Child');
    await page.fill('input[name="child_dob"]', '2015-05-15');
    await page.fill('input[name="email"]', 'perf.test@example.com');
    const formFillTime = Date.now() - formFillStart;
    
    console.log(`✅ Form filling completed in ${formFillTime}ms`);
    expect(formFillTime).toBeLessThan(2000); // Should be very responsive
    
    // Test automation startup performance
    const automationStart = Date.now();
    await page.click('[data-testid="submit-signup-form"]');
    await page.waitForSelector('[data-testid="browser-session-init"]', { timeout: 25000 });
    const automationStartTime = Date.now() - automationStart;
    
    console.log(`✅ Automation startup completed in ${automationStartTime}ms`);
    expect(automationStartTime).toBeLessThan(20000); // Should start within 20 seconds
    
    const totalTime = Date.now() - startTime;
    console.log(`✅ Total test completion time: ${totalTime}ms`);
    
    console.log('\n🎉 Performance and load tests PASSED!');
  });

  test('E2E-005: Multi-Child Registration Flow', async ({ page }) => {
    console.log('\n🎯 Testing Multi-Child Registration Flow');
    
    await page.goto(`/signup?sessionId=${testSessionId}`);
    await page.waitForSelector('[data-testid="dynamic-requirements-form"]', { timeout: 15000 });
    
    // Fill first child information
    await page.fill('input[name="guardian_name"]', 'Jennifer Wilson');
    await page.fill('input[name="child_name"]', 'Alex Wilson');
    await page.fill('input[name="child_dob"]', '2014-09-10');
    await page.fill('input[name="email"]', 'jennifer.wilson@example.com');
    await page.fill('input[name="phone"]', '(206) 555-0130');
    
    // Add second child
    await page.click('[data-testid="add-another-child"]');
    
    // Fill second child information
    await page.fill('input[name="child_2_name"]', 'Jordan Wilson');
    await page.fill('input[name="child_2_dob"]', '2016-11-22');
    
    console.log('✅ Multi-child form filled successfully');
    
    // Submit multi-child registration
    await page.click('[data-testid="submit-signup-form"]');
    
    // Verify both children are processed
    await expect(page.locator('[data-testid="automation-status"]')).toContainText('Processing registration for 2 children');
    
    // Wait for completion
    await expect(page.locator('[data-testid="automation-complete"]')).toBeVisible({ timeout: 45000 });
    
    // Verify both children are registered
    await expect(page.locator('[data-testid="registration-success"]')).toContainText('Alex Wilson');
    await expect(page.locator('[data-testid="registration-success"]')).toContainText('Jordan Wilson');
    
    console.log('✅ Multi-child registration completed successfully');
    
    // Verify in account history
    await page.goto('/account/history');
    const historyItems = page.locator('[data-testid="history-item"]');
    await expect(historyItems).toHaveCount(2); // Should show 2 registration entries
    
    console.log('\n🎉 Multi-child registration flow test PASSED!');
  });

  test('E2E-006: Cross-Platform Compatibility', async ({ page }) => {
    console.log('\n🎯 Testing Cross-Platform Compatibility');
    
    // Test different viewport sizes (mobile, tablet, desktop)
    const viewports = [
      { width: 375, height: 667, name: 'iPhone' },
      { width: 768, height: 1024, name: 'iPad' },
      { width: 1920, height: 1080, name: 'Desktop' }
    ];
    
    for (const viewport of viewports) {
      console.log(`Testing ${viewport.name} viewport (${viewport.width}x${viewport.height})`);
      
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto(`/signup?sessionId=${testSessionId}`);
      
      // Verify responsive design works
      await page.waitForSelector('[data-testid="dynamic-requirements-form"]', { timeout: 15000 });
      
      // Check form visibility and usability
      const formContainer = page.locator('[data-testid="dynamic-requirements-form"]');
      await expect(formContainer).toBeVisible();
      
      // Test form interaction on different screen sizes
      await page.fill('input[name="guardian_name"]', `Test Parent ${viewport.name}`);
      await page.fill('input[name="child_name"]', `Test Child ${viewport.name}`);
      
      const submitButton = page.locator('[data-testid="submit-signup-form"]');
      await expect(submitButton).toBeVisible();
      
      console.log(`✅ ${viewport.name} viewport test completed`);
    }
    
    // Reset to desktop viewport
    await page.setViewportSize({ width: 1920, height: 1080 });
    
    console.log('\n🎉 Cross-platform compatibility tests PASSED!');
  });
});