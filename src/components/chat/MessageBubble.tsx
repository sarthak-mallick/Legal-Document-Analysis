"use client";

import { useCallback, useMemo, useState } from "react";
import { Copy, Check, FileText } from "lucide-react";

import { CitationCard } from "@/components/chat/CitationCard";
import type { Citation } from "@/types/conversation";

import { cn } from "@/lib/utils";

// Distinct color pairs for multi-document citation groups.
// Each entry: [badge classes, border class for left-border indicator, dot bg]
const DOC_COLORS: { badge: string; border: string; dot: string }[] = [
  { badge: "bg-blue-600 text-white", border: "border-l-blue-500", dot: "bg-blue-600" },
  { badge: "bg-amber-500 text-white", border: "border-l-amber-500", dot: "bg-amber-500" },
  { badge: "bg-emerald-600 text-white", border: "border-l-emerald-500", dot: "bg-emerald-600" },
  { badge: "bg-violet-600 text-white", border: "border-l-violet-500", dot: "bg-violet-600" },
  { badge: "bg-rose-600 text-white", border: "border-l-rose-500", dot: "bg-rose-600" },
  { badge: "bg-cyan-600 text-white", border: "border-l-cyan-500", dot: "bg-cyan-600" },
];

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

// Build search terms from a filename: full name, stem (without extension).
function buildSearchTerms(filename: string): string[] {
  const lower = filename.toLowerCase();
  const stem = lower.replace(/\.[^.]+$/, "");
  return [lower, stem];
}

// Check if a line references a specific document (filename or stem match).
function lineMatchesDoc(line: string, terms: string[]): boolean {
  const lower = line.toLowerCase();
  return terms.some((t) => lower.includes(t));
}

// Count how many documents a line references.
function countDocMatches(line: string, allTerms: string[][]): number[] {
  const matches: number[] = [];
  for (let i = 0; i < allTerms.length; i++) {
    if (lineMatchesDoc(line, allTerms[i])) matches.push(i);
  }
  return matches;
}

// Annotate response text with per-document colors using heading-based sections.
//
// Strategy: markdown headings (### ...) act as section boundaries.
//   - If a heading matches exactly one document, ALL content below it (including
//     blank lines, bullets, sub-paragraphs) inherits that document's color until
//     the next heading.
//   - If a heading matches zero or multiple documents (e.g. "Summary of Differences"),
//     the entire section is neutral — no per-line tagging within it.
//   - Content before the first heading is neutral.
//
// Falls back to no annotation if there are no headings.
function annotateParagraphs(
  content: string,
  filenames: string[],
): { text: string; docIndex: number | null }[] | null {
  if (filenames.length < 2) return null;

  const lines = content.split("\n");
  if (lines.length <= 1) return null;

  const allTerms = filenames.map(buildSearchTerms);

  // Check if response uses markdown headings
  const hasHeadings = lines.some((l) => /^#{1,4}\s/.test(l.trim()));
  if (!hasHeadings) return null;

  // Tag each line based on the current section heading
  let sectionDocIndex: number | null = null;
  const tagged = lines.map((text) => {
    const trimmed = text.trim();

    // Detect heading lines
    if (/^#{1,4}\s/.test(trimmed)) {
      const matches = countDocMatches(trimmed, allTerms);
      // Only color the section if exactly one document matches the heading
      sectionDocIndex = matches.length === 1 ? matches[0] : null;
    }

    return { text, docIndex: sectionDocIndex };
  });

  // If nothing was tagged, don't annotate
  if (tagged.every((p) => p.docIndex === null)) return null;

  // Merge consecutive lines with the same docIndex into blocks
  const blocks: { text: string; docIndex: number | null }[] = [];
  for (const line of tagged) {
    const last = blocks[blocks.length - 1];
    if (last && last.docIndex === line.docIndex) {
      last.text += "\n" + line.text;
    } else {
      blocks.push({ text: line.text, docIndex: line.docIndex });
    }
  }

  return blocks;
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

  // For multi-doc responses, annotate paragraphs with document colors
  const annotated = useMemo(() => {
    if (!isMultiDoc) return null;
    const filenames = groups.map((g) => g.filename);
    return annotateParagraphs(content, filenames);
  }, [content, groups, isMultiDoc]);

  return (
    <div className={cn("flex", isUser ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "group relative max-w-[80%] space-y-2 rounded-2xl px-4 py-3 text-sm",
          isUser ? "bg-primary text-primary-foreground" : "bg-muted text-foreground",
        )}
      >
        {/* Response text: annotated with colored borders for multi-doc, or plain */}
        {annotated ? (
          <div className="space-y-2">
            {annotated.map((para, i) => {
              const color =
                para.docIndex !== null ? DOC_COLORS[para.docIndex % DOC_COLORS.length] : null;
              return (
                <div
                  key={i}
                  className={cn("whitespace-pre-wrap", color && "border-l-2 pl-3", color?.border)}
                >
                  {para.text}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="whitespace-pre-wrap">{content}</div>
        )}
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
            {groups.map((group, groupIdx) => {
              const color = isMultiDoc ? DOC_COLORS[groupIdx % DOC_COLORS.length] : undefined;
              return (
                <div key={group.filename} className="space-y-1.5">
                  {isMultiDoc && (
                    <div className="flex items-center gap-1.5">
                      <span className={cn("inline-block h-2 w-2 rounded-full", color?.dot)} />
                      <FileText className="h-3 w-3 text-muted-foreground" />
                      <span className="text-xs font-medium text-foreground">{group.filename}</span>
                    </div>
                  )}
                  {group.citations.map((citation, i) => (
                    <CitationCard
                      citation={citation}
                      color={color?.badge}
                      index={i}
                      key={citation.chunk_id}
                      onClick={onCitationClick ? () => onCitationClick(citation) : undefined}
                    />
                  ))}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
