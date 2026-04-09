"use client";

import { useCallback, useState } from "react";
import { Copy, Check } from "lucide-react";

import { CitationCard } from "@/components/chat/CitationCard";
import type { Citation } from "@/types/conversation";

import { cn } from "@/lib/utils";

interface MessageBubbleProps {
  role: "user" | "assistant";
  content: string;
  citations?: Citation[];
  onCitationClick?: (citation: Citation) => void;
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
        {citations && citations.length > 0 && (
          <div className="mt-3 space-y-1.5 border-t border-border/30 pt-3">
            <p className="text-xs font-medium text-muted-foreground">Sources</p>
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
