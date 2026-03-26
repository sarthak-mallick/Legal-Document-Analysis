import type { DocumentRecord } from "@/types/document";

import { DocumentCard } from "@/components/documents/DocumentCard";

interface DocumentListProps {
  deletingId: string | null;
  documents: DocumentRecord[];
  selectedIds?: string[];
  onDelete: (documentId: string) => Promise<void>;
  onSelect?: (documentId: string) => void;
}

// This component renders the dashboard list of uploaded documents with optional selection.
export function DocumentList({
  deletingId,
  documents,
  selectedIds = [],
  onDelete,
  onSelect,
}: DocumentListProps) {
  if (!documents.length) {
    return (
      <div className="rounded-[28px] border border-dashed border-border bg-white/40 p-8 text-sm text-slate-600">
        No documents uploaded yet. Add a PDF to start the ingestion pipeline.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {documents.map((document) => (
        <DocumentCard
          deleting={deletingId === document.id}
          document={document}
          key={document.id}
          selected={selectedIds.includes(document.id)}
          onDelete={onDelete}
          onSelect={onSelect}
        />
      ))}
    </div>
  );
}
