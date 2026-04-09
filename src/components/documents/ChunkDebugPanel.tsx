"use client";

import { useCallback, useEffect, useState } from "react";

import type { DocumentChunkRecord } from "@/types/document";

import { cn } from "@/lib/utils";

interface ChunkDebugPanelProps {
  documentId: string;
}

const CHUNK_TYPE_COLORS: Record<string, string> = {
  text: "bg-muted text-foreground",
  table: "bg-purple-100 text-purple-800",
  heading: "bg-yellow-100 text-yellow-800",
  list: "bg-green-100 text-green-800",
};

// This component displays all chunks for a document, with type badges and content preview.
export function ChunkDebugPanel({ documentId }: ChunkDebugPanelProps) {
  const [chunks, setChunks] = useState<DocumentChunkRecord[]>([]);
  const [chunkCount, setChunkCount] = useState(0);
  const [tableCount, setTableCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchChunks = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/documents/${documentId}`);
      if (!res.ok) {
        setError("Failed to load chunks.");
        return;
      }
      const data = await res.json();
      setChunks(data.chunks ?? []);
      setChunkCount(data.chunkCount ?? 0);
      setTableCount(data.tableCount ?? 0);
    } catch {
      setError("Failed to load chunks.");
    } finally {
      setLoading(false);
    }
  }, [documentId]);

  useEffect(() => {
    fetchChunks();
  }, [fetchChunks]);

  if (loading) {
    return (
      <div className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
        Loading chunks...
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-dashed border-rose-300 p-4 text-sm text-rose-600">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <span>{chunkCount} chunks</span>
        <span>{tableCount} tables</span>
      </div>
      <div className="max-h-96 space-y-2 overflow-y-auto">
        {chunks.map((chunk) => (
          <div key={chunk.id} className="rounded-lg border border-border bg-card-bg p-3 text-sm">
            <div className="mb-2 flex items-center gap-2">
              <span
                className={cn(
                  "inline-flex rounded-full px-2 py-0.5 text-xs font-medium",
                  CHUNK_TYPE_COLORS[chunk.chunk_type] ?? "bg-muted text-foreground",
                )}
              >
                {chunk.chunk_type}
              </span>
              <span className="text-xs text-muted-foreground">
                #{chunk.chunk_index} · Page {chunk.page_number ?? "?"}
              </span>
              {chunk.section_title && (
                <span className="text-xs text-muted-foreground">· {chunk.section_title}</span>
              )}
            </div>

            {chunk.chunk_type === "table" && "table_markdown" in (chunk.metadata ?? {}) && (
              <details className="mb-2">
                <summary className="cursor-pointer text-xs font-medium text-purple-700">
                  View table markdown
                </summary>
                <pre className="mt-1 max-h-40 overflow-auto rounded bg-muted p-2 text-xs">
                  {String(chunk.metadata.table_markdown)}
                </pre>
              </details>
            )}

            <p className="line-clamp-3 text-foreground">{chunk.content}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
