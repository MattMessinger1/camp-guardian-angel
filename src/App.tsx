import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { logger } from "@/lib/log";
import HomePage from "./pages/Home";
import ReservationHolds from "./pages/ReservationHolds";
import ManualBackup from "./pages/ManualBackup";
import Login from "./pages/Login";
import Auth from "./pages/Auth";
import Signup from "./pages/Signup";
import AutomatedSignupPage from "./pages/AutomatedSignupPage";
import Dashboard from "./pages/Dashboard";
import Sessions from "./pages/Sessions";
import Children from "./pages/Children";
import Settings from "./pages/Settings";
import FindCamps from "./pages/FindCamps";
import SessionDetail from "./pages/SessionDetail";
import SessionSignup from "./pages/SessionSignup";
import SessionForm from "./pages/SessionForm";
import PlanDetail from "./pages/PlanDetail";
import Billing from "./pages/Billing";
import BillingSetupSuccess from "./pages/BillingSetupSuccess";
import BillingSetupCancelled from "./pages/BillingSetupCancelled";
import PaymentSuccess from "./pages/PaymentSuccess";
import AdminDashboard from "./pages/AdminDashboard";
import SystemDashboard from "./pages/SystemDashboard";
import HealthCheck from "./pages/HealthCheck";
import SanityCheck from "./pages/SanityCheck";
import GuardrailsTest from "./pages/GuardrailsTest";
import DevLimits from "./pages/DevLimits";
import DevRunPrewarm from "./pages/DevRunPrewarm";
import NotFound from "./pages/NotFound";
import { TestEnvironment } from "./pages/TestEnvironment";
import Diagnostics from "./pages/Diagnostics";
import SearchTest from "./pages/SearchTest";
import UIAuditSummary from './pages/UIAuditSummary';
import UIShowcase from './pages/UIShowcase';
import ExampleNewPage from './pages/ExampleNewPage';
import Readiness from './pages/Readiness';
import TestDebug from './pages/TestDebug';
import WorkingTest from './pages/WorkingTest';
import ReadyToSignup from './pages/ReadyToSignup';
import YMCATest from './pages/YMCATest';
import PrewarmTest from './pages/PrewarmTest';

import SignupSubmitted from './pages/SignupSubmitted';
import PendingSignups from './pages/PendingSignups';
import AccountHistory from './pages/AccountHistory';
import ApprovePage from './pages/ApprovePage';
import Operations from './pages/Operations';
import ComplianceDashboard from './pages/ComplianceDashboard';
import AdminLayout from './pages/AdminLayout';
import Partnerships from './pages/Partnerships';
import Analytics from './pages/Analytics';
import ProductionMonitoring from './pages/ProductionMonitoring';
import TransparencyPage from './pages/TransparencyPage';
import BotInfoPage from './pages/BotInfoPage';
import CaptchaAssist from './pages/CaptchaAssist';
import CaptchaWorkflowTest from "@/pages/CaptchaWorkflowTest";
import ActiveNetworkTest from "@/pages/ActiveNetworkTest";
import { CaptchaOptimizationPanel } from "@/components/CaptchaOptimizationPanel";
import TOSCompliance from './pages/TOSCompliance';
import ObservabilityPage from './pages/ObservabilityPage';
import ErrorBoundary from './components/ErrorBoundary';
import ProtectedRoute from './components/auth/ProtectedRoute';

export default function App() {
  console.log('🚀 App component is rendering!');
  
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
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/signup" element={<AutomatedSignupPage />} />
            <Route path="/automated-signup" element={<AutomatedSignupPage />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Signup />} />
            <Route path="/dashboard" element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            } />
            <Route path="/sessions" element={
              <ProtectedRoute>
                <Sessions />
              </ProtectedRoute>
            } />
            <Route path="/children" element={
              <ProtectedRoute>
                <Children />
              </ProtectedRoute>
            } />
            <Route path="/settings" element={
              <ProtectedRoute>
                <Settings />
              </ProtectedRoute>
            } />
            <Route path="/find-camps" element={
              <ProtectedRoute>
                <FindCamps />
              </ProtectedRoute>
            } />
            <Route path="/session/:sessionId" element={
              <ProtectedRoute>
                <SessionDetail />
              </ProtectedRoute>
            } />
            <Route path="/session/:sessionId/signup" element={
              <ProtectedRoute>
                <SessionSignup />
              </ProtectedRoute>
            } />
            <Route path="/session/new" element={
              <ProtectedRoute>
                <SessionForm />
              </ProtectedRoute>
            } />
            <Route path="/billing" element={
              <ProtectedRoute>
                <Billing />
              </ProtectedRoute>
            } />
            <Route path="/ymca-test" element={
              <ProtectedRoute>
                <YMCATest />
              </ProtectedRoute>
            } />
            <Route path="/prewarm-test" element={
              <ProtectedRoute>
                <PrewarmTest />
              </ProtectedRoute>
            } />
            <Route path="/billing/success" element={<BillingSetupSuccess />} />
            <Route path="/billing/cancelled" element={<BillingSetupCancelled />} />
            <Route path="/payment/success" element={<PaymentSuccess />} />
            <Route path="/admin/*" element={
              <ProtectedRoute>
                <AdminLayout />
              </ProtectedRoute>
            } />
            <Route path="/health" element={<HealthCheck />} />
            <Route path="/sanity" element={<SanityCheck />} />
            <Route path="/test-env" element={<TestEnvironment />} />
            <Route path="/diagnostics" element={<Diagnostics />} />
            <Route path="/search-test" element={<SearchTest />} />
            <Route path="/ui-audit" element={<UIAuditSummary />} />
            <Route path="/ui-showcase" element={<UIShowcase />} />
            <Route path="/readiness" element={<Readiness />} />
            <Route path="/test-debug" element={<TestDebug />} />
            <Route path="/working-test" element={<WorkingTest />} />
            <Route path="/ready-to-signup" element={<ReadyToSignup />} />
            <Route path="/sessions/:sessionId/ready-to-signup" element={<ReadyToSignup />} />
            <Route path="/sessions/:sessionId/signup-submitted" element={<SignupSubmitted />} />
            <Route path="/pending-signups" element={<PendingSignups />} />
            
            <Route path="/account-history" element={<AccountHistory />} />
            <Route path="/accounthistory" element={<Navigate to="/account-history" replace />} />
            <Route path="/signuphistory" element={<Navigate to="/account-history" replace />} />
            <Route path="/approve" element={<ApprovePage />} />
            <Route path="/operations" element={<Operations />} />
            <Route path="/compliance" element={<ComplianceDashboard />} />
            <Route path="/partnerships" element={<Partnerships />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/production-monitoring" element={<ProductionMonitoring />} />
            <Route path="/transparency" element={<TransparencyPage />} />
            <Route path="/bot-info" element={<BotInfoPage />} />
            <Route path="/captcha-assist" element={<CaptchaAssist />} />
            <Route path="/captcha-workflow-test" element={
              <ProtectedRoute>
                <CaptchaWorkflowTest />
              </ProtectedRoute>
            } />
            <Route path="/activenetwork-test" element={
              <ProtectedRoute>
                <ActiveNetworkTest />
              </ProtectedRoute>
            } />
            <Route path="/captcha-optimization" element={
              <ProtectedRoute>
                <div className="container mx-auto p-6"><CaptchaOptimizationPanel /></div>
              </ProtectedRoute>
            } />
            <Route path="/tos-compliance" element={<TOSCompliance />} />
            <Route path="/observability" element={<ObservabilityPage />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </ErrorBoundary>
      </BrowserRouter>
    </AuthProvider>
  );
}
