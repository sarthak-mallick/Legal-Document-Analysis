import { getLLM } from "@/lib/langchain/model";
import { getNumberEnv } from "@/lib/env";
import { getUserId } from "@/lib/auth";
import { buildAgentGraph } from "@/lib/agent/graph";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { chatRequestSchema } from "@/lib/validations/chat";
import { parseBody } from "@/lib/validations";
import type { MessageRecord } from "@/types/conversation";

const CONVERSATION_HISTORY_LIMIT = getNumberEnv("CONVERSATION_HISTORY_LIMIT", 10);

// Generate a short title for a new conversation from the first message.
async function generateTitle(message: string): Promise<string> {
  try {
    const llm = getLLM();
    const response = await llm.invoke([
      {
        role: "system",
        content:
          "Summarize this question in 5 words or less. Output only the summary, nothing else.",
      },
      { role: "user", content: message },
    ]);
    const title =
      typeof response.content === "string"
        ? response.content.trim()
        : String(response.content).trim();
    return title.slice(0, 100);
  } catch {
    return message.slice(0, 50);
  }
}

// Streaming chat endpoint powered by the LangGraph agent.
export async function POST(request: Request) {
  try {
    const userId = await getUserId();
    if (!userId) {
      return new Response(JSON.stringify({ error: "Authentication required." }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const rawBody = await request.json();
    const parsed = parseBody(chatRequestSchema, rawBody);
    if (!parsed.success) return parsed.response;

    const { message, documentIds } = parsed.data;
    let { conversationId } = parsed.data;

    const admin = createSupabaseAdminClient();

    // Create or verify conversation
    if (!conversationId) {
      const title = await generateTitle(message);
      const { data: conversation, error: convError } = await admin
        .from("conversations")
        .insert({
          user_id: userId,
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
      .limit(CONVERSATION_HISTORY_LIMIT);

    const history = (historyRows ?? []) as MessageRecord[];
    const priorHistory = history.slice(0, -1);

    // Fetch document metadata for adaptive prompts and cross-doc attribution
    const { data: docRows } = await admin
      .from("documents")
      .select("id, filename, document_type")
      .in("id", documentIds);

    const documentMetas = (docRows ?? []).map((d) => ({
      id: d.id as string,
      filename: d.filename as string,
      documentType: (d.document_type as string) ?? null,
    }));

    // Run the LangGraph agent
    const agent = buildAgentGraph();
    const result = await agent.invoke({
      query: message,
      queryType: "simple_factual",
      documentIds,
      documentMetas,
      conversationHistory: priorHistory,
    });

    const agentResponse = result.response ?? "I was unable to generate a response.";
    const citations = result.citations ?? [];
    const nodesVisited = result.nodesVisited ?? [];
    const toolResults = (result.toolResults ?? []).map(
      (r: { tool: string; input: Record<string, unknown> }) => ({
        tool: r.tool,
        input: r.input,
      }),
    );

    // Save assistant message with agent execution trace
    await admin.from("messages").insert({
      conversation_id: conversationId,
      role: "assistant",
      content: agentResponse,
      citations,
      tool_calls: [
        {
          type: "agent_trace",
          nodesVisited,
          queryType: result.queryType,
          retrievalAttempts: result.retrievalAttempts,
          chunkCount: result.retrievedChunks?.length ?? 0,
          hasTableData: !!result.tableData,
          toolsCalled: result.toolsCalled ?? false,
          toolResults,
          contextSufficient: result.contextSufficient,
          tokenUsage: result.tokenUsage ?? { promptTokens: 0, completionTokens: 0 },
        },
      ],
    });

    // Stream the response to the client using SSE
    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      start(controller) {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ type: "meta", conversationId })}\n\n`),
        );

        const chunkSize = 20;
        for (let i = 0; i < agentResponse.length; i += chunkSize) {
          const token = agentResponse.slice(i, i + chunkSize);
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: "token", content: token })}\n\n`),
          );
        }

        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({
              type: "agent_debug",
              nodesVisited,
              queryType: result.queryType,
              retrievalAttempts: result.retrievalAttempts,
              chunkCount: result.retrievedChunks?.length ?? 0,
            })}\n\n`,
          ),
        );

        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ type: "citations", citations })}\n\n`),
        );

        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
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
