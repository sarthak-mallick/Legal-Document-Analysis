"use client";

import type { DocumentRecord } from "@/types/document";

import { cn } from "@/lib/utils";

interface DocumentSelectorProps {
  documents: DocumentRecord[];
  selectedIds: string[];
  onToggle: (id: string) => void;
}

// Allows selecting which documents to query in the chat.
export function DocumentSelector({ documents, selectedIds, onToggle }: DocumentSelectorProps) {
  if (documents.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">No documents available. Upload a PDF first.</p>
    );
  }

  return (
    <div className="space-y-1.5">
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Documents
      </p>
      {documents.map((doc) => {
        const selected = selectedIds.includes(doc.id);
        return (
          <button
            key={doc.id}
            className={cn(
              "w-full rounded-lg px-3 py-2 text-left text-sm transition",
              selected
                ? "bg-primary/10 font-medium text-primary"
                : "text-foreground hover:bg-muted",
            )}
            onClick={() => onToggle(doc.id)}
            type="button"
          >
            <p className="truncate">{doc.filename}</p>
            {doc.document_type && (
              <p className="text-xs text-muted-foreground">{doc.document_type}</p>
            )}
          </button>
        );
      })}
    </div>
  );
}
