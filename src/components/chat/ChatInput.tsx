"use client";

import { useRef, type KeyboardEvent } from "react";

import { Button } from "@/components/ui/button";

interface ChatInputProps {
  disabled: boolean;
  onSend: (message: string) => void;
}

// Text input area with send button and Enter key shortcut.
export function ChatInput({ disabled, onSend }: ChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  function handleSend() {
    const value = textareaRef.current?.value.trim();
    if (!value) return;
    onSend(value);
    if (textareaRef.current) {
      textareaRef.current.value = "";
      textareaRef.current.style.height = "auto";
    }
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  function handleInput() {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = `${Math.min(textarea.scrollHeight, 160)}px`;
    }
  }

  return (
    <div className="flex items-end gap-2 border-t border-slate-200 bg-white p-4">
      <textarea
        ref={textareaRef}
        className="flex-1 resize-none rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none placeholder:text-slate-400 focus:border-primary focus:ring-1 focus:ring-primary"
        disabled={disabled}
        onInput={handleInput}
        onKeyDown={handleKeyDown}
        placeholder="Ask a question about your document..."
        rows={1}
      />
      <Button disabled={disabled} onClick={handleSend}>
        Send
      </Button>
    </div>
  );
}
