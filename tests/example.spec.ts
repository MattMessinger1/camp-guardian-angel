import { test, expect } from '@playwright/test';

test('homepage loads correctly', async ({ page }) => {
  await page.goto('http://localhost:8080');

  // Expect a title "to contain" a substring.
  await expect(page).toHaveTitle(/SignUpAssist/);

  // Expect hero text to be present
  await expect(page.locator('h1')).toContainText('Beat the registration');
});

test('navigation works', async ({ page }) => {
  await page.goto('http://localhost:8080');
  
  // Check that main elements are visible
  await expect(page.locator('text=You pre-load your info')).toBeVisible();
  await expect(page.locator('text=Find your activity')).toBeVisible();
  await expect(page.locator('text=Load your signup info')).toBeVisible();
  await expect(page.locator('text=We submit the millisecond')).toBeVisible();
});

test('search functionality is present', async ({ page }) => {
  await page.goto('http://localhost:8080');
  
  // Check search input exists
  await expect(page.locator('input[placeholder*="Activity name"]')).toBeVisible();
  await expect(page.locator('text=Reserve my spot')).toBeVisible();
});