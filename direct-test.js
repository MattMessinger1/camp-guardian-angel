const { chromium } = require('playwright');

(async () => {
  console.log('🔍 Direct Playwright browser test...');
  
  try {
    const browser = await chromium.launch({ headless: false });
    const page = await browser.newPage();
    
    console.log('📍 Attempting navigation...');
    const response = await page.goto('http://localhost:8080', { 
      waitUntil: 'load', 
      timeout: 10000 
    });
    
    console.log('✅ SUCCESS! Status:', response.status());
    console.log('📄 Page title:', await page.title());
    
    await browser.close();
  } catch (error) {
    console.log('❌ Playwright error:', error.message);
    console.log('🔧 Error details:', error);
  }
})();