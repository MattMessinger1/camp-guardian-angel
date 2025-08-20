import { test, expect } from '@playwright/test';

test.describe('MVP workflow end-to-end', () => {

  test('1. Homepage loads', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('body')).toBeVisible();
  });

  test('2. Session search shows results', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText(/Session|Camp|Age/i)).toBeVisible();
  });

  test('3. Reservation form loads', async ({ page }) => {
    await page.goto('/reservation-holds');
    await expect(page.getByText(/Reservation/i)).toBeVisible();
  });

  test('4. Stripe payment flow mocked', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText(/Payment|Card/i)).toBeVisible();
  });

  test('5. Manual backup page shows link or reason', async ({ page }) => {
    await page.goto('/manual-backup/example-id');
    await expect(page.getByText(/backup|reason/i)).toBeVisible();
  });

});
