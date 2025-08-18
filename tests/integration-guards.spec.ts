import { test, expect } from '@playwright/test';

test.describe('Payment Method Enforcement', () => {
  test('should block user without payment method', async ({ page }) => {
    // Login as user without payment method
    await page.goto('/login');
    await page.fill('[data-testid="email"]', 'user-no-pm@test.com');
    await page.fill('[data-testid="password"]', 'password123');
    await page.click('[data-testid="login-button"]');

    // Navigate to create reservation
    await page.goto('/sessions/test-session-123');
    await page.click('[data-testid="reserve-button"]');

    // Should see payment method required message
    await expect(page.locator('[data-testid="pm-required-message"]')).toBeVisible();
    await expect(page.locator('[data-testid="pm-required-message"]')).toContainText('payment method is required');
    
    // Reserve button should be disabled
    await expect(page.locator('[data-testid="confirm-reserve-button"]')).toBeDisabled();
  });

  test('should allow user to proceed after adding payment method', async ({ page }) => {
    // Login as user without payment method
    await page.goto('/login');
    await page.fill('[data-testid="email"]', 'user-no-pm@test.com');
    await page.fill('[data-testid="password"]', 'password123');
    await page.click('[data-testid="login-button"]');

    // Navigate to billing to add payment method
    await page.goto('/billing');
    await page.click('[data-testid="add-payment-method"]');
    
    // Fill in test card details
    await page.fill('[data-testid="card-number"]', '4242424242424242');
    await page.fill('[data-testid="card-expiry"]', '12/28');
    await page.fill('[data-testid="card-cvc"]', '123');
    await page.click('[data-testid="save-payment-method"]');
    
    // Should see success message
    await expect(page.locator('[data-testid="pm-success-message"]')).toBeVisible();

    // Now try to reserve again
    await page.goto('/sessions/test-session-123');
    await page.click('[data-testid="reserve-button"]');

    // Should not see payment method required message
    await expect(page.locator('[data-testid="pm-required-message"]')).not.toBeVisible();
    
    // Reserve button should be enabled
    await expect(page.locator('[data-testid="confirm-reserve-button"]')).toBeEnabled();
  });

  test('should block reservation scheduling without payment method', async ({ page, request }) => {
    // Try to create reservation via API without payment method
    const response = await request.post('/api/reserve-init', {
      headers: {
        'Authorization': 'Bearer no-pm-user-token'
      },
      data: {
        session_id: 'test-session-123',
        child_id: 'test-child-456'
      }
    });

    expect(response.status()).toBe(402); // Payment Required
    const body = await response.json();
    expect(body.error_code).toBe('PAYMENT_METHOD_REQUIRED');
    expect(body.message).toContain('payment method');
  });
});

test.describe('Two-Per-Session Limit', () => {
  test('should allow first two children registration', async ({ page }) => {
    await page.goto('/login');
    await page.fill('[data-testid="email"]', 'parent@test.com');
    await page.fill('[data-testid="password"]', 'password123');
    await page.click('[data-testid="login-button"]');

    // Register first child
    await page.goto('/sessions/test-session-123');
    await page.click('[data-testid="reserve-button"]');
    await page.selectOption('[data-testid="child-select"]', 'child-1');
    await page.click('[data-testid="confirm-reserve-button"]');
    
    await expect(page.locator('[data-testid="reservation-success"]')).toBeVisible();

    // Register second child for same session
    await page.goto('/sessions/test-session-123');
    await page.click('[data-testid="reserve-button"]');
    await page.selectOption('[data-testid="child-select"]', 'child-2');
    await page.click('[data-testid="confirm-reserve-button"]');
    
    await expect(page.locator('[data-testid="reservation-success"]')).toBeVisible();
  });

  test('should block third child registration with friendly message', async ({ page }) => {
    // Assume user already has 2 children registered for this session
    await page.goto('/login');
    await page.fill('[data-testid="email"]', 'parent-with-2-kids@test.com');
    await page.fill('[data-testid="password"]', 'password123');
    await page.click('[data-testid="login-button"]');

    // Try to register third child
    await page.goto('/sessions/test-session-123');
    await page.click('[data-testid="reserve-button"]');
    await page.selectOption('[data-testid="child-select"]', 'child-3');
    await page.click('[data-testid="confirm-reserve-button"]');
    
    // Should see user-friendly quota message
    await expect(page.locator('[data-testid="quota-error"]')).toBeVisible();
    await expect(page.locator('[data-testid="quota-error"]')).toContainText(
      'You can register at most two children per session'
    );
    await expect(page.locator('[data-testid="quota-error"]')).not.toContainText('USER_SESSION_CAP');
  });

  test('should enforce limit via API', async ({ request }) => {
    // User already has 2 children registered
    const response = await request.post('/api/reserve-init', {
      headers: {
        'Authorization': 'Bearer parent-with-2-kids-token'
      },
      data: {
        session_id: 'test-session-123',
        child_id: 'child-3'
      }
    });

    expect(response.status()).toBe(429); // Too Many Requests
    const body = await response.json();
    expect(body.error_code).toBe('USER_SESSION_CAP');
    expect(body.message).toContain('at most two children per session');
  });
});

