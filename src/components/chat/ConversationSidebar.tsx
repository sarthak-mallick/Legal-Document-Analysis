"use client";

import Link from "next/link";
import { useCallback, useState } from "react";
import { MessageSquare, Pencil, Trash2, Plus } from "lucide-react";

import type { ConversationRecord } from "@/types/conversation";

import { cn } from "@/lib/utils";

interface ConversationSidebarProps {
  conversations: ConversationRecord[];
  activeId: string | null;
  onDelete: (id: string) => void;
  onRename: (id: string, title: string) => void;
}

// Sidebar listing previous conversations with rename and delete options.
export function ConversationSidebar({
  conversations,
  activeId,
  onDelete,
  onRename,
}: ConversationSidebarProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

  const startEditing = useCallback((conv: ConversationRecord) => {
    setEditingId(conv.id);
    setEditValue(conv.title ?? "");
  }, []);

  const commitRename = useCallback(() => {
    if (editingId && editValue.trim()) {
      onRename(editingId, editValue.trim());
    }
    setEditingId(null);
  }, [editingId, editValue, onRename]);

  const cancelEditing = useCallback(() => {
    setEditingId(null);
  }, []);

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-muted-foreground">Conversations</p>
        <Link
          href={"/chat" as never}
          className="inline-flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
        >
          <Plus className="h-3.5 w-3.5" />
        </Link>
      </div>
      {conversations.length === 0 && (
        <p className="px-2 text-xs text-muted-foreground">No conversations yet.</p>
      )}
      {conversations.map((conv) => (
        <div
          key={conv.id}
          className={cn(
            "group flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors",
            conv.id === activeId
              ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
              : "text-sidebar-foreground hover:bg-sidebar-accent/50",
          )}
        >
          {editingId === conv.id ? (
            <input
              className="flex-1 rounded-md border border-input bg-background px-2 py-0.5 text-sm text-foreground outline-none focus-visible:ring-1 focus-visible:ring-ring"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") commitRename();
                if (e.key === "Escape") cancelEditing();
              }}
              onBlur={commitRename}
              autoFocus
            />
          ) : (
            <>
              <MessageSquare className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              <Link href={`/chat/${conv.id}` as never} className="min-w-0 flex-1 truncate">
                {conv.title ?? "Untitled"}
              </Link>
              <button
                className="hidden h-6 w-6 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:text-foreground group-hover:inline-flex"
                onClick={(e) => {
                  e.preventDefault();
                  startEditing(conv);
                }}
                type="button"
              >
                <Pencil className="h-3 w-3" />
              </button>
              <button
                className="hidden h-6 w-6 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:text-destructive group-hover:inline-flex"
                onClick={(e) => {
                  e.preventDefault();
                  onDelete(conv.id);
                }}
                type="button"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </>
          )}
        </div>
      ))}
    </div>
  );
}
