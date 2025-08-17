import { test, expect } from '@playwright/test';

test('mock stripe flow shows saved payment badge', async ({ page }) => {
  await page.goto('/?mockPayment=1');
  await expect(page.getByTestId('billing-setup-cta')).toBeVisible();
  await expect(page.getByTestId('saved-pm-badge')).toBeVisible();
});
