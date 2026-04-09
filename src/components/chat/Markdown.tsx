import ReactMarkdown from "react-markdown";

// Renders markdown content with styled prose for chat messages.
export function Markdown({ content }: { content: string }) {
  return (
    <ReactMarkdown
      components={{
        h1: ({ children }) => (
          <h3 className="mb-1 mt-3 text-base font-semibold first:mt-0">{children}</h3>
        ),
        h2: ({ children }) => (
          <h3 className="mb-1 mt-3 text-base font-semibold first:mt-0">{children}</h3>
        ),
        h3: ({ children }) => (
          <h4 className="mb-1 mt-3 text-sm font-semibold first:mt-0">{children}</h4>
        ),
        h4: ({ children }) => (
          <h5 className="mb-1 mt-2 text-sm font-semibold first:mt-0">{children}</h5>
        ),
        p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
        ul: ({ children }) => (
          <ul className="mb-2 list-disc space-y-1 pl-5 last:mb-0">{children}</ul>
        ),
        ol: ({ children }) => (
          <ol className="mb-2 list-decimal space-y-1 pl-5 last:mb-0">{children}</ol>
        ),
        li: ({ children }) => <li>{children}</li>,
        strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
        em: ({ children }) => <em className="italic">{children}</em>,
        code: ({ children }) => (
          <code className="rounded bg-foreground/10 px-1 py-0.5 text-xs">{children}</code>
        ),
        blockquote: ({ children }) => (
          <blockquote className="border-l-2 border-border pl-3 italic">{children}</blockquote>
        ),
        hr: () => <hr className="my-3 border-border/50" />,
      }}
    >
      {content}
    </ReactMarkdown>
  );
}
