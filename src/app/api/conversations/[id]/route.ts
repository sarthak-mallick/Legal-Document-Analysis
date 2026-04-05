import { NextResponse } from "next/server";

import { getUserId } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

// Get a conversation with its messages.
export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const userId = await getUserId();
    if (!userId) {
      return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    }
    const supabase = createSupabaseAdminClient();
    const { id } = await context.params;

    const { data: conversation, error: convError } = await supabase
      .from("conversations")
      .select("*")
      .eq("id", id)
      .eq("user_id", userId)
      .single();

    if (convError || !conversation) {
      return NextResponse.json({ error: "Conversation not found." }, { status: 404 });
    }

    const { data: messages, error: msgError } = await supabase
      .from("messages")
      .select("*")
      .eq("conversation_id", id)
      .order("created_at", { ascending: true });

    if (msgError) {
      return NextResponse.json({ error: "Failed to fetch messages." }, { status: 500 });
    }

    return NextResponse.json({
      conversation,
      messages: messages ?? [],
    });
  } catch (error) {
    console.error("[api/conversations] Unexpected error", error);
    return NextResponse.json({ error: "Failed to fetch conversation." }, { status: 500 });
  }
}

// Delete a conversation.
export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const userId = await getUserId();
    if (!userId) {
      return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    }
    const supabase = createSupabaseAdminClient();
    const { id } = await context.params;

    const { error } = await supabase
      .from("conversations")
      .delete()
      .eq("id", id)
      .eq("user_id", userId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[api/conversations] Unexpected delete error", error);
    return NextResponse.json({ error: "Failed to delete conversation." }, { status: 500 });
  }
}
