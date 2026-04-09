"use client";

import Link from "next/link";
import { FileText, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ProcessingStatus } from "@/components/documents/ProcessingStatus";
import type { DocumentRecord } from "@/types/document";

import { cn } from "@/lib/utils";

interface DocumentCardProps {
  document: DocumentRecord;
  deleting: boolean;
  selected?: boolean;
  onDelete: (documentId: string) => Promise<void>;
  onSelect?: (documentId: string) => void;
}

const DOC_TYPE_LABELS: Record<string, string> = {
  insurance_policy: "Insurance Policy",
  lease_agreement: "Lease Agreement",
  employment_contract: "Employment Contract",
  nda: "NDA",
  terms_of_service: "Terms of Service",
  other: "Other",
};

// This component shows a single ingested document with selection, type badge, and delete.
export function DocumentCard({
  document,
  deleting,
  selected = false,
  onDelete,
  onSelect,
}: DocumentCardProps) {
  const createdDate = new Date(document.created_at).toLocaleString();
  const docTypeLabel =
    DOC_TYPE_LABELS[document.document_type ?? ""] ?? document.document_type ?? "unknown type";

  return (
    <div
      className={cn(
        "group rounded-lg border border-border bg-card p-4 shadow-sm transition",
        selected && "ring-2 ring-primary ring-offset-2",
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          {onSelect && (
            <input
              type="checkbox"
              checked={selected}
              onChange={() => onSelect(document.id)}
              className="mt-1.5 h-4 w-4 rounded border-border accent-primary"
            />
          )}
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-muted">
            <FileText className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="space-y-1">
            <Link
              href={`/dashboard/${document.id}` as never}
              className="text-sm font-medium text-foreground hover:underline"
            >
              {document.filename}
            </Link>
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span>{createdDate}</span>
              <span>{document.page_count ?? "?"} pages</span>
              {document.document_type && (
                <span className="inline-flex rounded-md border border-border px-1.5 py-0.5 text-xs font-medium">
                  {docTypeLabel}
                </span>
              )}
            </div>
          </div>
        </div>
        <ProcessingStatus status={document.upload_status} />
      </div>
      <div className="mt-3 flex items-center justify-between gap-4">
        <p className="line-clamp-1 text-xs text-muted-foreground">
          {document.summary ?? "Click filename to view details and generate summary."}
        </p>
        <Button
          disabled={deleting}
          onClick={() => onDelete(document.id)}
          variant="ghost"
          size="sm"
          className="shrink-0 text-muted-foreground hover:text-destructive"
        >
          <Trash2 className="h-3.5 w-3.5" />
          {deleting ? "Deleting..." : "Delete"}
        </Button>
      </div>
    </div>
  );
}
