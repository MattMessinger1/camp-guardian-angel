import { BrowserRouter, Routes, Route } from "react-router-dom";
import ReservationHolds from "./pages/ReservationHolds";
import ManualBackup from "./pages/ManualBackup";
import MockPayment from "./components/MockPayment";
import Policy from "./components/Policy";

function Home() {
  return (
    <div>
      <h1>Camp Guardian Angel</h1>
      <p>Homepage loads successfully</p>
      <MockPayment />
      <Policy />
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/reservation-holds" element={<ReservationHolds />} />
        <Route path="/manual-backup/:reservationId" element={<ManualBackup />} />
      </Routes>
    </BrowserRouter>
  );
}
