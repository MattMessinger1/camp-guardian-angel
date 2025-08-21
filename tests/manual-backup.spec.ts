import { test, expect } from '@playwright/test';

test('manual backup page shows reason and link', async ({ page }) => {
  await page.goto('http://localhost:8080/manual-backup/example-id');
  await expect(page.getByTestId('failure-reason')).toBeVisible();
  await expect(page.getByTestId('manual-backup-link')).toBeVisible();
});
