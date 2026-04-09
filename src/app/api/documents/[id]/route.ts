import { NextResponse } from "next/server";

import { getUserId } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

// This route returns a single document with all its chunks.
export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const userId = await getUserId();
    if (!userId) {
      return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    }
    const supabase = createSupabaseAdminClient();
    const { id } = await context.params;

    const { data: document, error: docError } = await supabase
      .from("documents")
      .select("*")
      .eq("id", id)
      .eq("user_id", userId)
      .single();

    if (docError || !document) {
      return NextResponse.json({ error: "Document not found." }, { status: 404 });
    }

    const { data: chunks, error: chunksError } = await supabase
      .from("document_chunks")
      .select(
        "id, document_id, content, chunk_index, chunk_type, section_title, page_number, metadata",
      )
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

// This route deletes a single document.
export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  console.info("[api/documents] Deleting document");

  try {
    const userId = await getUserId();
    if (!userId) {
      return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    }
    const supabase = createSupabaseAdminClient();
    const { id } = await context.params;

    const { error } = await supabase.from("documents").delete().eq("id", id).eq("user_id", userId);

    if (error) {
      console.error("[api/documents] Delete failed", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Delete conversations that referenced this document
    const { data: orphaned } = await supabase
      .from("conversations")
      .select("id, document_ids")
      .eq("user_id", userId)
      .contains("document_ids", [id]);

    if (orphaned?.length) {
      const toDelete = orphaned
        .filter((c) => (c.document_ids as string[]).length === 1)
        .map((c) => c.id);
      const toUpdate = orphaned.filter((c) => (c.document_ids as string[]).length > 1);

      // Delete conversations that only referenced this document
      if (toDelete.length) {
        await supabase.from("conversations").delete().in("id", toDelete);
      }

      // Remove the document ID from multi-document conversations
      for (const conv of toUpdate) {
        const remaining = (conv.document_ids as string[]).filter((d) => d !== id);
        await supabase.from("conversations").update({ document_ids: remaining }).eq("id", conv.id);
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[api/documents] Unexpected delete failure", error);
    return NextResponse.json({ error: "Failed to delete document." }, { status: 500 });
  }
}
