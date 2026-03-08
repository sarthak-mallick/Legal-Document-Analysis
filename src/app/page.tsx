import Link from "next/link";

import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

// This page introduces the Week 1 product scaffold and links into the dashboard.
export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col justify-center px-6 py-16">
      <div className="grid gap-8 lg:grid-cols-[1.3fr_0.9fr]">
        <section className="space-y-8">
          <div className="space-y-4">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-500">
              Week 1 Scaffold
            </p>
            <h1 className="max-w-3xl font-serif text-5xl leading-tight text-foreground sm:text-6xl">
              Ingest legal PDFs now, layer agentic analysis on top next.
            </h1>
            <p className="max-w-2xl text-lg text-slate-600">
              This initial build sets up upload, parsing, chunking, embeddings, and
              Supabase storage so later weeks can focus on retrieval and reasoning.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              className={cn(
                "inline-flex items-center justify-center rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm transition hover:bg-primary/90",
              )}
              href="/dashboard"
            >
              Open dashboard
            </Link>
            <a
              className={cn(
                "inline-flex items-center justify-center rounded-full bg-secondary px-4 py-2 text-sm font-medium text-secondary-foreground transition hover:bg-secondary/80",
              )}
              href="#week-one"
            >
              See Week 1 scope
            </a>
          </div>
        </section>
        <Card className="space-y-4 bg-parchment">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
            Architecture
          </p>
          <div className="space-y-3 text-sm text-slate-700">
            <p>Next.js App Router frontend</p>
            <p>Streaming-ready API routes</p>
            <p>Supabase Postgres + pgvector storage</p>
            <p>Gemini embeddings via LangChain</p>
            <p>Week 2 onward: table-aware ingestion and LangGraph orchestration</p>
          </div>
        </Card>
      </div>
      <section className="mt-20 grid gap-4 md:grid-cols-3" id="week-one">
        {[
          "Project initialization and shared configuration",
          "Supabase/LangChain ingestion pipeline foundation",
          "Upload API and dashboard for PDF processing",
        ].map((item) => (
          <Card className="min-h-40" key={item}>
            <p className="font-serif text-2xl text-foreground">{item}</p>
          </Card>
        ))}
      </section>
    </main>
  );
}
