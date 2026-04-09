"use client";

import { useCallback, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { CoverageSummary } from "@/components/summary/CoverageSummary";
import { GapAnalysis } from "@/components/summary/GapAnalysis";

interface RiskFlag {
  title: string;
  description: string;
  severity: "high" | "medium" | "low";
  section: string | null;
}

interface GapItem {
  category: string;
  status: "covered" | "not_covered" | "partial";
  details: string | null;
}

interface DocumentSummaryPanelProps {
  documentId: string;
  existingSummary: string | null;
}

// Panel that displays or generates the document summary, risk flags, and gap analysis.
export function DocumentSummaryPanel({ documentId, existingSummary }: DocumentSummaryPanelProps) {
  const [summary, setSummary] = useState<string | null>(existingSummary);
  const [riskFlags, setRiskFlags] = useState<RiskFlag[]>([]);
  const [gapAnalysis, setGapAnalysis] = useState<GapItem[]>([]);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // If there's already a summary, we don't have risk/gap data cached,
  // so we still show the generate button to get the full analysis
  const hasFullAnalysis = summary && riskFlags.length > 0;

  const handleGenerate = useCallback(async () => {
    setGenerating(true);
    setError(null);

    try {
      const res = await fetch(`/api/summary/${documentId}`, {
        method: "POST",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Generation failed");
      }

      const data = await res.json();
      setSummary(data.summary);
      setRiskFlags(data.riskFlags ?? []);
      setGapAnalysis(data.gapAnalysis ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate summary");
    } finally {
      setGenerating(false);
    }
  }, [documentId]);

  // Fetch persisted risk flags and gap analysis when a summary already exists
  useEffect(() => {
    if (!existingSummary) return;
    setSummary(existingSummary);

    async function fetchAnalysis() {
      try {
        const res = await fetch(`/api/summary/${documentId}`);
        if (!res.ok) return;
        const data = await res.json();
        setRiskFlags(data.riskFlags ?? []);
        setGapAnalysis(data.gapAnalysis ?? []);
      } catch {
        // Silently fail — user can regenerate
      }
    }
    fetchAnalysis();
  }, [existingSummary, documentId]);

  return (
    <div className="space-y-6">
      {!hasFullAnalysis && (
        <div className="flex items-center gap-3">
          <Button onClick={handleGenerate} disabled={generating}>
            {generating
              ? "Generating analysis..."
              : summary
                ? "Regenerate Full Analysis"
                : "Generate Summary & Analysis"}
          </Button>
          {error && <p className="text-sm text-rose-600">{error}</p>}
        </div>
      )}

      {summary && <CoverageSummary summary={summary} riskFlags={riskFlags} />}
      {gapAnalysis.length > 0 && <GapAnalysis items={gapAnalysis} />}

      {hasFullAnalysis && (
        <div className="flex items-center gap-2">
          <Button onClick={handleGenerate} disabled={generating} variant="ghost">
            {generating ? "Regenerating..." : "Regenerate Analysis"}
          </Button>
          <Button
            variant="ghost"
            onClick={() => {
              const lines = ["# Document Summary\n", summary, ""];
              if (riskFlags.length > 0) {
                lines.push("## Risk Flags\n");
                riskFlags.forEach((f) =>
                  lines.push(`- **[${f.severity.toUpperCase()}]** ${f.title}: ${f.description}`),
                );
                lines.push("");
              }
              if (gapAnalysis.length > 0) {
                lines.push("## Gap Analysis\n");
                gapAnalysis.forEach((g) => {
                  const icon = g.status === "covered" ? "+" : g.status === "partial" ? "~" : "-";
                  lines.push(`- [${icon}] ${g.category}: ${g.details ?? g.status}`);
                });
              }
              const blob = new Blob([lines.join("\n")], { type: "text/markdown" });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = "document-analysis.md";
              a.click();
              URL.revokeObjectURL(url);
            }}
          >
            Download Report
          </Button>
        </div>
      )}
    </div>
  );
}
