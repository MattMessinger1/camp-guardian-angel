import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { isDevelopmentMode } from "@/lib/config/developmentMode";
import { Suspense, lazy } from 'react';

// Core Production Pages (always available)
import HomePage from "./pages/Home";
import Auth from "./pages/Auth";
import AutomatedSignupPage from "./pages/AutomatedSignupPage";
import SignupSubmitted from './pages/SignupSubmitted';
import AccountHistory from './pages/AccountHistory';
import Settings from "./pages/Settings";
import BillingSetupSuccess from "./pages/BillingSetupSuccess";
import BillingSetupCancelled from "./pages/BillingSetupCancelled";
import PaymentSuccess from "./pages/PaymentSuccess";
import NotFound from "./pages/NotFound";
import ErrorBoundary from './components/ErrorBoundary';
import ProtectedRoute from './components/auth/ProtectedRoute';

// Development/Testing Pages (lazy loaded only when needed)
const DevPages = {
  ReservationHolds: lazy(() => import("./pages/ReservationHolds")),
  ManualBackup: lazy(() => import("./pages/ManualBackup")),
  Login: lazy(() => import("./pages/Login")),
  Signup: lazy(() => import("./pages/Signup")),
  Dashboard: lazy(() => import("./pages/Dashboard")),
  Sessions: lazy(() => import("./pages/Sessions")),
  Children: lazy(() => import("./pages/Children")),
  FindCamps: lazy(() => import("./pages/FindCamps")),
  SessionDetail: lazy(() => import("./pages/SessionDetail")),
  SessionSignup: lazy(() => import("./pages/SessionSignup")),
  SessionForm: lazy(() => import("./pages/SessionForm")),
  PlanDetail: lazy(() => import("./pages/PlanDetail")),
  Billing: lazy(() => import("./pages/Billing")),
  AdminDashboard: lazy(() => import("./pages/AdminDashboard")),
  SystemDashboard: lazy(() => import("./pages/SystemDashboard")),
  HealthCheck: lazy(() => import("./pages/HealthCheck")),
  SanityCheck: lazy(() => import("./pages/SanityCheck")),
  GuardrailsTest: lazy(() => import("./pages/GuardrailsTest")),
  DevLimits: lazy(() => import("./pages/DevLimits")),
  DevRunPrewarm: lazy(() => import("./pages/DevRunPrewarm")),
  TestEnvironment: lazy(() => import("./pages/TestEnvironment").then(m => ({ default: m.TestEnvironment }))),
  Diagnostics: lazy(() => import("./pages/Diagnostics")),
  SearchTest: lazy(() => import("./pages/SearchTest")),
  UIAuditSummary: lazy(() => import('./pages/UIAuditSummary')),
  UIShowcase: lazy(() => import('./pages/UIShowcase')),
  ExampleNewPage: lazy(() => import('./pages/ExampleNewPage')),
  Readiness: lazy(() => import('./pages/Readiness')),
  TestDebug: lazy(() => import('./pages/TestDebug')),
  WorkingTest: lazy(() => import('./pages/WorkingTest')),
  ReadyToSignup: lazy(() => import('./pages/ReadyToSignup')),
  YMCATest: lazy(() => import('./pages/YMCATest')),
  PrewarmTest: lazy(() => import('./pages/PrewarmTest')),
  PendingSignups: lazy(() => import('./pages/PendingSignups')),
  ApprovePage: lazy(() => import('./pages/ApprovePage')),
  Operations: lazy(() => import('./pages/Operations')),
  ComplianceDashboard: lazy(() => import('./pages/ComplianceDashboard')),
  AdminLayout: lazy(() => import('./pages/AdminLayout')),
  Partnerships: lazy(() => import('./pages/Partnerships')),
  Analytics: lazy(() => import('./pages/Analytics')),
  ProductionMonitoring: lazy(() => import('./pages/ProductionMonitoring')),
  TransparencyPage: lazy(() => import('./pages/TransparencyPage')),
  BotInfoPage: lazy(() => import('./pages/BotInfoPage')),
  CaptchaAssist: lazy(() => import('./pages/CaptchaAssist')),
  CaptchaWorkflowTest: lazy(() => import("./pages/CaptchaWorkflowTest")),
  ActiveNetworkTest: lazy(() => import("./pages/ActiveNetworkTest")),
  CaptchaOptimizationPanel: lazy(() => import("./components/CaptchaOptimizationPanel").then(m => ({ default: m.CaptchaOptimizationPanel }))),
  TOSCompliance: lazy(() => import('./pages/TOSCompliance')),
  ObservabilityPage: lazy(() => import('./pages/ObservabilityPage')),
  AIContextTest: lazy(() => import('./pages/AIContextTest')),
  TestSignupPage: lazy(() => import('./pages/TestSignupPage')),
};

