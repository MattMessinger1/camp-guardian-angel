import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import ErrorBoundary from "@/components/ErrorBoundary";
import { PublicModeWarning } from "@/components/PublicModeWarning";
import HomePage from "./pages/Home";
import ConfirmCamp from "./pages/ConfirmCamp";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Sessions from "./pages/Sessions";
import SessionDetail from "./pages/SessionDetail";
import Children from "./pages/Children";
import SessionForm from "./pages/SessionForm";
import Settings from "./pages/Settings";
import BillingSetupSuccess from "./pages/BillingSetupSuccess";
import BillingSetupCancelled from "./pages/BillingSetupCancelled";
import PaymentSuccess from "./pages/PaymentSuccess";
import DevRunPrewarm from "./pages/DevRunPrewarm";
import SanityCheck from "./pages/SanityCheck";
import NotFound from "./pages/NotFound";
import SignupActivate from "./pages/SignupActivate";
import Dashboard from "./pages/Dashboard";
import Billing from "./pages/Billing";
import DevLimits from "./pages/DevLimits";
import CaptchaAssist from "./pages/CaptchaAssist";
import FindCamps from "./pages/FindCamps";
import Readiness from "./pages/Readiness";
import PlanDetail from "./pages/PlanDetail";
import OTPPage from "./pages/OTPPage";
import CaptchaPage from "./pages/CaptchaPage";
import ApprovePage from "./pages/ApprovePage";
import Verify from "./pages/Verify";
import SignupRedirect from "./pages/SignupRedirect";
import ConfirmSignup from "./pages/ConfirmSignup";

const queryClient = new QueryClient();

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <div className="min-h-screen">
              <PublicModeWarning />
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/confirm-camp" element={<ConfirmCamp />} />
              <Route path="/index" element={<Index />} />
              <Route path="/find" element={<FindCamps />} />
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              <Route path="/sessions" element={<Sessions />} />
              <Route path="/sessions/new" element={<SessionForm />} />
              <Route path="/sessions/:id" element={<SessionDetail />} />
              <Route path="/sessions/:id/edit" element={<SessionForm />} />
              <Route path="/billing/setup-success" element={<BillingSetupSuccess />} />
              <Route path="/billing/setup-cancelled" element={<BillingSetupCancelled />} />
              <Route path="/billing/payment-success" element={<PaymentSuccess />} />
              <Route path="/signup/activate" element={<SignupActivate />} />
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <Dashboard />
                  </ProtectedRoute>
                }
              />
              <Route path="/sanity-check" element={<SanityCheck />} />
              <Route path="/dev/run-prewarm" element={<DevRunPrewarm />} />
              <Route path="/dev/limits" element={<DevLimits />} />
              <Route path="/settings" element={<Settings />} />
              <Route
                path="/children"
                element={
                  <ProtectedRoute>
                    <Children />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/billing"
                element={
                  <ProtectedRoute>
                    <Billing />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/assist/captcha"
                element={
                  <ProtectedRoute>
                    <CaptchaAssist />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/readiness"
                element={
                  <ProtectedRoute>
                    <Readiness />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/plan/:id"
                element={
                  <ProtectedRoute>
                    <PlanDetail />
                  </ProtectedRoute>
                }
              />
              {/* Public token-based pages */}
              <Route path="/verify" element={<Verify />} />
              <Route path="/otp/:token" element={<OTPPage />} />
              <Route path="/captcha/:token" element={<CaptchaPage />} />
              <Route path="/approve/:token" element={<ApprovePage />} />
              
              {/* Signup tracking routes */}
              <Route path="/r/:sessionId" element={<SignupRedirect />} />
              <Route path="/confirm-signup" element={<ConfirmSignup />} />
              
              <Route path="/404" element={<NotFound />} />
              <Route path="*" element={<Navigate to="/404" replace />} />
            </Routes>
            </div>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
