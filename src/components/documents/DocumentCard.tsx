import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { DocumentRecord } from "@/types/document";
import { ProcessingStatus } from "@/components/documents/ProcessingStatus";

interface DocumentCardProps {
  document: DocumentRecord;
  deleting: boolean;
  onDelete: (documentId: string) => Promise<void>;
}

// This component shows a single ingested document and its current processing metadata.
export function DocumentCard({
  document,
  deleting,
  onDelete,
}: DocumentCardProps) {
  const createdDate = new Date(document.created_at).toLocaleString();

  return (
    <Card className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <p className="text-lg font-semibold text-foreground">{document.filename}</p>
          <div className="flex flex-wrap gap-3 text-sm text-slate-600">
            <span>{createdDate}</span>
            <span>{document.page_count ?? "?"} pages</span>
            <span>{document.document_type ?? "unknown type"}</span>
          </div>
        </div>
        <ProcessingStatus status={document.upload_status} />
      </div>
      <div className="flex items-center justify-between gap-4 text-sm text-slate-600">
        <p>{document.summary ?? "Summary generation arrives in a later week."}</p>
        <Button
          disabled={deleting}
          onClick={() => onDelete(document.id)}
          variant="destructive"
        >
          {deleting ? "Deleting..." : "Delete"}
        </Button>
      </div>
    </Card>
  );
}

