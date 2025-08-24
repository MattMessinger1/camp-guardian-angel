import { BrowserRouter, Routes, Route } from "react-router-dom";
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
import SignupConfirmation from './pages/SignupConfirmation';
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
import TOSCompliance from './pages/TOSCompliance';
import ObservabilityPage from './pages/ObservabilityPage';
import ErrorBoundary from './components/ErrorBoundary';
import ProtectedRoute from './components/auth/ProtectedRoute';

export default function App() {
  console.log('🚀 App component is rendering!');
  
  // Add basic route debugging
  const currentPath = window.location.pathname;
  const currentSearch = window.location.search;
  console.log('📍 Current path:', currentPath);
  console.log('📍 Current search:', currentSearch);
  
  return (
    <div style={{ padding: '20px', backgroundColor: '#f0f0f0', minHeight: '100vh' }}>
      <h1 style={{ color: 'red', fontSize: '24px' }}>ROUTING DEBUG MODE</h1>
      <p>Current URL: {window.location.href}</p>
      <p>Path: {currentPath}</p>
      <p>Search: {currentSearch}</p>
      
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={
              <div style={{ padding: '10px', border: '2px solid green' }}>
                <h2>HOME PAGE WORKING</h2>
                <a href="/signup?sessionId=test">Test Signup Link</a>
              </div>
            } />
            <Route path="/signup" element={
              <div style={{ padding: '10px', border: '2px solid blue' }}>
                <h2>SIGNUP PAGE WORKING!</h2>
                <p>Session ID: {new URLSearchParams(window.location.search).get('sessionId')}</p>
              </div>
            } />
            <Route path="*" element={<div>404 - Page not found</div>} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </div>
  );
}
