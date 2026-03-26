"use client";

import Link from "next/link";

import { Button } from "@/components/ui/button";
import type { ConversationRecord } from "@/types/conversation";

import { cn } from "@/lib/utils";

interface ConversationSidebarProps {
  conversations: ConversationRecord[];
  activeId: string | null;
  onDelete: (id: string) => void;
}

// Sidebar listing previous conversations with delete option.
export function ConversationSidebar({
  conversations,
  activeId,
  onDelete,
}: ConversationSidebarProps) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
          Conversations
        </p>
        <Link
          href={"/chat" as never}
          className="text-xs font-medium text-primary hover:underline"
        >
          New
        </Link>
      </div>
      {conversations.length === 0 && (
        <p className="text-xs text-slate-400">No conversations yet.</p>
      )}
      {conversations.map((conv) => (
        <div
          key={conv.id}
          className={cn(
            "group flex items-center gap-1 rounded-lg px-3 py-2 text-sm transition",
            conv.id === activeId
              ? "bg-primary/10 font-medium text-primary"
              : "text-slate-600 hover:bg-slate-100",
          )}
        >
          <Link href={`/chat/${conv.id}` as never} className="flex-1 truncate">
            {conv.title ?? "Untitled"}
          </Link>
          <Button
            className="hidden text-xs text-slate-400 hover:text-rose-600 group-hover:inline-flex"
            onClick={(e) => {
              e.preventDefault();
              onDelete(conv.id);
            }}
            variant="ghost"
          >
            Delete
          </Button>
        </div>
      ))}
    </div>
  );
}
