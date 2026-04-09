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
      <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-border py-12 text-center">
        <p className="text-sm text-muted-foreground">
          No documents uploaded yet. Add a PDF to start the ingestion pipeline.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
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
