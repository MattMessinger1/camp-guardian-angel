import { chromium, FullConfig } from '@playwright/test';

async function globalTeardown(config: FullConfig) {
  console.log('🧹 Starting global test teardown...');
  
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  try {
    // Clean up test data
    await page.goto(config.webServer?.url || 'http://localhost:5173');
    
    await page.evaluate(() => {
      return fetch('/api/test/cleanup-database', {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${process.env.TEST_ADMIN_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'cleanup',
          timestamp: Date.now()
        })
      });
    });
    
    console.log('✅ Database cleanup complete');
  } catch (error) {
    console.warn('⚠️ Database cleanup failed:', error);
  }
  
  await browser.close();
  
  // Clean up environment
  delete process.env.TEST_MODE;
  delete process.env.PLAYWRIGHT_TEST_BASE_URL;
  
  console.log('✅ Global teardown complete');
}

export default globalTeardown;