test.describe('Cross-Account Child Duplicate Detection', () => {
  test('should detect duplicate child across accounts', async ({ page }) => {
    // First account registers child
    await page.goto('/login');
    await page.fill('[data-testid="email"]', 'parent1@test.com');
    await page.fill('[data-testid="password"]', 'password123');
    await page.click('[data-testid="login-button"]');

    await page.goto('/children');
    await page.click('[data-testid="add-child-button"]');
    await page.fill('[data-testid="child-name"]', 'John Doe');
    await page.fill('[data-testid="child-dob"]', '2010-05-15');
    await page.click('[data-testid="save-child"]');

    await expect(page.locator('[data-testid="child-saved"]')).toBeVisible();
    await page.click('[data-testid="logout"]');

    // Second account tries to register same child
    await page.goto('/login');
    await page.fill('[data-testid="email"]', 'parent2@test.com');
    await page.fill('[data-testid="password"]', 'password123');
    await page.click('[data-testid="login-button"]');

    await page.goto('/children');
    await page.click('[data-testid="add-child-button"]');
    await page.fill('[data-testid="child-name"]', 'John Doe'); // Same name
    await page.fill('[data-testid="child-dob"]', '2010-05-15'); // Same DOB
    await page.click('[data-testid="save-child"]');

    // Should see friendly duplicate detection message
    await expect(page.locator('[data-testid="duplicate-child-error"]')).toBeVisible();
    await expect(page.locator('[data-testid="duplicate-child-error"]')).toContainText(
      'child with these details is already registered'
    );
    await expect(page.locator('[data-testid="duplicate-child-error"]')).not.toContainText('23505');
  });

  test('should handle name variations as same child', async ({ page }) => {
    // Test that "José María" and "jose maria" are detected as same child
    await page.goto('/login');
    await page.fill('[data-testid="email"]', 'parent1@test.com');
    await page.fill('[data-testid="password"]', 'password123');
    await page.click('[data-testid="login-button"]');

    await page.goto('/children');
    await page.click('[data-testid="add-child-button"]');
    await page.fill('[data-testid="child-name"]', 'José María');
    await page.fill('[data-testid="child-dob"]', '2012-03-10');
    await page.click('[data-testid="save-child"]');

    await expect(page.locator('[data-testid="child-saved"]')).toBeVisible();
    await page.click('[data-testid="logout"]');

    // Different account with normalized name variation
    await page.goto('/login');
    await page.fill('[data-testid="email"]', 'parent3@test.com');
    await page.fill('[data-testid="password"]', 'password123');
    await page.click('[data-testid="login-button"]');

    await page.goto('/children');
    await page.click('[data-testid="add-child-button"]');
    await page.fill('[data-testid="child-name"]', 'jose maria'); // Different case, no accents
    await page.fill('[data-testid="child-dob"]', '2012-03-10'); // Same DOB
    await page.click('[data-testid="save-child"]');

    await expect(page.locator('[data-testid="duplicate-child-error"]')).toBeVisible();
  });
});

test.describe('Scheduler Seam - Eligibility Checks', () => {
  test('should not enqueue ineligible reservations', async ({ page, request }) => {
    // Create reservation that should be blocked by pre-dispatch checks
    await page.goto('/login');
    await page.fill('[data-testid="email"]', 'quota-exceeded@test.com');
    await page.fill('[data-testid="password"]', 'password123');
    await page.click('[data-testid="login-button"]');

    // Try to create reservation
    const response = await request.post('/api/reserve-init', {
      headers: {
        'Authorization': 'Bearer quota-exceeded-token'
      },
      data: {
        session_id: 'future-session-456',
        child_id: 'test-child-789'
      }
    });

    expect(response.status()).toBe(429); // Quota exceeded
    
    // Check that no job was enqueued in the scheduler
    const queueResponse = await request.get('/api/reservation-queue', {
      headers: {
        'Authorization': 'Bearer admin-token'
      }
    });
    
    const queueData = await queueResponse.json();
    const hasIneligibleJob = queueData.jobs.some((job: any) => 
      job.user_id === 'quota-exceeded-user' && 
      job.session_id === 'future-session-456'
    );
    
    expect(hasIneligibleJob).toBeFalsy();
  });

  test('should enqueue eligible reservations', async ({ page, request }) => {
    // Create valid reservation
    await page.goto('/login');
    await page.fill('[data-testid="email"]', 'eligible-user@test.com');
    await page.fill('[data-testid="password"]', 'password123');
    await page.click('[data-testid="login-button"]');

    const response = await request.post('/api/reserve-init', {
      headers: {
        'Authorization': 'Bearer eligible-user-token'
      },
      data: {
        session_id: 'future-session-456',
        child_id: 'eligible-child-789'
      }
    });

    expect(response.status()).toBe(200);
    
    // Check that job was enqueued
    const queueResponse = await request.get('/api/reservation-queue', {
      headers: {
        'Authorization': 'Bearer admin-token'
      }
    });
    
    const queueData = await queueResponse.json();
    const hasEligibleJob = queueData.jobs.some((job: any) => 
      job.user_id === 'eligible-user' && 
      job.session_id === 'future-session-456' &&
      job.status === 'scheduled'
    );
    
    expect(hasEligibleJob).toBeTruthy();
  });
});