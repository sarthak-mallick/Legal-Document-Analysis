"use client";

import { useCallback, useState } from "react";
import { Copy, Check, FileText } from "lucide-react";

import { CitationCard } from "@/components/chat/CitationCard";
import type { Citation } from "@/types/conversation";

import { cn } from "@/lib/utils";

interface MessageBubbleProps {
  role: "user" | "assistant";
  content: string;
  citations?: Citation[];
  onCitationClick?: (citation: Citation) => void;
}

// Group citations by document for cross-document comparison queries.
function groupByDocument(citations: Citation[]): { filename: string; citations: Citation[] }[] {
  const hasDocInfo = citations.some((c) => c.filename);
  if (!hasDocInfo) return [{ filename: "", citations }];

  const groups = new Map<string, Citation[]>();
  for (const c of citations) {
    const key = c.filename ?? "Unknown document";
    const list = groups.get(key) ?? [];
    list.push(c);
    groups.set(key, list);
  }
  return Array.from(groups, ([filename, cits]) => ({ filename, citations: cits }));
}

// Renders a single chat message bubble, user on the right, assistant on the left.
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

  const groups = citations && citations.length > 0 ? groupByDocument(citations) : [];
  const isMultiDoc = groups.length > 1;

  return (
    <div className={cn("flex", isUser ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "group relative max-w-[80%] space-y-2 rounded-2xl px-4 py-3 text-sm",
          isUser ? "bg-primary text-primary-foreground" : "bg-muted text-foreground",
        )}
      >
        <div className="whitespace-pre-wrap">{content}</div>
        {!isUser && (
          <button
            onClick={handleCopy}
            className="absolute right-2 top-2 hidden rounded-md p-1 text-muted-foreground transition-colors hover:bg-background/50 hover:text-foreground group-hover:inline-flex"
            type="button"
          >
            {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
          </button>
        )}
        {groups.length > 0 && (
          <div className="mt-3 space-y-3 border-t border-border/30 pt-3">
            <p className="text-xs font-medium text-muted-foreground">Sources</p>
            {groups.map((group) => (
              <div key={group.filename} className="space-y-1.5">
                {isMultiDoc && (
                  <div className="flex items-center gap-1.5">
                    <FileText className="h-3 w-3 text-muted-foreground" />
                    <span className="text-xs font-medium text-foreground">{group.filename}</span>
                  </div>
                )}
                {group.citations.map((citation, i) => (
                  <CitationCard
                    citation={citation}
                    index={i}
                    key={citation.chunk_id}
                    onClick={onCitationClick ? () => onCitationClick(citation) : undefined}
                  />
                ))}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
