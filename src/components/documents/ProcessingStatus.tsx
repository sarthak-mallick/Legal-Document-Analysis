import type { UploadStatus } from "@/types/document";

import { cn } from "@/lib/utils";

const STATUS_LABELS: Record<UploadStatus, string> = {
  processing: "Processing",
  ready: "Ready",
  error: "Error",
};

// This component renders a compact status badge for a document row.
export function ProcessingStatus({ status }: { status: UploadStatus }) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em]",
        status === "ready" && "bg-emerald-100 text-emerald-800",
        status === "processing" && "bg-amber-100 text-amber-900",
        status === "error" && "bg-rose-100 text-rose-900",
      )}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}

