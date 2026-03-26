import { CitationCard } from "@/components/chat/CitationCard";
import type { Citation } from "@/types/conversation";

import { cn } from "@/lib/utils";

interface MessageBubbleProps {
  role: "user" | "assistant";
  content: string;
  citations?: Citation[];
}

// Renders a single chat message with optional citation cards.
export function MessageBubble({ role, content, citations }: MessageBubbleProps) {
  const isUser = role === "user";

  return (
    <div className={cn("flex", isUser ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[80%] space-y-2 rounded-2xl px-4 py-3 text-sm",
          isUser
            ? "bg-primary text-primary-foreground"
            : "bg-slate-100 text-slate-800",
        )}
      >
        <div className="whitespace-pre-wrap">{content}</div>
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
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
