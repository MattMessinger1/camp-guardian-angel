import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { logger } from "@/lib/log";
import HomePage from "./pages/Home";
import ReservationHolds from "./pages/ReservationHolds";
import ManualBackup from "./pages/ManualBackup";
import Login from "./pages/Login";
import Auth from "./pages/Auth";
import Signup from "./pages/Signup";
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
import SignupConfirmation from './pages/SignupConfirmation';
import AccountHistory from './pages/AccountHistory';
import ApprovePage from './pages/ApprovePage';
import Operations from './pages/Operations';
import ComplianceDashboard from './pages/ComplianceDashboard';
import AdminLayout from './pages/AdminLayout';
import Partnerships from './pages/Partnerships';
import Analytics from './pages/Analytics';
import CaptchaAssist from './pages/CaptchaAssist';
import TOSCompliance from './pages/TOSCompliance';
import ObservabilityPage from './pages/ObservabilityPage';
import ErrorBoundary from './components/ErrorBoundary';
import ProtectedRoute from './components/auth/ProtectedRoute';

export default function App() {
  logger.info('App component rendering with routes', { component: 'App' });
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/test-debug" element={(() => {
            logger.info('TestDebug route matched and rendering', { component: 'TestDebug' });
            return <TestDebug />;
          })()} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/sessions" element={<ErrorBoundary><Sessions /></ErrorBoundary>} />
          <Route path="/sessions/new" element={<SessionForm />} />
          <Route path="/sessions/:id" element={<SessionDetail />} />
          <Route path="/sessions/:id/signup" element={<SessionSignup />} />
          <Route path="/sessions/:id/ready-to-signup" element={<ReadyToSignup />} />
          <Route path="/sessions/:sessionId/confirmation" element={<SignupConfirmation />} />
          <Route path="/account/history" element={<AccountHistory />} />
          <Route path="/approve/:token" element={<ApprovePage />} />
          <Route path="/sessions/:id/edit" element={<SessionForm />} />
          <Route path="/children" element={<Children />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/find" element={<FindCamps />} />
          <Route path="/plans/:id" element={<PlanDetail />} />
          <Route path="/billing" element={<Billing />} />
          <Route path="/billing/setup/success" element={<BillingSetupSuccess />} />
          <Route path="/billing/setup/cancelled" element={<BillingSetupCancelled />} />
          <Route path="/payment/success" element={<PaymentSuccess />} />
          <Route path="/reservation-holds" element={<ReservationHolds />} />
          <Route path="/manual-backup/:reservationId" element={<ManualBackup />} />
          
          {/* Admin Layout with Sidebar */}
          <Route path="/admin/*" element={<ProtectedRoute><AdminLayout /></ProtectedRoute>}>
            <Route index element={<AdminDashboard />} />
            <Route path="operations" element={<Operations />} />
            <Route path="compliance" element={<ComplianceDashboard />} />
            <Route path="observability" element={<ObservabilityPage />} />
            <Route path="partnerships" element={<Partnerships />} />
            <Route path="analytics" element={<Analytics />} />
            <Route path="captcha-assist" element={<CaptchaAssist />} />
            <Route path="tos-compliance" element={<TOSCompliance />} />
          </Route>
          
          {/* Legacy standalone routes */}
          <Route path="/operations" element={<ProtectedRoute><Operations /></ProtectedRoute>} />
          <Route path="/compliance" element={<ProtectedRoute><ComplianceDashboard /></ProtectedRoute>} />
          <Route path="/captcha-assist" element={<ProtectedRoute><CaptchaAssist /></ProtectedRoute>} />
          <Route path="/tos-compliance" element={<ProtectedRoute><TOSCompliance /></ProtectedRoute>} />
          <Route path="/observability" element={<ProtectedRoute><ObservabilityPage /></ProtectedRoute>} />
          <Route path="/partnerships" element={<ProtectedRoute><Partnerships /></ProtectedRoute>} />
          <Route path="/analytics" element={<ProtectedRoute><Analytics /></ProtectedRoute>} />
          <Route path="/system" element={<SystemDashboard />} />
          <Route path="/health" element={<HealthCheck />} />
          <Route path="/sanity" element={<SanityCheck />} />
          <Route path="/tests" element={<GuardrailsTest />} />
          <Route path="/dev/limits" element={<DevLimits />} />
          <Route path="/dev/prewarm" element={<DevRunPrewarm />} />
          <Route path="/test-environment" element={<TestEnvironment />} />
          <Route path="/diagnostics" element={<Diagnostics />} />
          <Route path="/search-test" element={<SearchTest />} />
          <Route path="/ui-audit-summary" element={<UIAuditSummary />} />
          <Route path="/ui-showcase" element={<UIShowcase />} />
          <Route path="/readiness" element={<Readiness />} />
          <Route path="/working-test" element={<WorkingTest />} />
          <Route path="/example-new-page" element={<ExampleNewPage />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
