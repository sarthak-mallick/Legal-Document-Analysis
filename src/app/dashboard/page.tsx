import { UploadDashboard } from "@/components/documents/UploadDashboard";

// This page hosts the Week 1 upload dashboard experience.
export default function DashboardPage() {
  return (
    <main className="mx-auto min-h-screen w-full max-w-6xl px-6 py-12">
      <div className="mb-8 space-y-3">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
          Dashboard
        </p>
        <h1 className="font-serif text-4xl text-foreground">Document ingestion</h1>
        <p className="max-w-3xl text-slate-600">
          Upload a PDF to run the Week 1 ingestion pipeline. The API validates the file,
          extracts text, splits it into chunks, creates embeddings, and stores the result.
        </p>
      </div>
      <UploadDashboard />
    </main>
  );
}

