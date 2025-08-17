import { test, expect } from '@playwright/test';

test('reservation form loads and submits', async ({ page }) => {
  await page.goto('/reservation-holds');
  await expect(page.getByTestId('reserve-session-id')).toBeVisible();
  await expect(page.getByTestId('reserve-email')).toBeVisible();
  await expect(page.getByTestId('reserve-age')).toBeVisible();
  await expect(page.getByTestId('reserve-submit')).toBeVisible();
  await page.click('[data-testid="reserve-submit"]');
  await expect(page.getByTestId('reserve-success')).toBeVisible();
});
