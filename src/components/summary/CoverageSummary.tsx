"use client";

import { AlertTriangle, Info, AlertCircle } from "lucide-react";

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

const SEVERITY_CONFIG: Record<
  string,
  { icon: typeof AlertTriangle; classes: string; badge: string }
> = {
  high: {
    icon: AlertCircle,
    classes: "border-destructive/20 bg-destructive/5",
    badge: "bg-destructive/10 text-destructive",
  },
  medium: {
    icon: AlertTriangle,
    classes: "border-amber-500/20 bg-amber-500/5",
    badge: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  },
  low: {
    icon: Info,
    classes: "border-blue-500/20 bg-blue-500/5",
    badge: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  },
};

// Visual display of auto-generated document summary with risk flags.
export function CoverageSummary({ summary, riskFlags }: CoverageSummaryProps) {
  return (
    <div className="space-y-6">
      <Card>
        <h3 className="mb-3 text-sm font-semibold text-foreground">Document Summary</h3>
        <div
          className="text-sm leading-relaxed text-foreground"
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
          <h3 className="text-sm font-medium text-muted-foreground">
            Risk Flags ({riskFlags.length})
          </h3>
          {riskFlags.map((flag, i) => {
            const config = SEVERITY_CONFIG[flag.severity] ?? SEVERITY_CONFIG.low;
            const Icon = config.icon;
            return (
              <div key={i} className={`rounded-lg border p-3 text-sm ${config.classes}`}>
                <div className="flex items-center gap-2">
                  <Icon className="h-3.5 w-3.5 shrink-0" />
                  <span className="font-medium text-foreground">{flag.title}</span>
                  <span
                    className={`rounded-md px-1.5 py-0.5 text-[10px] font-medium uppercase ${config.badge}`}
                  >
                    {flag.severity}
                  </span>
                </div>
                <p className="mt-1 text-muted-foreground">{flag.description}</p>
                {flag.section && (
                  <p className="mt-1 text-xs text-muted-foreground">Section: {flag.section}</p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
