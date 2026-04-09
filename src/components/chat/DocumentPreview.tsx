"use client";

import { X, FileText } from "lucide-react";

import type { Citation } from "@/types/conversation";

interface DocumentPreviewProps {
  citation: Citation;
  onClose: () => void;
}

// Slide-out panel showing the source chunk content for a clicked citation.
export function DocumentPreview({ citation, onClose }: DocumentPreviewProps) {
  return (
    <div className="flex h-full w-80 shrink-0 flex-col border-l border-border bg-background">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-medium text-foreground">Source Preview</h3>
        </div>
        <button
          onClick={onClose}
          className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          type="button"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-4">
        <div className="mb-3 space-y-1">
          {citation.filename && (
            <p className="text-xs font-medium text-muted-foreground">{citation.filename}</p>
          )}
          <p className="text-sm font-medium text-foreground">
            {citation.section_title ??
              (citation.page_number ? `Page ${citation.page_number}` : "Unknown Source")}
          </p>
          {citation.page_number && (
            <p className="text-xs text-muted-foreground">Page {citation.page_number}</p>
          )}
        </div>
        {citation.snippet ? (
          <p className="text-sm leading-relaxed text-foreground">{citation.snippet}</p>
        ) : (
          <p className="text-sm italic text-muted-foreground">
            Source content is structured data that cannot be previewed as text.
          </p>
        )}
      </div>
    </div>
  );
}
