import { NextResponse } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase/server";

// This route returns a single document with all its chunks.
export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    }

    const { id } = await context.params;

    const { data: document, error: docError } = await supabase
      .from("documents")
      .select("*")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (docError || !document) {
      return NextResponse.json({ error: "Document not found." }, { status: 404 });
    }

    const { data: chunks, error: chunksError } = await supabase
      .from("document_chunks")
      .select("id, document_id, content, chunk_index, chunk_type, section_title, page_number, metadata")
      .eq("document_id", id)
      .order("chunk_index", { ascending: true });

    if (chunksError) {
      return NextResponse.json({ error: "Failed to fetch chunks." }, { status: 500 });
    }

    const chunkCount = chunks?.length ?? 0;
    const tableCount = chunks?.filter((c) => c.chunk_type === "table").length ?? 0;

    return NextResponse.json({
      document,
      chunks: chunks ?? [],
      chunkCount,
      tableCount,
    });
  } catch (error) {
    console.error("[api/documents] Unexpected error", error);
    return NextResponse.json({ error: "Failed to fetch document." }, { status: 500 });
  }
}

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
