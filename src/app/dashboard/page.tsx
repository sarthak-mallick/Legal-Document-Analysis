import Link from "next/link";

import { DocumentSearch } from "@/components/documents/DocumentSearch";
import { UploadDashboard } from "@/components/documents/UploadDashboard";

// This page hosts the document upload dashboard and links to chat.
export default function DashboardPage() {
  return (
    <main className="mx-auto min-h-screen w-full max-w-6xl px-6 py-12">
      <div className="mb-8 flex items-start justify-between gap-4">
        <div className="space-y-3">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            Dashboard
          </p>
          <h1 className="font-serif text-4xl text-foreground">Document ingestion</h1>
          <p className="max-w-3xl text-muted-foreground">
            Upload a PDF to process it into chunks with embeddings. Then open the chat to ask
            questions about your documents.
          </p>
        </div>
        <Link
          className="inline-flex items-center justify-center rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm transition hover:bg-primary/90"
          href={"/chat" as never}
        >
          Open Chat
        </Link>
      </div>
      <DocumentSearch />
      <UploadDashboard />
    </main>
  );
}
