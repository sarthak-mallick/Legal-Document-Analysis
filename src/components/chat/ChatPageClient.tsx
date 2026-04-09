"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { PanelLeft, Scale } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { UserMenu } from "@/components/ui/user-menu";

import { ChatWindow } from "@/components/chat/ChatWindow";
import { ConversationSidebar } from "@/components/chat/ConversationSidebar";
import { DocumentPreview } from "@/components/chat/DocumentPreview";
import { DocumentSelector } from "@/components/chat/DocumentSelector";
import type { Citation, ConversationRecord, MessageRecord } from "@/types/conversation";
import type { DocumentRecord } from "@/types/document";

interface ChatPageClientProps {
  conversationId: string | null;
}

// Client-side orchestrator for the chat page layout.
export function ChatPageClient({ conversationId }: ChatPageClientProps) {
  const router = useRouter();
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [selectedDocIds, setSelectedDocIds] = useState<string[]>([]);
  const [conversations, setConversations] = useState<ConversationRecord[]>([]);
  const [initialMessages, setInitialMessages] = useState<MessageRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [previewCitation, setPreviewCitation] = useState<Citation | null>(null);

  // Load documents and conversations on mount
  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [docsRes, convsRes] = await Promise.all([
          fetch("/api/documents", { cache: "no-store" }),
          fetch("/api/conversations", { cache: "no-store" }),
        ]);

        if (docsRes.ok) {
          const docsData = await docsRes.json();
          const readyDocs = (docsData.documents ?? []).filter(
            (d: DocumentRecord) => d.upload_status === "ready",
          );
          setDocuments(readyDocs);
        }

        if (convsRes.ok) {
          const convsData = await convsRes.json();
          setConversations(convsData.conversations ?? []);
        }
      } catch (error) {
        console.error("[chat] Failed to load data", error);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  // Load existing conversation messages + set document selection
  useEffect(() => {
    if (!conversationId) {
      setInitialMessages([]);
      return;
    }

    async function loadConversation() {
      try {
        const res = await fetch(`/api/conversations/${conversationId}`, { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        setInitialMessages(data.messages ?? []);
        if (data.conversation?.document_ids?.length) {
          setSelectedDocIds(data.conversation.document_ids);
        }
      } catch (error) {
        console.error("[chat] Failed to load conversation", error);
      }
    }
    loadConversation();
  }, [conversationId]);

  const handleDocToggle = useCallback((id: string) => {
    setSelectedDocIds((prev) => (prev.includes(id) ? prev.filter((d) => d !== id) : [...prev, id]));
  }, []);

  const handleConversationCreated = useCallback((newId: string) => {
    window.history.replaceState(null, "", `/chat/${newId}`);
    fetch("/api/conversations", { cache: "no-store" })
      .then((res) => res.json())
      .then((data) => setConversations(data.conversations ?? []))
      .catch(() => {});
  }, []);

  const handleDeleteConversation = useCallback(
    async (id: string) => {
      try {
        await fetch(`/api/conversations/${id}`, { method: "DELETE" });
        setConversations((prev) => prev.filter((c) => c.id !== id));
        if (id === conversationId) {
          (router as { push: (url: string) => void }).push("/chat");
        }
      } catch (error) {
        console.error("[chat] Failed to delete conversation", error);
      }
    },
    [conversationId, router],
  );

  const handleRenameConversation = useCallback(async (id: string, title: string) => {
    try {
      const res = await fetch(`/api/conversations/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title }),
      });
      if (res.ok) {
        setConversations((prev) => prev.map((c) => (c.id === id ? { ...c, title } : c)));
      }
    } catch (error) {
      console.error("[chat] Failed to rename conversation", error);
    }
  }, []);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center text-sm text-muted-foreground">
        Loading...
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col">
      {/* Header */}
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-border px-4">
        <div className="flex items-center gap-2">
          <Button
            className="md:hidden"
            onClick={() => setSidebarOpen(true)}
            variant="ghost"
            size="icon"
          >
            <PanelLeft className="h-4 w-4" />
          </Button>
          <Link href="/" className="flex items-center gap-2">
            <Scale className="h-5 w-5 text-foreground" />
            <span className="text-sm font-semibold tracking-tight">Legal AI</span>
          </Link>
          <span className="text-border">/</span>
          <span className="text-sm text-muted-foreground">Chat</span>
          {selectedDocIds.length === 0 && (
            <span className="ml-2 rounded-md bg-amber-500/10 px-2 py-0.5 text-xs text-amber-600 dark:text-amber-400">
              Select a document to start
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <Link
            href={"/dashboard" as never}
            className="inline-flex h-9 items-center rounded-md px-3 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            Dashboard
          </Link>
          <UserMenu />
          <ThemeToggle />
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Mobile sidebar overlay */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 z-30 bg-black/50 md:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Sidebar */}
        <aside
          className={`fixed inset-y-0 left-0 z-40 flex w-64 shrink-0 flex-col gap-6 overflow-y-auto border-r border-border bg-sidebar p-4 transition-transform md:static md:translate-x-0 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}
        >
          <div className="flex items-center justify-between md:hidden">
            <span className="text-sm font-medium">Menu</span>
            <Button onClick={() => setSidebarOpen(false)} variant="ghost" size="sm">
              Close
            </Button>
          </div>
          <DocumentSelector
            documents={documents}
            selectedIds={selectedDocIds}
            onToggle={handleDocToggle}
          />
          <ConversationSidebar
            conversations={conversations}
            activeId={conversationId}
            onDelete={handleDeleteConversation}
            onRename={handleRenameConversation}
          />
        </aside>

        {/* Chat area */}
        <main className="flex flex-1 flex-col overflow-hidden">
          <div className="flex flex-1 overflow-hidden">
            <div className="flex-1 overflow-hidden">
              <ChatWindow
                conversationId={conversationId}
                documentIds={selectedDocIds}
                initialMessages={initialMessages}
                onConversationCreated={handleConversationCreated}
                onCitationClick={setPreviewCitation}
              />
            </div>
            {previewCitation && (
              <DocumentPreview
                citation={previewCitation}
                onClose={() => setPreviewCitation(null)}
              />
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
