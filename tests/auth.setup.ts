import { test as setup, expect } from '@playwright/test';

const authFile = 'tests/auth/authenticated.json';

setup('authenticate test users', async ({ page, request }) => {
  // Setup test data in database
  await request.post('/api/test/setup-test-data', {
    headers: { 'Authorization': `Bearer ${process.env.TEST_ADMIN_TOKEN}` }
  });

  // Create authenticated user sessions
  const testUsers = [
    { email: 'eligible-user-1@test.com', password: 'password123', file: 'tests/auth/eligible-user-1.json' },
    { email: 'eligible-user-2@test.com', password: 'password123', file: 'tests/auth/eligible-user-2.json' },
    { email: 'quota-exceeded@test.com', password: 'password123', file: 'tests/auth/quota-exceeded-user.json' },
    { email: 'no-pm-user@test.com', password: 'password123', file: 'tests/auth/no-pm-user.json' },
    { email: 'parent@test.com', password: 'password123', file: 'tests/auth/parent.json' },
    { email: 'concurrent-user@test.com', password: 'password123', file: 'tests/auth/concurrent-user.json' }
  ];

  for (const user of testUsers) {
    await page.goto('/login');
    await page.fill('[data-testid="email"]', user.email);
    await page.fill('[data-testid="password"]', user.password);
    await page.click('[data-testid="login-button"]');
    
    // Wait for successful login
    await expect(page.locator('[data-testid="user-menu"]')).toBeVisible();
    
    // Save authenticated state
    await page.context().storageState({ path: user.file });
    
    // Logout for next user
    await page.click('[data-testid="logout"]');
  }

  // Save main authenticated state for general tests
  await page.goto('/login');
  await page.fill('[data-testid="email"]', 'test@example.com');
  await page.fill('[data-testid="password"]', 'password123');
  await page.click('[data-testid="login-button"]');
  await expect(page.locator('[data-testid="user-menu"]')).toBeVisible();
  await page.context().storageState({ path: authFile });

  console.log('✅ Authentication setup complete');
});