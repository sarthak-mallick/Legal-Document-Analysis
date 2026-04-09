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

    // Load conversation history and document metadata in parallel
    const [{ data: historyRows }, { data: docRows }] = await Promise.all([
      admin
        .from("messages")
        .select("id, conversation_id, role, content, citations, tool_calls, created_at")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true })
        .limit(CONVERSATION_HISTORY_LIMIT),
      admin.from("documents").select("id, filename, document_type").in("id", documentIds),
    ]);

    const history = (historyRows ?? []) as MessageRecord[];
    const priorHistory = history.slice(0, -1);

    const documentMetas = (docRows ?? []).map((d) => ({
      id: d.id as string,
      filename: d.filename as string,
      documentType: (d.document_type as string) ?? null,
    }));

    // Stream the response to the client using SSE with real LLM token streaming
    const agent = buildAgentGraph();
    const encoder = new TextEncoder();
    const { readable, writable } = new TransformStream();
    const writer = writable.getWriter();

    // Process agent events in the background while streaming to client
    const streamPromise = (async () => {
      let fullResponse = "";
      let citations: Record<string, unknown>[] = [];
      let nodesVisited: string[] = [];
      let finalState: Record<string, unknown> = {};

      try {
        await writer.write(
          encoder.encode(`data: ${JSON.stringify({ type: "meta", conversationId })}\n\n`),
        );

        const eventStream = agent.streamEvents(
          {
            query: message,
            queryType: "simple_factual",
            documentIds,
            documentMetas,
            conversationHistory: priorHistory,
          },
          { version: "v2" },
        );

        for await (const event of eventStream) {
          // Stream tokens from the synthesize node's LLM call
          if (
            event.event === "on_chat_model_stream" &&
            event.metadata?.langgraph_node === "synthesize"
          ) {
            const token =
              typeof event.data?.chunk?.content === "string" ? event.data.chunk.content : "";
            if (token) {
              fullResponse += token;
              await writer.write(
                encoder.encode(`data: ${JSON.stringify({ type: "token", content: token })}\n\n`),
              );
            }
          }

          // Capture final graph state when the graph ends
          if (event.event === "on_chain_end" && event.name === "LangGraph") {
            finalState = event.data?.output ?? {};
          }
        }

        // Extract results from final state
        const response = (finalState.response as string) ?? fullResponse;
        citations = (finalState.citations as Record<string, unknown>[]) ?? [];
        nodesVisited = (finalState.nodesVisited as string[]) ?? [];

        // If streaming produced no tokens (fallback), send the full response
        if (!fullResponse && response) {
          fullResponse = response;
          await writer.write(
            encoder.encode(`data: ${JSON.stringify({ type: "token", content: response })}\n\n`),
          );
        }

        // Send debug info and citations
        await writer.write(
          encoder.encode(
            `data: ${JSON.stringify({
              type: "agent_debug",
              nodesVisited,
              queryType: finalState.queryType,
              retrievalAttempts: finalState.retrievalAttempts,
              chunkCount: Array.isArray(finalState.retrievedChunks)
                ? finalState.retrievedChunks.length
                : 0,
            })}\n\n`,
          ),
        );

        await writer.write(
          encoder.encode(`data: ${JSON.stringify({ type: "citations", citations })}\n\n`),
        );

        // Save assistant message with agent execution trace
        const toolResults = (
          (finalState.toolResults as { tool: string; input: Record<string, unknown> }[]) ?? []
        ).map((r) => ({ tool: r.tool, input: r.input }));

        await admin.from("messages").insert({
          conversation_id: conversationId,
          role: "assistant",
          content: fullResponse || response,
          citations,
          tool_calls: [
            {
              type: "agent_trace",
              nodesVisited,
              queryType: finalState.queryType,
              retrievalAttempts: finalState.retrievalAttempts,
              chunkCount: Array.isArray(finalState.retrievedChunks)
                ? finalState.retrievedChunks.length
                : 0,
              hasTableData: !!finalState.tableData,
              toolsCalled: finalState.toolsCalled ?? false,
              toolResults,
              contextSufficient: finalState.contextSufficient,
              tokenUsage: finalState.tokenUsage ?? { promptTokens: 0, completionTokens: 0 },
            },
          ],
        });
      } catch (error) {
        console.error("[chat] Stream error", error);
        await writer.write(
          encoder.encode(
            `data: ${JSON.stringify({ type: "error", content: "An error occurred." })}\n\n`,
          ),
        );
      } finally {
        await writer.write(encoder.encode("data: [DONE]\n\n"));
        await writer.close();
      }
    })();

    // Don't await — let the stream flow to the client
    streamPromise.catch((err) => console.error("[chat] Stream promise rejected", err));

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
