import { test, expect } from '@playwright/test';

// 1) App loads and key UI pieces render
test('home loads', async ({ page }) => {
  await page.goto('/');
  // Check the title contains the app name
  await expect(page).toHaveTitle(/Camp Guardian Angel|SignUpAssist/i);
  // Check key elements are visible
  await expect(page.getByText(/Beat the registration/i)).toBeVisible();
  await expect(page.getByText(/How It Works/i)).toBeVisible();
});

// 2) Reserve flow (DEV mock mode): fill + submit + success UI
test('reserve flow (mock)', async ({ page }) => {
  // Navigate to the reservation holds page where the form is located
  await page.goto('/reservation-holds');
  
  // Fill out reserve form (using the testids we added)
  await page.getByTestId('reserve-session-id').fill('01234567-89ab-cdef-0123-456789abcdef');
  await page.getByTestId('reserve-email').fill('parent@example.com');
  await page.getByTestId('reserve-age').click();
  await page.getByRole('option', { name: '5 to 8' }).click();
  await page.getByTestId('reserve-submit').click();

  // Expect the success confirmation UI (adjust text to match your component)
  await expect(page.getByText(/Hold Created|Reservation hold created/i)).toBeVisible();
});

// 3) PII audit: call audit Edge Function and assert OK
test.skip('audit PII endpoint ok', async ({ request }) => {
  // Set PLAYWRIGHT_FUNCTIONS_BASE in CI to your functions host,
  // e.g., https://<project-ref>.functions.supabase.co
  const functionsBase = process.env.PLAYWRIGHT_FUNCTIONS_BASE!;
  const resp = await request.get(`${functionsBase.replace(/\/+$/, '')}/audit-pii`);
  expect(resp.ok()).toBeTruthy();
  const body = await resp.json();
  expect(body.ok).toBeTruthy(); // ensures email/phone are tokenized & names encrypted
});