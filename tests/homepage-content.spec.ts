import { test, expect } from '@playwright/test';

test('homepage content verification', async ({ page }) => {
  console.log('🏠 Testing homepage content...');
  
  // Navigate to homepage
  await page.goto('http://localhost:8080/');
  console.log('✅ Navigated to homepage');
  
  // Basic page load check
  await expect(page.locator('body')).toBeVisible();
  console.log('✅ Body is visible');
  
  // Check main hero heading (more specific selector)
  await expect(page.locator('h1.hero-title')).toBeVisible();
  await expect(page.locator('h1.hero-title')).toContainText('Get the spot');
  console.log('✅ Found hero heading with "Get the spot"');
  
  await expect(page.locator('h1.hero-title')).toContainText('Without refreshing at midnight');
  console.log('✅ Found complete hero text');
  
  // Check the three main steps
  await expect(page.getByText('1. Enter details once')).toBeVisible();
  console.log('✅ Found step 1');
  
  await expect(page.getByText('2. We submit instantly')).toBeVisible();
  console.log('✅ Found step 2');
  
  await expect(page.getByText('3. Pay $20 on success')).toBeVisible();
  console.log('✅ Found step 3');
  
  // Check search section
  await expect(page.getByText('Search for your activity')).toBeVisible();
  console.log('✅ Found search section');
  
  // Check CTA section (for non-logged in users)
  await expect(page.getByText('Ready to beat the registration rush?')).toBeVisible();
  console.log('✅ Found CTA section');
  
  // Check sign in/up buttons
  await expect(page.getByRole('link', { name: 'Sign In' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Sign Up' })).toBeVisible();
  console.log('✅ Found auth buttons');
  
  console.log('🎉 Homepage content verification completed!');
});

