import { useParams } from "react-router-dom";

export default function ManualBackup() {
  const { reservationId } = useParams();
  return (
    <div>
      <h1>Manual Backup</h1>
      <div data-testid="failure-reason">
        No seats available for reservation {reservationId}
      </div>
      <a
        data-testid="manual-backup-link"
        href="https://provider.example/signup"
        target="_blank"
      >
        Open provider signup
      </a>
    </div>
  );
}