export default function App() {
  const devMode = isDevelopmentMode();
  
  console.log('🚀 App component is rendering!');
  console.log('🛠️ Development Mode:', devMode);
  
  const currentPath = window.location.pathname;
  const currentSearch = window.location.search;
  console.log('📍 Current path:', currentPath);
  console.log('📍 Current search:', currentSearch);
  
  return (
    <AuthProvider>
      <BrowserRouter
        future={{
          v7_startTransition: true,
          v7_relativeSplatPath: true
        }}
      >
        <ErrorBoundary>
          <Suspense fallback={<div className="flex items-center justify-center min-h-screen">Loading...</div>}>
            <Routes>
              {/* Core V1.0 Production Routes - Always Available */}
              <Route path="/" element={<HomePage />} />
              <Route path="/signup" element={<AutomatedSignupPage />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/settings" element={
                <ProtectedRoute>
                  <Settings />
                </ProtectedRoute>
              } />
              <Route path="/sessions/:sessionId/signup-submitted" element={<SignupSubmitted />} />
              <Route path="/account-history" element={<AccountHistory />} />
              
              {/* Payment Routes - Always Available */}
              <Route path="/billing/success" element={<BillingSetupSuccess />} />
              <Route path="/billing/cancelled" element={<BillingSetupCancelled />} />
              <Route path="/payment/success" element={<PaymentSuccess />} />
              
              {/* AI Testing Routes - Always Available */}
              <Route path="/ai-context-test" element={<DevPages.AIContextTest />} />
              <Route path="/test-signup" element={<DevPages.TestSignupPage />} />
              
              {/* Legacy Redirects */}
              <Route path="/accounthistory" element={<Navigate to="/account-history" replace />} />
              <Route path="/signuphistory" element={<Navigate to="/account-history" replace />} />
              
              {/* Development/Testing Routes - Only Available in Development Mode */}
              {devMode && (
                <>
                  <Route path="/automated-signup" element={<AutomatedSignupPage />} />
                  <Route path="/login" element={<DevPages.Login />} />
                  <Route path="/register" element={<DevPages.Signup />} />
                  <Route path="/dashboard" element={
                    <ProtectedRoute>
                      <DevPages.Dashboard />
                    </ProtectedRoute>
                  } />
                  <Route path="/sessions" element={
                    <ProtectedRoute>
                      <DevPages.Sessions />
                    </ProtectedRoute>
                  } />
                  <Route path="/children" element={
                    <ProtectedRoute>
                      <DevPages.Children />
                    </ProtectedRoute>
                  } />
                  <Route path="/find-camps" element={
                    <ProtectedRoute>
                      <DevPages.FindCamps />
                    </ProtectedRoute>
                  } />
                  <Route path="/session/:sessionId" element={
                    <ProtectedRoute>
                      <DevPages.SessionDetail />
                    </ProtectedRoute>
                  } />
                  <Route path="/session/:sessionId/signup" element={
                    <ProtectedRoute>
                      <DevPages.SessionSignup />
                    </ProtectedRoute>
                  } />
                  <Route path="/session/new" element={
                    <ProtectedRoute>
                      <DevPages.SessionForm />
                    </ProtectedRoute>
                  } />
                  <Route path="/billing" element={
                    <ProtectedRoute>
                      <DevPages.Billing />
                    </ProtectedRoute>
                  } />
                  <Route path="/ymca-test" element={
                    <ProtectedRoute>
                      <DevPages.YMCATest />
                    </ProtectedRoute>
                  } />
                  <Route path="/prewarm-test" element={
                    <ProtectedRoute>
                      <DevPages.PrewarmTest />
                    </ProtectedRoute>
                  } />
                  <Route path="/admin/*" element={
                    <ProtectedRoute>
                      <DevPages.AdminLayout />
                    </ProtectedRoute>
                  } />
                  <Route path="/health" element={<DevPages.HealthCheck />} />
                  <Route path="/sanity" element={<DevPages.SanityCheck />} />
                  <Route path="/test-env" element={<DevPages.TestEnvironment />} />
                  <Route path="/diagnostics" element={<DevPages.Diagnostics />} />
                  <Route path="/search-test" element={<DevPages.SearchTest />} />
                  <Route path="/ui-audit" element={<DevPages.UIAuditSummary />} />
                  <Route path="/ui-showcase" element={<DevPages.UIShowcase />} />
                  <Route path="/readiness" element={<DevPages.Readiness />} />
                  <Route path="/test-debug" element={<DevPages.TestDebug />} />
                  <Route path="/working-test" element={<DevPages.WorkingTest />} />
                  <Route path="/ready-to-signup" element={<DevPages.ReadyToSignup />} />
                  <Route path="/sessions/:sessionId/ready-to-signup" element={<DevPages.ReadyToSignup />} />
                  <Route path="/pending-signups" element={<DevPages.PendingSignups />} />
                  <Route path="/approve" element={<DevPages.ApprovePage />} />
                  <Route path="/operations" element={<DevPages.Operations />} />
                  <Route path="/compliance" element={<DevPages.ComplianceDashboard />} />
                  <Route path="/partnerships" element={<DevPages.Partnerships />} />
                  <Route path="/analytics" element={<DevPages.Analytics />} />
                  <Route path="/production-monitoring" element={<DevPages.ProductionMonitoring />} />
                  <Route path="/transparency" element={<DevPages.TransparencyPage />} />
                  <Route path="/bot-info" element={<DevPages.BotInfoPage />} />
                  <Route path="/captcha-assist" element={<DevPages.CaptchaAssist />} />
                  <Route path="/captcha-workflow-test" element={
                    <ProtectedRoute>
                      <DevPages.CaptchaWorkflowTest />
                    </ProtectedRoute>
                  } />
                  <Route path="/activenetwork-test" element={
                    <div style={{padding: '20px', border: '2px solid red', margin: '20px'}}>
                      <h1 style={{color: 'green', fontSize: '24px'}}>🎉 SUCCESS! You are on /activenetwork-test</h1>
                      <p>Current URL: {window.location.href}</p>
                      <p>Current pathname: {window.location.pathname}</p>
                      <p>Timestamp: {new Date().toISOString()}</p>
                      <DevPages.ActiveNetworkTest />
                    </div>
                  } />
                  <Route path="/captcha-optimization" element={
                    <ProtectedRoute>
                      <div className="container mx-auto p-6"><DevPages.CaptchaOptimizationPanel /></div>
                    </ProtectedRoute>
                  } />
                  <Route path="/tos-compliance" element={<DevPages.TOSCompliance />} />
                  <Route path="/observability" element={<DevPages.ObservabilityPage />} />
                </>
              )}
              
              {/* 404 Route */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </ErrorBoundary>
      </BrowserRouter>
    </AuthProvider>
  );
}