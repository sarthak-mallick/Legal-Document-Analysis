"use client";

import { useCallback, useState } from "react";
import { Copy, Check, User, Bot } from "lucide-react";

import { CitationCard } from "@/components/chat/CitationCard";
import type { Citation } from "@/types/conversation";

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
    <div className="group flex gap-3">
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-border bg-background">
        {isUser ? (
          <User className="h-3.5 w-3.5 text-foreground" />
        ) : (
          <Bot className="h-3.5 w-3.5 text-foreground" />
        )}
      </div>
      <div className="min-w-0 flex-1 space-y-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-foreground">
            {isUser ? "You" : "Assistant"}
          </span>
          {!isUser && (
            <button
              onClick={handleCopy}
              className="hidden rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground group-hover:inline-flex"
              type="button"
            >
              {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
            </button>
          )}
        </div>
        <div className="whitespace-pre-wrap text-sm text-foreground">{content}</div>
        {citations && citations.length > 0 && (
          <div className="mt-3 space-y-1.5 border-t border-border pt-3">
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
