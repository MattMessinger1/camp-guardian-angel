// Page Loading Utilities
export {
  loadPageWithData,
  waitForDataOrState,
  setupSessionsPage,
  setupPaymentPage,
  setupFormPage,
  verifyServerHealth,
  type PageLoadOptions
} from './pageLoaders';

// Element Waiting Helpers
export {
  waitForElementSmart,
  waitForAnyElement,
  checkPageState,
  waitForStableState,
  getStableTextContent,
  type WaitOptions
} from './waitHelpers';

// Test Setup Patterns
export {
  createSessionsTestSetup,
  createPaymentTestSetup,
  createFormTestSetup,
  createHealthCheckSetup,
  setupAnyPage,
  createTestCleanup,
  withRetry,
  type TestSetupOptions
} from './testSetup';

// Debug and Performance Utilities
export {
  logTestInfo,
  measurePerformance,
  endPerformanceMeasurement,
  getPerformanceReport,
  debugPageState,
  captureDebugScreenshot,
  monitorNetworkRequests,
  debugWait,
  enhanceError,
  isCI,
  isDebugMode,
  withTiming,
  type PerformanceMetrics
} from './debugUtils';