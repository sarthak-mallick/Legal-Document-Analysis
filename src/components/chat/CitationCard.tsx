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
        "w-full rounded-lg border border-border px-3 py-2 text-left text-xs transition hover:bg-muted",
        expanded && "bg-muted",
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
        <span className="font-medium text-foreground">
          {citation.section_title ??
            (citation.page_number ? `Page ${citation.page_number}` : "Unknown source")}
        </span>
        {citation.section_title && citation.page_number && (
          <span className="text-muted-foreground">Page {citation.page_number}</span>
        )}
      </div>
      {expanded && citation.snippet && (
        <p className="mt-2 text-muted-foreground">{citation.snippet}</p>
      )}
    </button>
  );
}
