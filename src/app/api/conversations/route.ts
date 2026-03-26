import { NextResponse } from "next/server";

import { getUserId } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

// List all conversations for the user.
export async function GET() {
  try {
    const userId = await getUserId();
    const supabase = createSupabaseAdminClient();

    const { data: conversations, error } = await supabase
      .from("conversations")
      .select("*")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ conversations: conversations ?? [] });
  } catch (error) {
    console.error("[api/conversations] Unexpected error", error);
    return NextResponse.json({ error: "Failed to fetch conversations." }, { status: 500 });
  }
}
