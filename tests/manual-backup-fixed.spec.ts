import { test, expect } from '@playwright/test';

test.use({ baseURL: 'http://localhost:8080' });

test('manual backup page shows reason and link', async ({ page }) => {
  await page.goto('/manual-backup/example-id');
  await expect(page.getByTestId('failure-reason')).toBeVisible();
  await expect(page.getByTestId('manual-backup-link')).toBeVisible();
});