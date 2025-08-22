import { lazy } from "react";

const ApprovalPage = lazy(() => import("@/components/ApprovalPage"));

export default function ApprovePage() {
  return <ApprovalPage />;
}