import { BrowserRouter, Routes, Route } from "react-router-dom";
import HomePage from "./pages/Home";
import ReservationHolds from "./pages/ReservationHolds";
import ManualBackup from "./pages/ManualBackup";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Dashboard from "./pages/Dashboard";
import Sessions from "./pages/Sessions";
import Children from "./pages/Children";
import Settings from "./pages/Settings";
import FindCamps from "./pages/FindCamps";
import SessionDetail from "./pages/SessionDetail";
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
import Search from "./pages/Search";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/sessions" element={<Sessions />} />
        <Route path="/sessions/new" element={<SessionForm />} />
        <Route path="/sessions/:id" element={<SessionDetail />} />
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
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/system" element={<SystemDashboard />} />
        <Route path="/health" element={<HealthCheck />} />
        <Route path="/sanity" element={<SanityCheck />} />
        <Route path="/tests" element={<GuardrailsTest />} />
        <Route path="/dev/limits" element={<DevLimits />} />
        <Route path="/dev/prewarm" element={<DevRunPrewarm />} />
        <Route path="/test-environment" element={<TestEnvironment />} />
        <Route path="/diagnostics" element={<Diagnostics />} />
        <Route path="/search" element={<Search />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}
