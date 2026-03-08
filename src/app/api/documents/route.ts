import { NextResponse } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase/server";

// This route lists the authenticated user's uploaded documents for the dashboard.
export async function GET() {
  console.info("[api/documents] Listing documents");

  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error("[api/documents] Authentication failed", authError);
      return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    }

    const { data, error } = await supabase
      .from("documents")
      .select(
        "id, filename, file_size, document_type, upload_status, page_count, summary, created_at, updated_at",
      )
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[api/documents] Document query failed", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ documents: data ?? [] });
  } catch (error) {
    console.error("[api/documents] Unexpected failure", error);
    return NextResponse.json({ error: "Failed to load documents." }, { status: 500 });
  }
}

