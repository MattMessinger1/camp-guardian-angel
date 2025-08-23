import { PartnershipManager } from "@/components/PartnershipManager"

export default function Partnerships() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Partnership Management</h1>
        <p className="text-muted-foreground">
          Manage camp provider relationships and track partnership effectiveness.
        </p>
      </div>
      
      <PartnershipManager />
    </div>
  )
}