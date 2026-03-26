import { ChatPageClient } from "@/components/chat/ChatPageClient";

// Existing conversation chat page.
export default async function ConversationPage({
  params,
}: {
  params: Promise<{ conversationId: string }>;
}) {
  const { conversationId } = await params;
  return <ChatPageClient conversationId={conversationId} />;
}
