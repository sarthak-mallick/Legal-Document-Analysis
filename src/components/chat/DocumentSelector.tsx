"use client";

import { FileText } from "lucide-react";

import type { DocumentRecord } from "@/types/document";

import { cn } from "@/lib/utils";

interface DocumentSelectorProps {
  documents: DocumentRecord[];
  selectedIds: string[];
  disabled?: boolean;
  onToggle: (id: string) => void;
}

// Allows selecting which documents to query in the chat.
export function DocumentSelector({
  documents,
  selectedIds,
  disabled,
  onToggle,
}: DocumentSelectorProps) {
  if (documents.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">No documents available. Upload a PDF first.</p>
    );
  }

  return (
    <div className="space-y-1.5">
      <p className="text-xs font-medium text-muted-foreground">Documents</p>
      {disabled && (
        <p className="text-[11px] text-muted-foreground/70">Locked for this conversation</p>
      )}
      {documents.map((doc) => {
        const selected = selectedIds.includes(doc.id);
        return (
          <button
            key={doc.id}
            className={cn(
              "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors",
              disabled && "cursor-default opacity-60",
              selected
                ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
                : "text-sidebar-foreground hover:bg-sidebar-accent/50",
            )}
            disabled={disabled}
            onClick={() => onToggle(doc.id)}
            type="button"
          >
            <FileText className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            <div className="min-w-0">
              <p className="truncate text-sm">{doc.filename}</p>
              {doc.document_type && (
                <p className="text-xs text-muted-foreground">
                  {doc.document_type.replace(/_/g, " ")}
                </p>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}
