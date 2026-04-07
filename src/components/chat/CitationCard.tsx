"use client";

import { useState } from "react";

import type { Citation } from "@/types/conversation";

import { cn } from "@/lib/utils";

interface CitationCardProps {
  citation: Citation;
  index: number;
  onClick?: () => void;
}

// Expandable citation reference showing source chunk details.
export function CitationCard({ citation, index, onClick }: CitationCardProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <button
      className={cn(
        "w-full rounded-lg border border-slate-200 px-3 py-2 text-left text-xs transition hover:bg-slate-50 dark:border-slate-600 dark:hover:bg-slate-700",
        expanded && "bg-slate-50 dark:bg-slate-700",
      )}
      onClick={() => {
        setExpanded(!expanded);
        if (onClick) onClick();
      }}
      type="button"
    >
      <div className="flex items-center gap-2">
        <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-semibold text-primary">
          {index + 1}
        </span>
        <span className="font-medium text-slate-700 dark:text-slate-300">
          {citation.section_title ?? "Unknown section"}
        </span>
        {citation.page_number && (
          <span className="text-slate-400">Page {citation.page_number}</span>
        )}
      </div>
      {expanded && <p className="mt-2 text-slate-600 dark:text-slate-400">{citation.snippet}</p>}
    </button>
  );
}
