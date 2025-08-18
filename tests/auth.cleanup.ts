import { test as cleanup } from '@playwright/test';

cleanup('cleanup test data', async ({ request }) => {
  // Clean up test data from database
  await request.post('/api/test/cleanup-test-data', {
    headers: { 'Authorization': `Bearer ${process.env.TEST_ADMIN_TOKEN}` }
  });

  console.log('🧹 Test cleanup complete');
});