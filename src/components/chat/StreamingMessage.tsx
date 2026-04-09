// Renders an in-progress assistant message as tokens stream in.
export function StreamingMessage({ content }: { content: string }) {
  return (
    <div className="flex justify-start">
      <div className="max-w-[80%] rounded-2xl bg-muted px-4 py-3 text-sm text-foreground">
        {content ? (
          <div className="whitespace-pre-wrap">
            {content}
            <span className="ml-0.5 inline-block h-4 w-1 animate-pulse rounded-sm bg-foreground/50" />
          </div>
        ) : (
          <div className="flex items-center gap-1 py-0.5">
            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground/60 [animation-delay:0ms]" />
            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground/60 [animation-delay:150ms]" />
            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground/60 [animation-delay:300ms]" />
          </div>
        )}
      </div>
    </div>
  );
}
