import { getLLM } from "@/lib/langchain/model";
import { SYSTEM_PROMPT } from "@/lib/agent/prompts/system";
import { buildSynthesisPrompt } from "@/lib/agent/prompts/synthesis";
import { retrieveChunks } from "@/lib/agent/tools/retriever-tool";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Citation, MessageRecord } from "@/types/conversation";

// Parse citation references from the assistant response text.
function extractCitations(
  text: string,
  chunks: { id: string; section_title: string | null; page_number: number | null; content: string }[],
): Citation[] {
  const citations: Citation[] = [];
  const seen = new Set<string>();

  // Match [Section: X, Page: Y] patterns
  const pattern = /\[Section:\s*([^,\]]+),\s*Page:\s*(\d+)\]/g;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(text)) !== null) {
    const sectionRef = match[1].trim();
    const pageRef = parseInt(match[2], 10);

    // Find the best matching chunk
    const matchingChunk = chunks.find(
      (c) =>
        (c.section_title?.toLowerCase().includes(sectionRef.toLowerCase()) ||
          sectionRef.toLowerCase().includes(c.section_title?.toLowerCase() ?? "")) &&
        c.page_number === pageRef,
    ) ?? chunks.find((c) => c.page_number === pageRef);

    if (matchingChunk && !seen.has(matchingChunk.id)) {
      seen.add(matchingChunk.id);
      citations.push({
        chunk_id: matchingChunk.id,
        section_title: matchingChunk.section_title,
        page_number: matchingChunk.page_number,
        snippet: matchingChunk.content.slice(0, 200),
      });
    }
  }

  // Also add all retrieved chunks that were used as context but not explicitly cited
  for (const chunk of chunks) {
    if (!seen.has(chunk.id)) {
      seen.add(chunk.id);
      citations.push({
        chunk_id: chunk.id,
        section_title: chunk.section_title,
        page_number: chunk.page_number,
        snippet: chunk.content.slice(0, 200),
      });
    }
  }

  return citations;
}

// Generate a short title for a new conversation from the first message.
async function generateTitle(message: string): Promise<string> {
  try {
    const llm = getLLM();
    const response = await llm.invoke([
      {
        role: "system",
        content: "Summarize this question in 5 words or less. Output only the summary, nothing else.",
      },
      { role: "user", content: message },
    ]);
    const title = typeof response.content === "string"
      ? response.content.trim()
      : String(response.content).trim();
    return title.slice(0, 100);
  } catch {
    return message.slice(0, 50);
  }
}

interface ChatRequestBody {
  message: string;
  conversationId?: string;
  documentIds: string[];
}

// Streaming chat endpoint that performs RAG and returns a streamed response.
export async function POST(request: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Authentication required." }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const body = (await request.json()) as ChatRequestBody;
    const { message, documentIds } = body;
    let { conversationId } = body;

    if (!message?.trim()) {
      return new Response(JSON.stringify({ error: "Message is required." }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (!documentIds?.length) {
      return new Response(JSON.stringify({ error: "At least one document must be selected." }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const admin = createSupabaseAdminClient();

    // Create or verify conversation
    if (!conversationId) {
      const title = await generateTitle(message);
      const { data: conversation, error: convError } = await admin
        .from("conversations")
        .insert({
          user_id: user.id,
          title,
          document_ids: documentIds,
        })
        .select("id")
        .single();

      if (convError || !conversation) {
        return new Response(JSON.stringify({ error: "Failed to create conversation." }), {
          status: 500,
          headers: { "Content-Type": "application/json" },
        });
      }

      conversationId = conversation.id;
    }

    // Save user message
    await admin.from("messages").insert({
      conversation_id: conversationId,
      role: "user",
      content: message,
      citations: [],
      tool_calls: [],
    });

    // Load conversation history (last 10 messages)
    const { data: historyRows } = await admin
      .from("messages")
      .select("id, conversation_id, role, content, citations, tool_calls, created_at")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true })
      .limit(10);

    const history = (historyRows ?? []) as MessageRecord[];
    // Exclude the current user message from history passed to the prompt
    const priorHistory = history.slice(0, -1);

    // Retrieve relevant chunks
    const chunks = await retrieveChunks(message, documentIds);

    // Build prompt and stream response
    const synthesisPrompt = buildSynthesisPrompt(message, chunks, priorHistory);
    const llm = getLLM();

    const stream = await llm.stream([
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: synthesisPrompt },
    ]);

    let fullResponse = "";

    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        try {
          // Send conversationId as the first chunk so the client knows which conversation
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: "meta", conversationId })}\n\n`),
          );

          for await (const chunk of stream) {
            const token = typeof chunk.content === "string"
              ? chunk.content
              : String(chunk.content);
            fullResponse += token;

            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ type: "token", content: token })}\n\n`),
            );
          }

          // Extract citations and save assistant message
          const citations = extractCitations(fullResponse, chunks);

          await admin.from("messages").insert({
            conversation_id: conversationId,
            role: "assistant",
            content: fullResponse,
            citations,
            tool_calls: [],
          });

          // Send citations at the end
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ type: "citations", citations })}\n\n`,
            ),
          );

          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        } catch (error) {
          console.error("[chat] Streaming error", error);
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ type: "error", content: "An error occurred while generating the response." })}\n\n`,
            ),
          );
          controller.close();
        }
      },
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("[chat] Unexpected error", error);
    return new Response(JSON.stringify({ error: "Chat request failed." }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
