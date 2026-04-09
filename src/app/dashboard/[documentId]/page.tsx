"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

import { Card } from "@/components/ui/card";
import { ChunkDebugPanel } from "@/components/documents/ChunkDebugPanel";
import { DocumentSummaryPanel } from "@/components/summary/DocumentSummaryPanel";
import { ProcessingStatus } from "@/components/documents/ProcessingStatus";
import { Button } from "@/components/ui/button";
import type { DocumentRecord } from "@/types/document";

const DOC_TYPE_LABELS: Record<string, string> = {
  insurance_policy: "Insurance Policy",
  lease_agreement: "Lease Agreement",
  employment_contract: "Employment Contract",
  nda: "NDA",
  terms_of_service: "Terms of Service",
  other: "Other",
};

// Single document view with summary, risk flags, gap analysis, and chunk viewer.
export default function DocumentDetailPage() {
  const params = useParams<{ documentId: string }>();
  const [document, setDocument] = useState<DocumentRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [showChunks, setShowChunks] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/documents/${params.documentId}`, { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        setDocument(data.document);
      } catch {
        // Failed to load
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [params.documentId]);

  if (loading) {
    return (
      <main className="mx-auto min-h-screen w-full max-w-6xl px-6 py-12">
        <p className="text-sm text-muted-foreground">Loading document...</p>
      </main>
    );
  }

  if (!document) {
    return (
      <main className="mx-auto min-h-screen w-full max-w-6xl px-6 py-12">
        <p className="text-sm text-muted-foreground">Document not found.</p>
        <Link href={"/dashboard" as never} className="text-sm text-primary hover:underline">
          Back to Dashboard
        </Link>
      </main>
    );
  }

  const docTypeLabel =
    DOC_TYPE_LABELS[document.document_type ?? ""] ?? document.document_type ?? "Unknown";

  return (
    <main className="mx-auto min-h-screen w-full max-w-6xl px-6 py-12">
      <div className="mb-6">
        <Link href={"/dashboard" as never} className="text-sm text-primary hover:underline">
          Back to Dashboard
        </Link>
      </div>

      <Card className="mb-6 space-y-3">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="font-serif text-2xl text-foreground">{document.filename}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
              <span>{document.page_count ?? "?"} pages</span>
              <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800">
                {docTypeLabel}
              </span>
              <span>{new Date(document.created_at).toLocaleString()}</span>
            </div>
          </div>
          <ProcessingStatus status={document.upload_status} />
        </div>
      </Card>

      {document.upload_status === "ready" && (
        <>
          <DocumentSummaryPanel documentId={document.id} existingSummary={document.summary} />

          <div className="mt-8">
            <Button onClick={() => setShowChunks(!showChunks)} variant="ghost">
              {showChunks ? "Hide Chunks" : "View Document Chunks"}
            </Button>
            {showChunks && (
              <div className="mt-4">
                <ChunkDebugPanel documentId={document.id} />
              </div>
            )}
          </div>
        </>
      )}
    </main>
  );
}
