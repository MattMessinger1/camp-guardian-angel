import { ComplianceMonitoringDashboard } from "@/components/ComplianceMonitoringDashboard"

export default function Analytics() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Analytics & Compliance</h1>
        <p className="text-muted-foreground">
          Monitor automation ethics, success rates, and compliance metrics.
        </p>
      </div>
      
      <ComplianceMonitoringDashboard />
    </div>
  )
}