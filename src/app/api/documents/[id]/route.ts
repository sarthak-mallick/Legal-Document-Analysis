import { NextResponse } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase/server";

// This route deletes a single document owned by the authenticated user.
export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  console.info("[api/documents] Deleting document");

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

    const { id } = await context.params;
    const { error } = await supabase
      .from("documents")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) {
      console.error("[api/documents] Delete failed", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[api/documents] Unexpected delete failure", error);
    return NextResponse.json({ error: "Failed to delete document." }, { status: 500 });
  }
}

