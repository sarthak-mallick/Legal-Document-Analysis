import Link from "next/link";
import { MessageSquare, Scale } from "lucide-react";

import { DocumentSearch } from "@/components/documents/DocumentSearch";
import { UploadDashboard } from "@/components/documents/UploadDashboard";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { UserMenu } from "@/components/ui/user-menu";

// This page hosts the document upload dashboard and links to chat.
export default function DashboardPage() {
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
            <span className="text-sm text-muted-foreground">Dashboard</span>
          </div>
          <div className="flex items-center gap-1">
            <Link
              className="inline-flex h-9 items-center gap-2 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
              href={"/chat" as never}
            >
              <MessageSquare className="h-3.5 w-3.5" />
              Open Chat
            </Link>
            <UserMenu />
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl px-6 py-8">
        <div className="mb-8 space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Documents</h1>
          <p className="text-sm text-muted-foreground">
            Upload PDFs to process into chunks with embeddings, then open chat to ask questions.
          </p>
        </div>
        <div className="space-y-6">
          <DocumentSearch />
          <UploadDashboard />
        </div>
      </main>
    </div>
  );
}
