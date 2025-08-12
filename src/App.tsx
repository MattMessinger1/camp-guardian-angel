import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import ErrorBoundary from "@/components/ErrorBoundary";
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
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              <Route path="/sessions" element={<Sessions />} />
              <Route path="/sessions/new" element={<SessionForm />} />
              <Route path="/sessions/:id" element={<SessionDetail />} />
              <Route path="/sessions/:id/edit" element={<SessionForm />} />
              <Route path="/billing/setup-success" element={<BillingSetupSuccess />} />
              <Route path="/billing/setup-cancelled" element={<BillingSetupCancelled />} />
              <Route path="/billing/payment-success" element={<PaymentSuccess />} />
              <Route path="/dev/run-prewarm" element={<DevRunPrewarm />} />
              <Route path="/settings" element={<Settings />} />
              <Route
                path="/children"
                element={
                  <ProtectedRoute>
                    <Children />
                  </ProtectedRoute>
                }
              />
              <Route path="/404" element={<NotFound />} />
              <Route path="*" element={<Navigate to="/404" replace />} />
            </Routes>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
