import { TransparencyReports } from "@/components/TransparencyReports";
import { StandardPage } from "@/components/StandardPage";

export default function TransparencyPage() {
  return (
    <StandardPage
      pageName="transparency-reports"
      currentRoute="/admin/transparency"
      title="Transparency Reports"
      description="Data usage and activity reports for parents and providers"
    >
      <TransparencyReports />
    </StandardPage>
  );
}