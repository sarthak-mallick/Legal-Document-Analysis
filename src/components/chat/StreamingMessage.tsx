import { Bot } from "lucide-react";

interface StreamingMessageProps {
  content: string;
}

// Renders an in-progress assistant message as tokens stream in.
export function StreamingMessage({ content }: StreamingMessageProps) {
  return (
    <div className="group flex gap-3">
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-border bg-background">
        <Bot className="h-3.5 w-3.5 text-foreground" />
      </div>
      <div className="min-w-0 flex-1 space-y-2">
        <span className="text-xs font-medium text-foreground">Assistant</span>
        <div className="whitespace-pre-wrap text-sm text-foreground">
          {content}
          <span className="ml-0.5 inline-block h-4 w-1 animate-pulse rounded-sm bg-foreground/50" />
        </div>
      </div>
    </div>
  );
}
