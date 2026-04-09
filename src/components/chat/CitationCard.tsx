"use client";

import { useState } from "react";
import { ChevronDown, FileText } from "lucide-react";

import type { Citation } from "@/types/conversation";

import { cn } from "@/lib/utils";

interface CitationCardProps {
  citation: Citation;
  index: number;
  color?: string;
  onClick?: () => void;
}

// Expandable citation reference showing source chunk details.
export function CitationCard({ citation, index, color, onClick }: CitationCardProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <button
      className={cn(
        "w-full rounded-md border border-border px-3 py-2 text-left text-xs transition-colors hover:bg-muted",
        expanded && "bg-muted",
      )}
      onClick={() => {
        setExpanded(!expanded);
        if (onClick) onClick();
      }}
      type="button"
    >
      <div className="flex items-center gap-2">
        <span
          className={cn(
            "inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-md text-[10px] font-semibold",
            color ?? "bg-primary text-primary-foreground",
          )}
        >
          {index + 1}
        </span>
        <FileText className="h-3 w-3 shrink-0 text-muted-foreground" />
        <span className="flex-1 truncate font-medium text-foreground">
          {citation.section_title ??
            (citation.page_number ? `Page ${citation.page_number}` : "Unknown source")}
        </span>
        {citation.section_title && citation.page_number && (
          <span className="text-muted-foreground">p.{citation.page_number}</span>
        )}
        <ChevronDown
          className={cn(
            "h-3 w-3 shrink-0 text-muted-foreground transition-transform",
            expanded && "rotate-180",
          )}
        />
      </div>
      {expanded && citation.snippet && (
        <p className="mt-2 text-muted-foreground">{citation.snippet}</p>
      )}
    </button>
  );
}
