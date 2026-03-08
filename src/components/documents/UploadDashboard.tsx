"use client";

import { useEffect, useState } from "react";

import { DocumentList } from "@/components/documents/DocumentList";
import { UploadDropzone } from "@/components/documents/UploadDropzone";
import { Card } from "@/components/ui/card";
import type { DocumentsResponse, ErrorResponse, UploadResponse } from "@/types/api";
import type { DocumentRecord } from "@/types/document";

// This component coordinates document loading, uploads, and deletes on the dashboard.
export function UploadDashboard() {
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  useEffect(() => {
    void loadDocuments();
  }, []);

  // This helper loads the current document list from the API.
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

  // This handler sends a selected PDF to the upload endpoint and refreshes the list.
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

  // This handler deletes a document and refreshes the dashboard list.
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

      setDocuments((currentDocuments) =>
        currentDocuments.filter((document) => document.id !== documentId),
      );
    } catch (error) {
      console.error("[dashboard] Delete failed", error);
      setErrorMessage(error instanceof Error ? error.message : "Delete failed");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="space-y-6">
      <UploadDropzone isUploading={isUploading} onUpload={handleUpload} />
      {(errorMessage || statusMessage) && (
        <Card className="space-y-2">
          {statusMessage && <p className="text-sm text-slate-700">{statusMessage}</p>}
          {errorMessage && <p className="text-sm text-rose-700">{errorMessage}</p>}
        </Card>
      )}
      {isLoading ? (
        <Card>
          <p className="text-sm text-slate-600">Loading documents...</p>
        </Card>
      ) : (
        <DocumentList deletingId={deletingId} documents={documents} onDelete={handleDelete} />
      )}
    </div>
  );
}
