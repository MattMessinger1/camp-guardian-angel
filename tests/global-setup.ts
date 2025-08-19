import { chromium, FullConfig } from '@playwright/test';

async function globalSetup(config: FullConfig) {
  console.log('🚀 Starting global test setup...');
  
  // Start any required services
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  // Health check - ensure application is running
  try {
    await page.goto(config.webServer?.url || 'http://localhost:4173', { 
      timeout: 30000,
      waitUntil: 'networkidle' 
    });
    console.log('✅ Application health check passed');
  } catch (error) {
    console.error('❌ Application health check failed:', error);
    throw error;
  }
  
  // Database setup - create test data
  try {
    await page.evaluate(() => {
      return fetch('/api/test/setup-database', {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${process.env.TEST_ADMIN_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'setup',
          timestamp: Date.now()
        })
      });
    });
    console.log('✅ Database setup complete');
  } catch (error) {
    console.warn('⚠️ Database setup failed, continuing:', error);
  }
  
  await browser.close();
  
  // Set test environment variables
  process.env.TEST_MODE = 'true';
  process.env.PLAYWRIGHT_TEST_BASE_URL = config.webServer?.url || 'http://localhost:4173';
  
  console.log('✅ Global setup complete');
}

export default globalSetup;