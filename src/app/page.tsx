import Link from "next/link";
import {
  FileText,
  MessageSquare,
  Search,
  Shield,
  Table,
  GitCompareArrows,
  ArrowRight,
  Scale,
} from "lucide-react";

import { Card } from "@/components/ui/card";
import { ThemeToggle } from "@/components/ui/theme-toggle";

const features = [
  {
    icon: Table,
    title: "Table-Aware Ingestion",
    desc: "Detects tables, generates natural language descriptions, and preserves structured data.",
  },
  {
    icon: Search,
    title: "Multi-Step Agent",
    desc: "Classifies queries, iterates on retrieval, and extracts table values with precision.",
  },
  {
    icon: FileText,
    title: "Citations & Sources",
    desc: "Every answer references specific sections and page numbers from your documents.",
  },
  {
    icon: MessageSquare,
    title: "MCP Tools",
    desc: "Legal glossary with 50+ terms and optional web search integration.",
  },
  {
    icon: GitCompareArrows,
    title: "Document Comparison",
    desc: "Ask cross-document questions with per-document attribution.",
  },
  {
    icon: Shield,
    title: "Risk & Gap Analysis",
    desc: "Auto-generated summaries with risk flags and coverage matrix.",
  },
];

const steps = [
  { step: "01", text: "Upload a PDF — tables are detected and preserved" },
  { step: "02", text: "Document is classified, chunked, and embedded" },
  { step: "03", text: "Ask questions — the agent retrieves, reasons, and cites" },
  { step: "04", text: "View summaries, risk flags, and coverage gaps" },
];

// Landing page introducing the platform and linking to dashboard and chat.
export default function HomePage() {
  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border/40 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
          <div className="flex items-center gap-2">
            <Scale className="h-5 w-5 text-foreground" />
            <span className="text-sm font-semibold tracking-tight">Legal AI</span>
          </div>
          <div className="flex items-center gap-1">
            <Link
              href={"/login" as never}
              className="inline-flex h-9 items-center rounded-md px-3 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              Sign in
            </Link>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl px-6">
        {/* Hero */}
        <section className="pb-16 pt-20 md:pb-24 md:pt-32">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mb-4 inline-flex items-center rounded-full border border-border bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
              AI-Powered Legal Analysis
            </div>
            <h1 className="mb-4 text-4xl font-bold tracking-tight text-foreground sm:text-5xl md:text-6xl">
              Upload documents.
              <br />
              <span className="text-muted-foreground">Get cited answers.</span>
            </h1>
            <p className="mx-auto mb-8 max-w-2xl text-lg text-muted-foreground">
              Analyze insurance policies, leases, contracts, and NDAs with table-aware ingestion,
              multi-step reasoning, and cross-document comparison.
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <Link
                className="inline-flex h-10 items-center gap-2 rounded-md bg-primary px-5 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
                href="/dashboard"
              >
                Upload Documents
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                className="inline-flex h-10 items-center gap-2 rounded-md border border-input bg-background px-5 text-sm font-medium text-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                href={"/chat" as never}
              >
                Start Chatting
              </Link>
            </div>
          </div>
        </section>

        {/* How it works */}
        <section className="pb-16">
          <div className="mb-8 text-center">
            <h2 className="text-2xl font-semibold tracking-tight text-foreground">How it works</h2>
            <p className="mt-2 text-muted-foreground">From upload to insight in four steps.</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map((item) => (
              <Card key={item.step} className="relative">
                <span className="text-3xl font-bold text-muted-foreground/30">{item.step}</span>
                <p className="mt-2 text-sm text-foreground">{item.text}</p>
              </Card>
            ))}
          </div>
        </section>

        {/* Features */}
        <section className="pb-20" id="features">
          <div className="mb-8 text-center">
            <h2 className="text-2xl font-semibold tracking-tight text-foreground">Features</h2>
            <p className="mt-2 text-muted-foreground">
              Built for legal professionals who need precision and speed.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((item) => (
              <Card className="group" key={item.title}>
                <div className="mb-3 inline-flex h-9 w-9 items-center justify-center rounded-md bg-muted text-foreground transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                  <item.icon className="h-4 w-4" />
                </div>
                <h3 className="font-semibold text-foreground">{item.title}</h3>
                <p className="mt-1.5 text-sm text-muted-foreground">{item.desc}</p>
              </Card>
            ))}
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6 text-sm text-muted-foreground">
          <span>Legal Document Analysis Platform</span>
          <span>Built with Next.js, LangGraph & Gemini</span>
        </div>
      </footer>
    </div>
  );
}
