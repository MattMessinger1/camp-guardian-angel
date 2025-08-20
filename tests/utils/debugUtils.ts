import { Page } from '@playwright/test';

export interface PerformanceMetrics {
  startTime: number;
  endTime?: number;
  duration?: number;
  testName: string;
}

const performanceMetrics: Map<string, PerformanceMetrics> = new Map();

/**
 * Log test information with timestamp
 */
export function logTestInfo(message: string, data?: any) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] 🧪 ${message}`);
  
  if (data) {
    console.log('📊 Data:', JSON.stringify(data, null, 2));
  }
}

/**
 * Start measuring performance for a test
 */
export function measurePerformance(page: Page, testName: string) {
  const startTime = Date.now();
  performanceMetrics.set(testName, { startTime, testName });
  
  // Also start measuring page performance
  page.on('load', () => {
    const metric = performanceMetrics.get(testName);
    if (metric && !metric.endTime) {
      metric.endTime = Date.now();
      metric.duration = metric.endTime - metric.startTime;
      logTestInfo(`⏱️ Page load time for ${testName}: ${metric.duration}ms`);
    }
  });
}

/**
 * End performance measurement
 */
export function endPerformanceMeasurement(testName: string) {
  const metric = performanceMetrics.get(testName);
  if (metric && !metric.endTime) {
    metric.endTime = Date.now();
    metric.duration = metric.endTime - metric.startTime;
    logTestInfo(`⏱️ Total test time for ${testName}: ${metric.duration}ms`);
  }
  return metric;
}

/**
 * Get all performance metrics
 */
export function getPerformanceReport(): PerformanceMetrics[] {
  return Array.from(performanceMetrics.values());
}

/**
 * Debug page state with detailed information
 */
export async function debugPageState(page: Page, context: string = '') {
  const url = page.url();
  const title = await page.title();
  const bodyText = await page.textContent('body');
  const elementsCount = await page.locator('*').count();
  
  logTestInfo(`🔍 Debug Page State${context ? ` - ${context}` : ''}`, {
    url,
    title,
    elementsCount,
    bodyPreview: bodyText?.substring(0, 200) + '...',
    viewport: await page.viewportSize(),
    userAgent: await page.evaluate(() => navigator.userAgent)
  });
}

/**
 * Capture screenshot for debugging
 */
export async function captureDebugScreenshot(
  page: Page, 
  testName: string, 
  step: string = 'debug'
): Promise<string> {
  const filename = `debug-${testName}-${step}-${Date.now()}.png`;
  const path = `test-results/screenshots/${filename}`;
  
  await page.screenshot({ 
    path, 
    fullPage: true 
  });
  
  logTestInfo(`📸 Screenshot saved: ${path}`);
  return path;
}

/**
 * Monitor network requests for debugging
 */
export function monitorNetworkRequests(page: Page, testName: string) {
  const requests: { url: string; method: string; status?: number; timing: number }[] = [];
  
  page.on('request', request => {
    requests.push({
      url: request.url(),
      method: request.method(),
      timing: Date.now()
    });
  });
  
  page.on('response', response => {
    const request = requests.find(req => 
      req.url === response.url() && !req.status
    );
    if (request) {
      request.status = response.status();
    }
  });
  
  // Return function to get current requests
  return () => {
    logTestInfo(`🌐 Network requests for ${testName}:`, requests);
    return requests;
  };
}

/**
 * Wait with debug output
 */
export async function debugWait(
  page: Page, 
  milliseconds: number, 
  reason: string = 'debug wait'
) {
  logTestInfo(`⏳ Waiting ${milliseconds}ms - ${reason}`);
  await page.waitForTimeout(milliseconds);
  logTestInfo(`✅ Wait completed - ${reason}`);
}

/**
 * Enhanced error reporting
 */
export function enhanceError(error: Error, context: string, additionalInfo?: any): Error {
  const enhancedMessage = `${error.message}\n\n🔍 Context: ${context}`;
  
  if (additionalInfo) {
    const infoStr = typeof additionalInfo === 'string' 
      ? additionalInfo 
      : JSON.stringify(additionalInfo, null, 2);
    error.message = `${enhancedMessage}\n📊 Additional Info: ${infoStr}`;
  } else {
    error.message = enhancedMessage;
  }
  
  return error;
}

/**
 * Check if test is running in CI environment
 */
export function isCI(): boolean {
  return !!(process.env.CI || process.env.GITHUB_ACTIONS);
}

/**
 * Get debug mode setting
 */
export function isDebugMode(): boolean {
  return !!(process.env.DEBUG || process.env.PLAYWRIGHT_DEBUG);
}

/**
 * Test timing decorator
 */
export function withTiming<T extends (...args: any[]) => Promise<any>>(
  testName: string,
  testFn: T
): T {
  return (async (...args: any[]) => {
    const startTime = Date.now();
    logTestInfo(`🚀 Starting ${testName}`);
    
    try {
      const result = await testFn(...args);
      const duration = Date.now() - startTime;
      logTestInfo(`✅ Completed ${testName} in ${duration}ms`);
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      logTestInfo(`❌ Failed ${testName} after ${duration}ms`);
      throw enhanceError(error as Error, testName, { duration });
    }
  }) as T;
}