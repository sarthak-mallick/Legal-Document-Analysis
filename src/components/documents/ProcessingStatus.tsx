import { CheckCircle2, AlertCircle, Loader2 } from "lucide-react";

import type { UploadStatus } from "@/types/document";

import { cn } from "@/lib/utils";

const STATUS_LABELS: Record<UploadStatus, string> = {
  processing: "Processing",
  parsing: "Parsing PDF",
  extracting_tables: "Extracting Tables",
  chunking: "Chunking",
  embedding: "Embedding",
  ready: "Ready",
  error: "Error",
};

const STAGE_ORDER: UploadStatus[] = ["parsing", "extracting_tables", "chunking", "embedding"];

// This component renders a status badge with step progress for processing documents.
export function ProcessingStatus({ status }: { status: UploadStatus }) {
  const isProcessing = status !== "ready" && status !== "error";
  const currentStep = STAGE_ORDER.indexOf(status);

  return (
    <div className="flex flex-col items-end gap-1">
      <span
        className={cn(
          "inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium",
          status === "ready" && "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
          isProcessing && "bg-amber-500/10 text-amber-600 dark:text-amber-400",
          status === "error" && "bg-destructive/10 text-destructive",
        )}
      >
        {status === "ready" && <CheckCircle2 className="h-3 w-3" />}
        {isProcessing && <Loader2 className="h-3 w-3 animate-spin" />}
        {status === "error" && <AlertCircle className="h-3 w-3" />}
        {STATUS_LABELS[status] ?? "Processing"}
      </span>
      {isProcessing && currentStep >= 0 && (
        <div className="flex gap-0.5">
          {STAGE_ORDER.map((stage, i) => (
            <div
              key={stage}
              className={cn("h-1 w-6 rounded-full", i <= currentStep ? "bg-amber-500" : "bg-muted")}
            />
          ))}
        </div>
      )}
    </div>
  );
}
