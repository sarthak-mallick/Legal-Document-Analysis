"use client";

import { useCallback, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { DocumentCardSkeleton } from "@/components/ui/skeleton";
import { DocumentList } from "@/components/documents/DocumentList";
import { UploadDropzone } from "@/components/documents/UploadDropzone";
import { Card } from "@/components/ui/card";
import type { DocumentsResponse, ErrorResponse, UploadResponse } from "@/types/api";
import type { DocumentRecord } from "@/types/document";

// This component coordinates document loading, uploads, selection, and deletes on the dashboard.
export function UploadDashboard() {
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  useEffect(() => {
    void loadDocuments();
  }, []);

  async function loadDocuments() {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const response = await fetch("/api/documents", { cache: "no-store" });
      const payload = (await response.json()) as DocumentsResponse | ErrorResponse;

      if (!response.ok || !("documents" in payload)) {
        throw new Error("error" in payload ? payload.error : "Failed to load documents");
      }

      setDocuments(payload.documents);
    } catch (error) {
      console.error("[dashboard] Failed to load documents", error);
      setErrorMessage(error instanceof Error ? error.message : "Failed to load documents");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleUpload(file: File) {
    setIsUploading(true);
    setErrorMessage(null);
    setStatusMessage("Uploading and processing document...");

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/upload", {
        body: formData,
        method: "POST",
      });
      const payload = (await response.json()) as UploadResponse | ErrorResponse;

      if (!response.ok || !("documentId" in payload)) {
        throw new Error("error" in payload ? payload.error : "Upload failed");
      }

      setStatusMessage(`Document ${payload.documentId} accepted for processing.`);
      await loadDocuments();
    } catch (error) {
      console.error("[dashboard] Upload failed", error);
      setErrorMessage(error instanceof Error ? error.message : "Upload failed");
      setStatusMessage(null);
    } finally {
      setIsUploading(false);
    }
  }

  async function handleDelete(documentId: string) {
    setDeletingId(documentId);
    setErrorMessage(null);

    try {
      const response = await fetch(`/api/documents/${documentId}`, {
        method: "DELETE",
      });
      const payload = (await response.json()) as { ok?: boolean } | ErrorResponse;

      if (!response.ok || ("error" in payload && payload.error)) {
        throw new Error("error" in payload ? payload.error : "Delete failed");
      }

      setDocuments((prev) => prev.filter((d) => d.id !== documentId));
      setSelectedIds((prev) => prev.filter((id) => id !== documentId));
    } catch (error) {
      console.error("[dashboard] Delete failed", error);
      setErrorMessage(error instanceof Error ? error.message : "Delete failed");
    } finally {
      setDeletingId(null);
    }
  }

  async function handleBatchDelete() {
    if (selectedIds.length === 0) return;
    setErrorMessage(null);

    for (const id of selectedIds) {
      try {
        await fetch(`/api/documents/${id}`, { method: "DELETE" });
      } catch {
        // Continue deleting remaining
      }
    }

    setDocuments((prev) => prev.filter((d) => !selectedIds.includes(d.id)));
    setSelectedIds([]);
  }

  const handleSelect = useCallback((id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id],
    );
  }, []);

  return (
    <div className="space-y-6">
      <UploadDropzone isUploading={isUploading} onUpload={handleUpload} />
      {(errorMessage || statusMessage) && (
        <Card className="space-y-2">
          {statusMessage && <p className="text-sm text-slate-700">{statusMessage}</p>}
          {errorMessage && <p className="text-sm text-rose-700">{errorMessage}</p>}
        </Card>
      )}
      {selectedIds.length > 0 && (
        <div className="flex items-center gap-3 text-sm">
          <span className="text-slate-600">{selectedIds.length} selected</span>
          <Button
            onClick={handleBatchDelete}
            variant="destructive"
          >
            Delete Selected
          </Button>
          <Button
            onClick={() => setSelectedIds([])}
            variant="ghost"
          >
            Clear Selection
          </Button>
        </div>
      )}
      {isLoading ? (
        <div className="space-y-4">
          <DocumentCardSkeleton />
          <DocumentCardSkeleton />
        </div>
      ) : (
        <DocumentList
          deletingId={deletingId}
          documents={documents}
          selectedIds={selectedIds}
          onDelete={handleDelete}
          onSelect={handleSelect}
        />
      )}
    </div>
  );
}
