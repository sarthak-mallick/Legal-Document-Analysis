"use client";

import { cn } from "@/lib/utils";

interface GapItem {
  category: string;
  status: "covered" | "not_covered" | "partial";
  details: string | null;
}

interface GapAnalysisProps {
  items: GapItem[];
}

const STATUS_STYLES: Record<string, { bg: string; label: string }> = {
  covered: { bg: "bg-emerald-500", label: "Covered" },
  not_covered: { bg: "bg-rose-500", label: "Not Covered" },
  partial: { bg: "bg-amber-500", label: "Partial" },
};

// Coverage matrix showing which categories are covered, missing, or partial.
export function GapAnalysis({ items }: GapAnalysisProps) {
  if (items.length === 0) return null;

  const covered = items.filter((i) => i.status === "covered").length;
  const partial = items.filter((i) => i.status === "partial").length;
  const missing = items.filter((i) => i.status === "not_covered").length;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Coverage Analysis
        </h3>
        <div className="flex gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-emerald-500" />
            {covered} covered
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-amber-500" />
            {partial} partial
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-rose-500" />
            {missing} missing
          </span>
        </div>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        {items.map((item, i) => {
          const style = STATUS_STYLES[item.status] ?? STATUS_STYLES.not_covered;
          return (
            <div
              key={i}
              className="flex items-start gap-3 rounded-lg border border-border bg-card p-3 text-sm"
            >
              <span className={cn("mt-0.5 inline-block h-3 w-3 shrink-0 rounded-full", style.bg)} />
              <div className="min-w-0">
                <p className="font-medium text-foreground">{item.category}</p>
                <p className="text-xs text-muted-foreground">
                  {style.label}
                  {item.details && ` — ${item.details}`}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
