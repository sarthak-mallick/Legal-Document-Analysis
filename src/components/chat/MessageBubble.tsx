"use client";

import { useCallback, useState } from "react";

import { CitationCard } from "@/components/chat/CitationCard";
import type { Citation } from "@/types/conversation";

import { cn } from "@/lib/utils";

interface MessageBubbleProps {
  role: "user" | "assistant";
  content: string;
  citations?: Citation[];
  onCitationClick?: (citation: Citation) => void;
}

// Renders a single chat message with optional citation cards and copy button.
export function MessageBubble({ role, content, citations, onCitationClick }: MessageBubbleProps) {
  const isUser = role === "user";
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API not available
    }
  }, [content]);

  return (
    <div className={cn("flex", isUser ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "group relative max-w-[80%] space-y-2 rounded-2xl px-4 py-3 text-sm",
          isUser
            ? "bg-primary text-primary-foreground"
            : "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200",
        )}
      >
        <div className="whitespace-pre-wrap">{content}</div>
        {!isUser && (
          <button
            onClick={handleCopy}
            className="absolute right-2 top-2 hidden rounded px-1.5 py-0.5 text-[10px] text-slate-400 transition hover:bg-slate-200 hover:text-slate-600 group-hover:inline-block dark:hover:bg-slate-700"
          >
            {copied ? "Copied" : "Copy"}
          </button>
        )}
        {citations && citations.length > 0 && (
          <div className="mt-3 space-y-1.5 border-t border-slate-200/50 pt-2">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
              Sources
            </p>
            {citations.map((citation, i) => (
              <CitationCard
                citation={citation}
                index={i}
                key={citation.chunk_id}
                onClick={onCitationClick ? () => onCitationClick(citation) : undefined}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
