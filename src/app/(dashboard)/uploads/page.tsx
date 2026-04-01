import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { Upload } from "lucide-react";

export default function UploadsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Uploads"
        description="Bring your own research data to ground persona generation."
      />
      <EmptyState
        icon={Upload}
        title="Uploads workspace coming soon"
        description="In the meantime, create personas using Deep Search, CV/Resume, Company URL, or App Store Reviews."
      />
    </div>
  );
}
