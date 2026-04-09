import { NextResponse } from "next/server";

import { getUserId } from "@/lib/auth";
import { getFloatEnv, getNumberEnv } from "@/lib/env";
import { matchDocumentChunks } from "@/lib/langchain/vectorstore";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const SEARCH_TOP_K = getNumberEnv("SEARCH_TOP_K", 10);
const SEARCH_SIMILARITY_THRESHOLD = getFloatEnv("SEARCH_SIMILARITY_THRESHOLD", 0.7);

// Search across all user's documents by vector similarity.
export async function GET(request: Request) {
  try {
    const userId = await getUserId();
    if (!userId) {
      return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q")?.trim();

    if (!query) {
      return NextResponse.json({ error: "Query parameter 'q' is required." }, { status: 400 });
    }

    // Get all user's document IDs
    const supabase = createSupabaseAdminClient();
    const { data: docs } = await supabase
      .from("documents")
      .select("id, filename, document_type")
      .eq("user_id", userId)
      .eq("upload_status", "ready");

    if (!docs || docs.length === 0) {
      return NextResponse.json({ results: [] });
    }

    const docIds = docs.map((d) => d.id as string);

    // Vector search across all documents
    const chunks = await matchDocumentChunks(query, {
      documentIds: docIds,
      matchCount: SEARCH_TOP_K,
    });

    // Filter by similarity threshold and group by document
    const filtered = (
      chunks as {
        document_id: string;
        content: string;
        section_title: string | null;
        page_number: number | null;
        similarity: number;
      }[]
    ).filter((c) => c.similarity >= SEARCH_SIMILARITY_THRESHOLD);

    const grouped = new Map<string, typeof filtered>();
    for (const chunk of filtered) {
      const existing = grouped.get(chunk.document_id) ?? [];
      existing.push(chunk);
      grouped.set(chunk.document_id, existing);
    }

    const results = docs
      .filter((d) => grouped.has(d.id as string))
      .map((d) => ({
        documentId: d.id,
        filename: d.filename,
        documentType: d.document_type,
        matches: (grouped.get(d.id as string) ?? []).map((c) => ({
          content: c.content.slice(0, 300),
          sectionTitle: c.section_title,
          pageNumber: c.page_number,
          similarity: c.similarity,
        })),
      }));

    return NextResponse.json({ results });
  } catch (error) {
    console.error("[api/search] Search failed", error);
    return NextResponse.json({ error: "Search failed." }, { status: 500 });
  }
}
