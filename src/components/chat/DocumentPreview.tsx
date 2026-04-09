"use client";

import type { Citation } from "@/types/conversation";

interface DocumentPreviewProps {
  citation: Citation;
  onClose: () => void;
}

// Slide-out panel showing the source chunk content for a clicked citation.
export function DocumentPreview({ citation, onClose }: DocumentPreviewProps) {
  return (
    <div className="flex h-full w-80 shrink-0 flex-col border-l border-border bg-card-bg">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <h3 className="text-sm font-semibold text-foreground">Source Preview</h3>
        <button
          onClick={onClose}
          className="text-xs text-muted-foreground transition hover:text-foreground"
          type="button"
        >
          Close
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-4">
        <div className="mb-3 space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-primary">
            {citation.section_title ?? "Unknown Section"}
          </p>
          {citation.page_number && (
            <p className="text-xs text-muted-foreground">Page {citation.page_number}</p>
          )}
        </div>
        <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
          {citation.snippet}
        </p>
      </div>
    </div>
  );
}
