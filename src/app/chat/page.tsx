import { ChatPageClient } from "@/components/chat/ChatPageClient";

// New chat page — no conversation loaded.
export default function ChatPage() {
  return <ChatPageClient conversationId={null} />;
}
