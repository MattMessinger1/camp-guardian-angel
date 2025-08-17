import { test, expect } from '@playwright/test';

test('policy copy is visible', async ({ page }) => {
  await page.goto('/');
  const policy = page.getByTestId('policy-copy');
  await expect(policy).toBeVisible();
  await expect(policy.getByText(/One reservation per child per session/i)).toBeVisible();
  await expect(policy.getByText(/Saved payment method required to schedule/i)).toBeVisible();
  await expect(policy.getByText(/Charge only on success/i)).toBeVisible();
  await expect(policy.getByText(/Abuse may be throttled or denied/i)).toBeVisible();
});
