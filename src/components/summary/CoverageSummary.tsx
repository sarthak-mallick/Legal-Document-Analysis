"use client";

import { Card } from "@/components/ui/card";

interface RiskFlag {
  title: string;
  description: string;
  severity: "high" | "medium" | "low";
  section: string | null;
}

interface CoverageSummaryProps {
  summary: string;
  riskFlags: RiskFlag[];
}

const SEVERITY_STYLES: Record<string, string> = {
  high: "bg-rose-100 text-rose-800 border-rose-200",
  medium: "bg-amber-100 text-amber-800 border-amber-200",
  low: "bg-blue-100 text-blue-800 border-blue-200",
};

// Visual display of auto-generated document summary with risk flags.
export function CoverageSummary({ summary, riskFlags }: CoverageSummaryProps) {
  return (
    <div className="space-y-6">
      <Card className="prose prose-sm max-w-none">
        <h3 className="text-base font-semibold text-foreground">Document Summary</h3>
        <div
          className="text-sm text-slate-700"
          dangerouslySetInnerHTML={{
            __html: summary
              .replace(/\n/g, "<br/>")
              .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
              .replace(/- (.+?)(?=<br|$)/g, "<li>$1</li>"),
          }}
        />
      </Card>

      {riskFlags.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-500">
            Risk Flags ({riskFlags.length})
          </h3>
          {riskFlags.map((flag, i) => (
            <div
              key={i}
              className={`rounded-lg border p-3 text-sm ${SEVERITY_STYLES[flag.severity] ?? SEVERITY_STYLES.low}`}
            >
              <div className="flex items-center gap-2">
                <span className="font-semibold">{flag.title}</span>
                <span className="rounded-full px-2 py-0.5 text-[10px] font-medium uppercase">
                  {flag.severity}
                </span>
              </div>
              <p className="mt-1 opacity-80">{flag.description}</p>
              {flag.section && (
                <p className="mt-1 text-xs opacity-60">Section: {flag.section}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
