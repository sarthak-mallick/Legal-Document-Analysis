import { cn } from "@/lib/utils";

interface StreamingMessageProps {
  content: string;
}

// Renders an in-progress assistant message as tokens stream in.
export function StreamingMessage({ content }: StreamingMessageProps) {
  return (
    <div className="flex justify-start">
      <div className={cn("max-w-[80%] rounded-2xl bg-slate-100 px-4 py-3 text-sm text-slate-800")}>
        <div className="whitespace-pre-wrap">
          {content}
          <span className="ml-0.5 inline-block h-4 w-1.5 animate-pulse bg-slate-400" />
        </div>
      </div>
    </div>
  );
}
