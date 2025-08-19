import { test, expect } from '@playwright/test';

test.describe('T0 Multi-User End-to-End Tests', () => {
  test('T0 scenario: only eligible jobs pass pre-dispatch, barrier GO starts them', async ({ 
    browser, 
    context 
  }) => {
    // Create multiple browser contexts for different users
    const contexts = await Promise.all([
      browser.newContext({ storageState: 'tests/auth/eligible-user-1.json' }),
      browser.newContext({ storageState: 'tests/auth/eligible-user-2.json' }),
      browser.newContext({ storageState: 'tests/auth/quota-exceeded-user.json' }),
      browser.newContext({ storageState: 'tests/auth/no-pm-user.json' })
    ]);

    const pages = await Promise.all(contexts.map(ctx => ctx.newPage()));
    const [eligiblePage1, eligiblePage2, quotaExceededPage, noPmPage] = pages;

    // Set up session that opens in 10 seconds
    const sessionOpenTime = new Date(Date.now() + 10000);
    
    // All users attempt to create reservations
    const reservationAttempts = await Promise.allSettled([
      // Eligible user 1 - should succeed
      eligiblePage1.evaluate(async (openTime) => {
        const response = await fetch('/api/reserve-init', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            session_id: 'hot-session-t0',
            child_id: 'eligible-child-1',
            scheduled_time: openTime
          })
        });
        return { status: response.status, data: await response.json() };
      }, sessionOpenTime.toISOString()),

      // Eligible user 2 - should succeed  
      eligiblePage2.evaluate(async (openTime) => {
        const response = await fetch('/api/reserve-init', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            session_id: 'hot-session-t0',
            child_id: 'eligible-child-2',
            scheduled_time: openTime
          })
        });
        return { status: response.status, data: await response.json() };
      }, sessionOpenTime.toISOString()),

      // Quota exceeded user - should be blocked
      quotaExceededPage.evaluate(async (openTime) => {
        const response = await fetch('/api/reserve-init', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            session_id: 'hot-session-t0',
            child_id: 'quota-child',
            scheduled_time: openTime
          })
        });
        return { status: response.status, data: await response.json() };
      }, sessionOpenTime.toISOString()),

      // No payment method user - should be blocked
      noPmPage.evaluate(async (openTime) => {
        const response = await fetch('/api/reserve-init', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            session_id: 'hot-session-t0',
            child_id: 'no-pm-child',
            scheduled_time: openTime
          })
        });
        return { status: response.status, data: await response.json() };
      }, sessionOpenTime.toISOString())
    ]);

    // Verify pre-dispatch filtering
    expect(reservationAttempts[0].status).toBe('fulfilled');
    expect((reservationAttempts[0] as any).value.status).toBe(200);
    
    expect(reservationAttempts[1].status).toBe('fulfilled');
    expect((reservationAttempts[1] as any).value.status).toBe(200);
    
    expect(reservationAttempts[2].status).toBe('fulfilled');
    expect((reservationAttempts[2] as any).value.status).toBe(429); // Quota exceeded
    
    expect(reservationAttempts[3].status).toBe('fulfilled');
    expect((reservationAttempts[3] as any).value.status).toBe(402); // Payment required

    // Wait for T0 (session open time)
    await new Promise(resolve => setTimeout(resolve, 11000));

    // Check that only eligible reservations were executed
    const executionResults = await Promise.all([
      eligiblePage1.evaluate(() => 
        fetch('/api/reservation-status/eligible-user-1-reservation').then(r => r.json())
      ),
      eligiblePage2.evaluate(() => 
        fetch('/api/reservation-status/eligible-user-2-reservation').then(r => r.json())
      )
    ]);

    expect(executionResults[0].status).toMatch(/^(success|started|queued)$/);
    expect(executionResults[1].status).toMatch(/^(success|started|queued)$/);

    // Cleanup
    await Promise.all(contexts.map(ctx => ctx.close()));
  });

  test('single user third child blocked at session level', async ({ page }) => {
    await page.goto('/login');
    await page.fill('[data-testid="email"]', 'parent-multi-child@test.com');
    await page.fill('[data-testid="password"]', 'password123');
    await page.click('[data-testid="login-button"]');

    // User already has 2 children registered for this session (pre-seeded data)
    // Try to register third child
    await page.goto('/sessions/popular-session-123');
    await page.click('[data-testid="reserve-button"]');
    await page.selectOption('[data-testid="child-select"]', 'third-child');
    await page.click('[data-testid="confirm-reserve-button"]');

    // Should see user-friendly message, not technical error
    await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
    await expect(page.locator('[data-testid="error-message"]')).toContainText(
      'You can register at most two children per session'
    );
    
    // Should not see technical error codes
    await expect(page.locator('[data-testid="error-message"]')).not.toContainText('USER_SESSION_CAP');
    await expect(page.locator('[data-testid="error-message"]')).not.toContainText('429');
  });

  test('success fee captured exactly once on provider success', async ({ page, request }) => {
    // Mock successful provider registration
    await page.route('**/api/reserve-execute', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          confirmation_number: 'CONF123456',
          provider_registration_id: 'prov_reg_789'
        })
      });
    });

    await page.goto('/login');
    await page.fill('[data-testid="email"]', 'success-fee-user@test.com');
    await page.fill('[data-testid="password"]', 'password123');
    await page.click('[data-testid="login-button"]');

    // Create and execute reservation
    await page.goto('/sessions/premium-session-456');
    await page.click('[data-testid="reserve-button"]');
    await page.selectOption('[data-testid="child-select"]', 'premium-child');
    await page.click('[data-testid="confirm-reserve-button"]');

    // Wait for reservation to complete
    await expect(page.locator('[data-testid="reservation-success"]')).toBeVisible();
    await expect(page.locator('[data-testid="confirmation-number"]')).toContainText('CONF123456');

    // Verify success fee was captured exactly once
    const feeCaptures = await request.get('/api/admin/success-fee-captures', {
      headers: { 'Authorization': 'Bearer admin-token' }
    });
    
    const capturesData = await feeCaptures.json();
    const thisReservationCaptures = capturesData.captures.filter(
      (capture: any) => capture.reservation_id === 'success-fee-user-reservation'
    );
    
    expect(thisReservationCaptures).toHaveLength(1);
    expect(thisReservationCaptures[0].amount_cents).toBe(2000); // $20.00
    expect(thisReservationCaptures[0].status).toBe('succeeded');
  });

  test('capture failure triggers retry without undoing provider success', async ({ page, request }) => {
    let feeCallCount = 0;
    
    // Mock fee capture to fail first time, succeed second time
    await page.route('**/api/capture-success-fee', async route => {
      feeCallCount++;
      if (feeCallCount === 1) {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Payment processor timeout' })
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            payment_intent_id: 'pi_retry_success'
          })
        });
      }
    });

    // Mock provider registration to always succeed
    await page.route('**/api/reserve-execute', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          confirmation_number: 'CONF_RETRY_123',
          provider_registration_id: 'prov_retry_789'
        })
      });
    });

    await page.goto('/login');
    await page.fill('[data-testid="email"]', 'retry-fee-user@test.com');
    await page.fill('[data-testid="password"]', 'password123');
    await page.click('[data-testid="login-button"]');

    // Execute reservation
    await page.goto('/sessions/retry-session-789');
    await page.click('[data-testid="reserve-button"]');
    await page.selectOption('[data-testid="child-select"]', 'retry-child');
    await page.click('[data-testid="confirm-reserve-button"]');

    // Should still show success (provider registration succeeded)
    await expect(page.locator('[data-testid="reservation-success"]')).toBeVisible();
    await expect(page.locator('[data-testid="confirmation-number"]')).toContainText('CONF_RETRY_123');

    // Wait for retry mechanism to kick in
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Verify fee capture eventually succeeded after retry
    const finalStatus = await request.get('/api/reservation-status/retry-fee-user-reservation', {
      headers: { 'Authorization': 'Bearer admin-token' }
    });
    
    const statusData = await finalStatus.json();
    expect(statusData.provider_success).toBe(true);
    expect(statusData.fee_capture_success).toBe(true);
    expect(statusData.fee_capture_attempts).toBeGreaterThan(1);
    
    // Provider registration should not have been called multiple times
    expect(statusData.provider_registration_attempts).toBe(1);
  });

  test('idempotency prevents double charging on concurrent calls', async ({ browser }) => {
    // Create two browser contexts for same user
    const context1 = await browser.newContext({ storageState: 'tests/auth/concurrent-user.json' });
    const context2 = await browser.newContext({ storageState: 'tests/auth/concurrent-user.json' });
    
    const page1 = await context1.newPage();
    const page2 = await context2.newPage();

    // Mock successful provider registration
    await Promise.all([page1, page2].map(page => 
      page.route('**/api/reserve-execute', async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            confirmation_number: 'CONCURRENT123',
            provider_registration_id: 'concurrent_reg'
          })
        });
      })
    ));

    // Both contexts try to create the same reservation simultaneously
    const reservationPromises = [page1, page2].map(async (page, index) => {
      await page.goto('/sessions/concurrent-session-999');
      await page.click('[data-testid="reserve-button"]');
      await page.selectOption('[data-testid="child-select"]', 'concurrent-child');
      await page.click('[data-testid="confirm-reserve-button"]');
      
      return page.waitForSelector('[data-testid="reservation-result"]', { timeout: 10000 });
    });

    const results = await Promise.allSettled(reservationPromises);
    
    // One should succeed, one might be duplicate-blocked
    const successResults = results.filter(r => r.status === 'fulfilled');
    expect(successResults.length).toBeGreaterThanOrEqual(1);

    // Verify only one fee charge occurred despite concurrent calls
    const page = await browser.newPage();
    await page.goto('/admin/success-fee-audit');
    
    const chargeRows = await page.locator('[data-testid="fee-charge-row"]').count();
    const concurrentCharges = await page.locator('[data-testid="fee-charge-row"]')
      .filter({ has: page.locator(':text("concurrent-session-999")') })
      .count();
      
    expect(concurrentCharges).toBe(1); // Only one charge despite concurrent attempts

    // Cleanup
    await context1.close();
    await context2.close();
  });

  test('verify unique IDs and idempotency across system', async ({ page, request }) => {
    const testData = {
      session_id: `test-session-${Date.now()}`,
      child_id: `test-child-${Date.now()}`,
      reservation_id: `res-${Date.now()}`
    };

    // Create reservation
    const createResponse = await request.post('/api/reserve-init', {
      headers: { 'Authorization': 'Bearer idempotency-user-token' },
      data: testData
    });
    
    expect(createResponse.status()).toBe(200);
    const { reservation_id } = await createResponse.json();
    
    // Verify reservation ID is UUID format
    expect(reservation_id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);

    // Try to create same reservation again (idempotency test)
    const duplicateResponse = await request.post('/api/reserve-init', {
      headers: { 'Authorization': 'Bearer idempotency-user-token' },
      data: testData
    });
    
    expect(duplicateResponse.status()).toBe(200);
    const { reservation_id: duplicateId } = await duplicateResponse.json();
    
    // Should return same reservation ID
    expect(duplicateId).toBe(reservation_id);

    // Verify database consistency
    const dbCheck = await request.get(`/api/admin/reservation-audit/${reservation_id}`, {
      headers: { 'Authorization': 'Bearer admin-token' }
    });
    
    const auditData = await dbCheck.json();
    expect(auditData.reservation_attempts).toBe(2); // Initial + duplicate
    expect(auditData.unique_reservation_ids).toBe(1); // Only one unique ID created
  });
});