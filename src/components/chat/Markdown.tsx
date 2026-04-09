import type { ReactNode, ReactElement } from "react";
import ReactMarkdown from "react-markdown";

// Recursively extract plain text from React children so we can match
// document names inside rendered list items.
function extractText(node: ReactNode): string {
  if (typeof node === "string") return node;
  if (typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(extractText).join("");
  if (node && typeof node === "object" && "props" in node) {
    return extractText((node as ReactElement<{ children?: ReactNode }>).props?.children);
  }
  return "";
}

interface MarkdownProps {
  content: string;
  /** Return a Tailwind border-color class (e.g. "border-l-blue-500") for list
   *  items that reference a specific document, or null for neutral items. */
  getItemDocColor?: (text: string) => string | null;
}

// Renders markdown content with styled prose for chat messages.
export function Markdown({ content, getItemDocColor }: MarkdownProps) {
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
        li: ({ children }) => {
          if (!getItemDocColor) return <li>{children}</li>;
          const text = extractText(children);
          const borderClass = getItemDocColor(text);
          return borderClass ? (
            <li className={`border-l-2 pl-2 ${borderClass}`}>{children}</li>
          ) : (
            <li>{children}</li>
          );
        },
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
