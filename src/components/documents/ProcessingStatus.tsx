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
    <div className="flex flex-col gap-1">
      <span
        className={cn(
          "inline-flex rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em]",
          status === "ready" && "bg-emerald-100 text-emerald-800",
          isProcessing && "bg-amber-100 text-amber-900",
          status === "error" && "bg-rose-100 text-rose-900",
        )}
      >
        {STATUS_LABELS[status] ?? "Processing"}
      </span>
      {isProcessing && currentStep >= 0 && (
        <div className="flex gap-0.5">
          {STAGE_ORDER.map((stage, i) => (
            <div
              key={stage}
              className={cn(
                "h-1 flex-1 rounded-full",
                i <= currentStep ? "bg-amber-500" : "bg-slate-200 dark:bg-slate-700",
              )}
            />
          ))}
        </div>
      )}
    </div>
  );
}
