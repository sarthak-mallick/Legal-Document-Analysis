import { getLLM } from "@/lib/langchain/model";
import { getNumberEnv } from "@/lib/env";
import { getUserId } from "@/lib/auth";
import { getAgentGraph } from "@/lib/agent/graph";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { chatRequestSchema } from "@/lib/validations/chat";
import { parseBody } from "@/lib/validations";
import type { AgentStateType } from "@/lib/agent/state";
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

    // The admin client bypasses RLS, so document ownership MUST be enforced in
    // application code. Fetch only documents owned by the caller; a count
    // mismatch means the request referenced a document the user does not own.
    const { data: ownedDocs } = await admin
      .from("documents")
      .select("id, filename, document_type")
      .in("id", documentIds)
      .eq("user_id", userId);

    const documentMetas = (ownedDocs ?? []).map((d) => ({
      id: d.id as string,
      filename: d.filename as string,
      documentType: (d.document_type as string) ?? null,
    }));

    if (documentMetas.length !== documentIds.length) {
      return new Response(JSON.stringify({ error: "One or more documents were not found." }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Create or verify conversation
    if (!conversationId) {
      // Create the conversation immediately with a cheap placeholder title so the
      // agent can start without waiting on an LLM call (~2-3s). The real title is
      // generated off the critical path below and patched in once ready.
      const { data: conversation, error: convError } = await admin
        .from("conversations")
        .insert({
          user_id: userId,
          title: message.slice(0, 50),
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

      // Generate a better title in the background and update the row when ready.
      // The function stays alive for the duration of the agent stream (longer than
      // this short LLM call), so the update lands before the request completes.
      const newConversationId = conversation.id as string;
      void generateTitle(message)
        .then((title) => admin.from("conversations").update({ title }).eq("id", newConversationId))
        .catch((error) => console.error("[chat] Background title generation failed", error));
    } else {
      // Verify the caller owns the conversation they're posting to. Without this
      // check a user could inject messages into — and load the history of —
      // another user's conversation (the admin client bypasses RLS).
      const { data: existing } = await admin
        .from("conversations")
        .select("id")
        .eq("id", conversationId)
        .eq("user_id", userId)
        .single();

      if (!existing) {
        return new Response(JSON.stringify({ error: "Conversation not found." }), {
          status: 404,
          headers: { "Content-Type": "application/json" },
        });
      }
    }

    // Save user message
    await admin.from("messages").insert({
      conversation_id: conversationId,
      role: "user",
      content: message,
      citations: [],
      tool_calls: [],
    });

    // Load the most recent conversation history. Ordering descending + limit keeps
    // the latest N messages (ascending + limit would return the OLDEST N, starving
    // the agent of recent context); reverse back to chronological order.
    const { data: historyRows } = await admin
      .from("messages")
      .select("id, conversation_id, role, content, citations, tool_calls, created_at")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: false })
      .limit(CONVERSATION_HISTORY_LIMIT);

    const history = ((historyRows ?? []) as MessageRecord[]).reverse();
    // Drop the just-inserted user message (now last after reversing).
    const priorHistory = history.slice(0, -1);

    // Stream the response to the client using SSE with real LLM token streaming
    const agent = getAgentGraph();
    const encoder = new TextEncoder();
    const { readable, writable } = new TransformStream();
    const writer = writable.getWriter();

    const sendSSE = (data: unknown) =>
      writer.write(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));

    // Human-friendly status messages for each agent node.
    const NODE_STATUS: Record<string, string> = {
      rewriteQuery: "Understanding your question…",
      classifyQuery: "Analyzing question type…",
      callTools: "Looking up legal terms…",
      retrieve: "Searching documents…",
      evaluateContext: "Evaluating relevance…",
      compare: "Comparing documents…",
      queryTable: "Extracting table data…",
      synthesize: "Generating response…",
    };

    // Process agent events in the background while streaming to client
    const streamPromise = (async () => {
      let fullResponse = "";
      let finalState: Partial<AgentStateType> = {};
      const statusSent = new Set<string>();

      try {
        await sendSSE({ type: "meta", conversationId });

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
          // Emit a status update the first time each node starts
          if (event.event === "on_chain_start" && event.metadata?.langgraph_node) {
            const node = event.metadata.langgraph_node as string;
            if (NODE_STATUS[node] && !statusSent.has(node)) {
              statusSent.add(node);
              await sendSSE({ type: "status", content: NODE_STATUS[node] });
            }
          }

          if (
            event.event === "on_chat_model_stream" &&
            event.metadata?.langgraph_node === "synthesize"
          ) {
            const token =
              typeof event.data?.chunk?.content === "string" ? event.data.chunk.content : "";
            if (token) {
              fullResponse += token;
              await sendSSE({ type: "token", content: token });
            }
          }

          if (event.event === "on_chain_end" && event.name === "LangGraph") {
            finalState = (event.data?.output as Partial<AgentStateType>) ?? {};
          }
        }

        // finalState.response has the sources-stripped version from the synthesize node.
        const cleanResponse = finalState.response ?? fullResponse;

        // If streaming produced no tokens (fallback), send the full response
        if (!fullResponse && cleanResponse) {
          await sendSSE({ type: "token", content: cleanResponse });
        }

        // Send the cleaned response so the client can replace the raw
        // streamed text (which may include a "Sources:" footer).
        await sendSSE({ type: "response", content: cleanResponse });

        const citations = finalState.citations ?? [];
        const nodesVisited = finalState.nodesVisited ?? [];
        const chunkCount = finalState.retrievedChunks?.length ?? 0;

        await sendSSE({
          type: "agent_debug",
          nodesVisited,
          queryType: finalState.queryType,
          retrievalAttempts: finalState.retrievalAttempts,
          chunkCount,
        });

        await sendSSE({ type: "citations", citations });

        // Save assistant message with agent execution trace
        const toolResults = (finalState.toolResults ?? []).map(
          (r: { tool: string; input: Record<string, unknown> }) => ({
            tool: r.tool,
            input: r.input,
          }),
        );

        await admin.from("messages").insert({
          conversation_id: conversationId,
          role: "assistant",
          content: cleanResponse,
          citations,
          tool_calls: [
            {
              type: "agent_trace",
              nodesVisited,
              queryType: finalState.queryType,
              retrievalAttempts: finalState.retrievalAttempts,
              chunkCount,
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
        await sendSSE({ type: "error", content: "An error occurred." });
      } finally {
        await writer.write(encoder.encode("data: [DONE]\n\n"));
        await writer.close();
      }
    })();

    // Don't await — let the stream flow to the client.
    // Suppress unhandled-rejection warnings from LangGraph internals.
    streamPromise.catch(() => {});

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
