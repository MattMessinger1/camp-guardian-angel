import { BrowserRouter, Routes, Route } from "react-router-dom";
import ReservationHolds from "./pages/ReservationHolds";
import ManualBackup from "./pages/ManualBackup";
import HomePage from "./pages/Home";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/reservation-holds" element={<ReservationHolds />} />
        <Route path="/manual-backup/:reservationId" element={<ManualBackup />} />
      </Routes>
    </BrowserRouter>
  );
}
