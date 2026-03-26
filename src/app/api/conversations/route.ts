import { NextResponse } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase/server";

// List all conversations for the authenticated user.
export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    }

    const { data: conversations, error } = await supabase
      .from("conversations")
      .select("*")
      .eq("user_id", user.id)
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
