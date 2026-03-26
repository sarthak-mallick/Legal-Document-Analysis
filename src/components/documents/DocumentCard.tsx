"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ChunkDebugPanel } from "@/components/documents/ChunkDebugPanel";
import { ProcessingStatus } from "@/components/documents/ProcessingStatus";
import type { DocumentRecord } from "@/types/document";

import { cn } from "@/lib/utils";

interface DocumentCardProps {
  document: DocumentRecord;
  deleting: boolean;
  onDelete: (documentId: string) => Promise<void>;
}

const DOC_TYPE_LABELS: Record<string, string> = {
  insurance_policy: "Insurance Policy",
  lease_agreement: "Lease Agreement",
  employment_contract: "Employment Contract",
  nda: "NDA",
  terms_of_service: "Terms of Service",
  other: "Other",
};

// This component shows a single ingested document and its current processing metadata.
export function DocumentCard({
  document,
  deleting,
  onDelete,
}: DocumentCardProps) {
  const [showChunks, setShowChunks] = useState(false);
  const createdDate = new Date(document.created_at).toLocaleString();
  const docTypeLabel = DOC_TYPE_LABELS[document.document_type ?? ""] ?? document.document_type ?? "unknown type";

  return (
    <Card className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <p className="text-lg font-semibold text-foreground">{document.filename}</p>
          <div className="flex flex-wrap items-center gap-3 text-sm text-slate-600">
            <span>{createdDate}</span>
            <span>{document.page_count ?? "?"} pages</span>
            {document.document_type && (
              <span
                className={cn(
                  "inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium",
                  "bg-blue-100 text-blue-800",
                )}
              >
                {docTypeLabel}
              </span>
            )}
          </div>
        </div>
        <ProcessingStatus status={document.upload_status} />
      </div>
      <div className="flex items-center justify-between gap-4 text-sm text-slate-600">
        <div className="flex items-center gap-4">
          <p>{document.summary ?? "Summary generation arrives in a later week."}</p>
        </div>
        <div className="flex items-center gap-2">
          {document.upload_status === "ready" && (
            <Button
              onClick={() => setShowChunks(!showChunks)}
              variant="ghost"
            >
              {showChunks ? "Hide Chunks" : "View Chunks"}
            </Button>
          )}
          <Button
            disabled={deleting}
            onClick={() => onDelete(document.id)}
            variant="destructive"
          >
            {deleting ? "Deleting..." : "Delete"}
          </Button>
        </div>
      </div>
      {showChunks && <ChunkDebugPanel documentId={document.id} />}
    </Card>
  );
}
