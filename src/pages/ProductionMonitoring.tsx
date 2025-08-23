import { ProductionMonitoringDashboard } from "@/components/ProductionMonitoringDashboard";
import { StandardPage } from "@/components/StandardPage";

export default function ProductionMonitoring() {
  return (
    <StandardPage
      pageName="production-monitoring"
      currentRoute="/admin/production"
      title="Production Monitoring"
      description="Real-time system health and error tracking"
    >
      <ProductionMonitoringDashboard />
    </StandardPage>
  );
}