"use client";

import type { Citation } from "@/types/conversation";

interface DocumentPreviewProps {
  citation: Citation;
  onClose: () => void;
}

// Slide-out panel showing the source chunk content for a clicked citation.
export function DocumentPreview({ citation, onClose }: DocumentPreviewProps) {
  return (
    <div className="flex h-full w-80 shrink-0 flex-col border-l border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
      <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-slate-700">
        <h3 className="text-sm font-semibold text-foreground">Source Preview</h3>
        <button
          onClick={onClose}
          className="text-xs text-slate-400 transition hover:text-slate-600"
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
            <p className="text-xs text-slate-400">Page {citation.page_number}</p>
          )}
        </div>
        <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700 dark:text-slate-300">
          {citation.snippet}
        </p>
      </div>
    </div>
  );
}
