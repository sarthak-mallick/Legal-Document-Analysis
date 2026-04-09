"use client";

import Link from "next/link";
import { useCallback, useState } from "react";

import { Button } from "@/components/ui/button";
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
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Conversations
        </p>
        <Link href={"/chat" as never} className="text-xs font-medium text-primary hover:underline">
          New
        </Link>
      </div>
      {conversations.length === 0 && (
        <p className="text-xs text-muted-foreground">No conversations yet.</p>
      )}
      {conversations.map((conv) => (
        <div
          key={conv.id}
          className={cn(
            "group flex items-center gap-1 rounded-lg px-3 py-2 text-sm transition",
            conv.id === activeId
              ? "bg-primary/10 font-medium text-primary"
              : "text-foreground hover:bg-muted",
          )}
        >
          {editingId === conv.id ? (
            <input
              className="flex-1 rounded border border-border bg-card-bg px-1.5 py-0.5 text-sm text-foreground outline-none focus:border-primary"
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
              <Link href={`/chat/${conv.id}` as never} className="flex-1 truncate">
                {conv.title ?? "Untitled"}
              </Link>
              <Button
                className="hidden text-xs text-muted-foreground hover:text-primary group-hover:inline-flex"
                onClick={(e) => {
                  e.preventDefault();
                  startEditing(conv);
                }}
                variant="ghost"
              >
                Rename
              </Button>
              <Button
                className="hidden text-xs text-muted-foreground hover:text-rose-600 group-hover:inline-flex"
                onClick={(e) => {
                  e.preventDefault();
                  onDelete(conv.id);
                }}
                variant="ghost"
              >
                Delete
              </Button>
            </>
          )}
        </div>
      ))}
    </div>
  );
}
