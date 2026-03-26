import { NextResponse } from "next/server";

import { getUserId } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

// This route lists the user's uploaded documents for the dashboard.
export async function GET() {
  console.info("[api/documents] Listing documents");

  try {
    const userId = await getUserId();
    if (!userId) {
      return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    }

    const supabase = createSupabaseAdminClient();

    const { data, error } = await supabase
      .from("documents")
      .select(
        "id, filename, file_size, document_type, upload_status, page_count, summary, created_at, updated_at",
      )
      .eq("user_id", userId)
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
