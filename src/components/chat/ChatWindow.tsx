"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { ChatInput } from "@/components/chat/ChatInput";
import { MessageBubble } from "@/components/chat/MessageBubble";
import { StreamingMessage } from "@/components/chat/StreamingMessage";
import type { ChatStreamEvent } from "@/types/api";
import type { Citation, MessageRecord } from "@/types/conversation";

interface ChatWindowProps {
  conversationId: string | null;
  documentIds: string[];
  initialMessages?: MessageRecord[];
  onConversationCreated?: (conversationId: string) => void;
  onCitationClick?: (citation: Citation) => void;
}

interface DisplayMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  citations?: Citation[];
}

// Main chat window with message history, streaming, and citation display.
export function ChatWindow({
  conversationId: initialConversationId,
  documentIds,
  initialMessages = [],
  onConversationCreated,
  onCitationClick,
}: ChatWindowProps) {
  const [messages, setMessages] = useState<DisplayMessage[]>(
    initialMessages.map((m) => ({
      id: m.id,
      role: m.role,
      content: m.content,
      citations: m.citations,
    })),
  );
  const [streamingContent, setStreamingContent] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [conversationId, setConversationId] = useState(initialConversationId);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Update messages when initialMessages change (e.g., loading existing conversation)
  useEffect(() => {
    setMessages(
      initialMessages.map((m) => ({
        id: m.id,
        role: m.role,
        content: m.content,
        citations: m.citations,
      })),
    );
  }, [initialMessages]);

  useEffect(() => {
    setConversationId(initialConversationId);
  }, [initialConversationId]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, streamingContent]);

  const handleSend = useCallback(
    async (message: string) => {
      if (isStreaming || documentIds.length === 0) return;

      // Add user message to display
      const userMsg: DisplayMessage = {
        id: `temp-user-${Date.now()}`,
        role: "user",
        content: message,
      };
      setMessages((prev) => [...prev, userMsg]);
      setIsStreaming(true);
      setStreamingContent("");

      try {
        const response = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message,
            conversationId,
            documentIds,
          }),
        });

        if (!response.ok || !response.body) {
          throw new Error("Chat request failed");
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let accumulated = "";
        let finalCitations: Citation[] = [];

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const text = decoder.decode(value, { stream: true });
          const lines = text.split("\n");

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const data = line.slice(6).trim();
            if (data === "[DONE]") continue;

            try {
              const event = JSON.parse(data) as ChatStreamEvent;

              if (event.type === "meta") {
                if (!conversationId) {
                  setConversationId(event.conversationId);
                  onConversationCreated?.(event.conversationId);
                }
              } else if (event.type === "token") {
                accumulated += event.content;
                setStreamingContent(accumulated);
              } else if (event.type === "citations") {
                finalCitations = event.citations;
              } else if (event.type === "error") {
                accumulated += `\n\n${event.content}`;
                setStreamingContent(accumulated);
              }
            } catch {
              // Skip malformed SSE events
            }
          }
        }

        // Finalize the assistant message
        setMessages((prev) => [
          ...prev,
          {
            id: `msg-${Date.now()}`,
            role: "assistant",
            content: accumulated,
            citations: finalCitations,
          },
        ]);
      } catch (error) {
        console.error("[chat] Failed to send message", error);
        setMessages((prev) => [
          ...prev,
          {
            id: `error-${Date.now()}`,
            role: "assistant",
            content: "Sorry, an error occurred. Please try again.",
          },
        ]);
      } finally {
        setIsStreaming(false);
        setStreamingContent("");
      }
    },
    [isStreaming, conversationId, documentIds, onConversationCreated],
  );

  return (
    <div className="flex h-full flex-col">
      <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto p-4">
        {messages.length === 0 && !isStreaming && (
          <div className="flex h-full items-center justify-center">
            <p className="text-sm text-slate-400">Ask a question about your selected document.</p>
          </div>
        )}
        {messages.map((msg) => (
          <MessageBubble
            citations={msg.citations}
            content={msg.content}
            key={msg.id}
            role={msg.role}
            onCitationClick={onCitationClick}
          />
        ))}
        {isStreaming && <StreamingMessage content={streamingContent} />}
      </div>
      <ChatInput disabled={isStreaming || documentIds.length === 0} onSend={handleSend} />
    </div>
  );
}
