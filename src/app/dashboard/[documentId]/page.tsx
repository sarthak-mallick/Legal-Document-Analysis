"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Scale } from "lucide-react";

import { Card } from "@/components/ui/card";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { UserMenu } from "@/components/ui/user-menu";
import { DocumentSummaryPanel } from "@/components/summary/DocumentSummaryPanel";
import { ProcessingStatus } from "@/components/documents/ProcessingStatus";
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

  const docTypeLabel = document
    ? (DOC_TYPE_LABELS[document.document_type ?? ""] ?? document.document_type ?? "Unknown")
    : "";

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-50 border-b border-border/40 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
          <div className="flex items-center gap-2">
            <Link href="/" className="flex items-center gap-2">
              <Scale className="h-5 w-5 text-foreground" />
              <span className="text-sm font-semibold tracking-tight">Legal AI</span>
            </Link>
            <span className="text-border">/</span>
            <Link
              href={"/dashboard" as never}
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              Dashboard
            </Link>
            {document && (
              <>
                <span className="text-border">/</span>
                <span className="max-w-[200px] truncate text-sm text-muted-foreground">
                  {document.filename}
                </span>
              </>
            )}
          </div>
          <div className="flex items-center gap-1">
            <UserMenu />
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl px-6 py-8">
        <Link
          href={"/dashboard" as never}
          className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Dashboard
        </Link>

        {loading && <p className="text-sm text-muted-foreground">Loading document...</p>}

        {!loading && !document && (
          <p className="text-sm text-muted-foreground">Document not found.</p>
        )}

        {!loading && document && (
          <>
            <Card className="mb-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h1 className="text-xl font-semibold tracking-tight">{document.filename}</h1>
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                    <span>{document.page_count ?? "?"} pages</span>
                    <span className="inline-flex rounded-md border border-border px-2 py-0.5 text-xs font-medium">
                      {docTypeLabel}
                    </span>
                    <span>{new Date(document.created_at).toLocaleString()}</span>
                  </div>
                </div>
                <ProcessingStatus status={document.upload_status} />
              </div>
            </Card>

            {document.upload_status === "ready" && (
              <DocumentSummaryPanel documentId={document.id} existingSummary={document.summary} />
            )}
          </>
        )}
      </main>
    </div>
  );
}
