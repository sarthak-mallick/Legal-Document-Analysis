import Link from "next/link";

import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

// Landing page introducing the platform and linking to dashboard and chat.
export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col justify-center px-6 py-16">
      <div className="grid gap-8 lg:grid-cols-[1.3fr_0.9fr]">
        <section className="space-y-8">
          <div className="space-y-4">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-muted-foreground">
              Legal Document Analysis
            </p>
            <h1 className="max-w-3xl font-serif text-5xl leading-tight text-foreground sm:text-6xl">
              Upload legal documents. Ask questions. Get cited answers.
            </h1>
            <p className="max-w-2xl text-lg text-muted-foreground">
              AI-powered platform for analyzing insurance policies, leases, contracts, and NDAs.
              Table-aware ingestion, multi-step reasoning, and cross-document comparison.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              className={cn(
                "inline-flex items-center justify-center rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground shadow-sm transition hover:bg-primary/90",
              )}
              href="/dashboard"
            >
              Upload Documents
            </Link>
            <Link
              className={cn(
                "inline-flex items-center justify-center rounded-full bg-secondary px-5 py-2.5 text-sm font-medium text-secondary-foreground transition hover:bg-secondary/80",
              )}
              href={"/chat" as never}
            >
              Start Chatting
            </Link>
          </div>
        </section>
        <Card className="space-y-4 bg-parchment">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            How It Works
          </p>
          <div className="space-y-3 text-sm text-muted-foreground">
            <p>1. Upload a PDF — tables are detected and preserved</p>
            <p>2. Document is classified, chunked, and embedded</p>
            <p>3. Ask questions — the agent retrieves, reasons, and cites</p>
            <p>4. View summaries, risk flags, and coverage gaps</p>
            <p>5. Compare multiple documents side by side</p>
          </div>
        </Card>
      </div>
      <section className="mt-20 grid gap-4 sm:grid-cols-2 md:grid-cols-3" id="features">
        {[
          {
            title: "Table-Aware Ingestion",
            desc: "Detects tables, generates NL descriptions, preserves structured data",
          },
          {
            title: "Multi-Step Agent",
            desc: "Classifies queries, iterates on retrieval, extracts table values",
          },
          {
            title: "Citations & Sources",
            desc: "Every answer references specific sections and page numbers",
          },
          {
            title: "MCP Tools",
            desc: "Legal glossary with 50+ terms, optional web search integration",
          },
          {
            title: "Document Comparison",
            desc: "Ask cross-document questions with per-document attribution",
          },
          {
            title: "Risk & Gap Analysis",
            desc: "Auto-generated summaries with risk flags and coverage matrix",
          },
        ].map((item) => (
          <Card className="min-h-32" key={item.title}>
            <p className="font-serif text-xl text-foreground">{item.title}</p>
            <p className="mt-2 text-sm text-muted-foreground">{item.desc}</p>
          </Card>
        ))}
      </section>
    </main>
  );
}
