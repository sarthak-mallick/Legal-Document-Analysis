import { NextResponse } from "next/server";

import { getUserId } from "@/lib/auth";
import { getLLM } from "@/lib/langchain/model";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

// Coverage checklist categories per document type for gap analysis.
const GAP_CHECKLISTS: Record<string, string[]> = {
  insurance_policy: [
    "Liability coverage",
    "Collision coverage",
    "Comprehensive coverage",
    "Medical payments",
    "Uninsured/underinsured motorist",
    "Personal property coverage",
    "Loss of use / rental reimbursement",
    "Deductible amounts",
    "Policy limits (per occurrence and aggregate)",
    "Named perils vs open perils",
  ],
  lease_agreement: [
    "Rent amount and due date",
    "Security deposit terms",
    "Lease duration and renewal",
    "Maintenance responsibilities",
    "Termination and notice requirements",
    "Late fees and penalties",
    "Subletting policy",
    "Pet policy",
    "Utilities and included services",
    "Dispute resolution",
  ],
  employment_contract: [
    "Base compensation",
    "Bonus and incentive structure",
    "Benefits (health, retirement, PTO)",
    "Non-compete clause",
    "Non-solicitation clause",
    "IP assignment",
    "Confidentiality obligations",
    "Termination conditions",
    "Severance terms",
    "Dispute resolution",
  ],
  nda: [
    "Definition of confidential information",
    "Duration of obligations",
    "Exclusions from confidentiality",
    "Permitted disclosures",
    "Return/destruction of materials",
    "Remedies for breach",
    "Governing law",
    "Non-solicitation provisions",
  ],
  terms_of_service: [
    "User obligations and restrictions",
    "Liability limitations",
    "Arbitration / dispute resolution",
    "Data usage and privacy",
    "Termination rights",
    "Modification and notice",
    "Indemnification",
    "Intellectual property rights",
  ],
};

interface SummaryResult {
  summary: string;
  riskFlags: RiskFlag[];
  gapAnalysis: GapItem[];
}

interface RiskFlag {
  title: string;
  description: string;
  severity: "high" | "medium" | "low";
  section: string | null;
}

interface GapItem {
  category: string;
  status: "covered" | "not_covered" | "partial";
  details: string | null;
}

// Generate a structured summary, risk flags, and gap analysis for a document.
async function generateDocumentSummary(
  chunks: {
    content: string;
    chunk_type: string;
    section_title: string | null;
    page_number: number | null;
    metadata: Record<string, unknown>;
  }[],
  documentType: string | null,
  filename: string,
): Promise<SummaryResult> {
  const llm = getLLM();

  // Build context from all chunks (limit to avoid token overflow)
  const context = chunks
    .slice(0, 30)
    .map((c) => {
      const section = c.section_title ?? "Unknown";
      const page = c.page_number ?? "?";
      const type = c.chunk_type === "table" ? " [TABLE]" : "";
      let text = c.content;
      if (c.chunk_type === "table" && c.metadata?.table_markdown) {
        text += `\nTable: ${c.metadata.table_markdown}`;
      }
      return `[${section}, p${page}]${type}: ${text}`;
    })
    .join("\n\n");

  // Generate summary
  const summaryResponse = await llm.invoke([
    {
      role: "system",
      content: `You are a legal document analyst. Generate a structured summary of this ${documentType ?? "legal"} document. Include:
1. Document overview (1-2 sentences)
2. Key terms and values (bullet points)
3. Important dates and deadlines
4. Parties involved

Output in markdown format. Be specific and quote exact values from the document.`,
    },
    { role: "user", content: `Document: ${filename}\n\n${context}` },
  ]);

  const summary =
    typeof summaryResponse.content === "string"
      ? summaryResponse.content
      : String(summaryResponse.content);

  // Generate risk flags
  const riskResponse = await llm.invoke([
    {
      role: "system",
      content: `You are a legal risk analyst. Review this document content and identify concerning clauses or potential risks. For each risk, provide:
- title: Short name for the risk
- description: Why this is concerning
- severity: "high", "medium", or "low"
- section: Which section it's from (or null)

Respond with ONLY valid JSON array (no markdown fences): [{"title":"...","description":"...","severity":"...","section":"..."}]
If no risks are found, respond with: []`,
    },
    { role: "user", content: context },
  ]);

  let riskFlags: RiskFlag[] = [];
  try {
    const riskContent =
      typeof riskResponse.content === "string"
        ? riskResponse.content.trim()
        : String(riskResponse.content).trim();
    const jsonStr = riskContent.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
    riskFlags = JSON.parse(jsonStr) as RiskFlag[];
  } catch {
    riskFlags = [];
  }

  // Generate gap analysis if we have a checklist for this document type
  let gapAnalysis: GapItem[] = [];
  const checklist = GAP_CHECKLISTS[documentType ?? ""] ?? [];

  if (checklist.length > 0) {
    const gapResponse = await llm.invoke([
      {
        role: "system",
        content: `You are a legal document coverage analyst. For each category below, determine if the document covers it. Respond with ONLY valid JSON array (no markdown fences):
[{"category":"...","status":"covered"|"not_covered"|"partial","details":"brief note or null"}]

Categories to check:
${checklist.map((c) => `- ${c}`).join("\n")}`,
      },
      { role: "user", content: context },
    ]);

    try {
      const gapContent =
        typeof gapResponse.content === "string"
          ? gapResponse.content.trim()
          : String(gapResponse.content).trim();
      const jsonStr = gapContent.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
      gapAnalysis = JSON.parse(jsonStr) as GapItem[];
    } catch {
      gapAnalysis = checklist.map((c) => ({
        category: c,
        status: "not_covered" as const,
        details: "Analysis failed",
      }));
    }
  }

  return { summary, riskFlags, gapAnalysis };
}

// Generate and store a document summary with risk flags and gap analysis.
export async function POST(
  _request: Request,
  context: { params: Promise<{ documentId: string }> },
) {
  try {
    const userId = await getUserId();
    if (!userId) {
      return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    }

    const { documentId } = await context.params;
    const admin = createSupabaseAdminClient();

    // Fetch document
    const { data: document, error: docError } = await admin
      .from("documents")
      .select("*")
      .eq("id", documentId)
      .single();

    if (docError || !document) {
      return NextResponse.json({ error: "Document not found." }, { status: 404 });
    }

    // Fetch chunks
    const { data: chunks, error: chunksError } = await admin
      .from("document_chunks")
      .select("content, chunk_type, section_title, page_number, metadata")
      .eq("document_id", documentId)
      .order("chunk_index", { ascending: true });

    if (chunksError || !chunks?.length) {
      return NextResponse.json({ error: "No chunks found for this document." }, { status: 400 });
    }

    const result = await generateDocumentSummary(
      chunks as {
        content: string;
        chunk_type: string;
        section_title: string | null;
        page_number: number | null;
        metadata: Record<string, unknown>;
      }[],
      document.document_type as string | null,
      document.filename as string,
    );

    // Store summary in the document record
    const { error: updateError } = await admin
      .from("documents")
      .update({ summary: result.summary })
      .eq("id", documentId);

    if (updateError) {
      console.error("[summary] Failed to store summary", updateError);
    }

    return NextResponse.json({
      summary: result.summary,
      riskFlags: result.riskFlags,
      gapAnalysis: result.gapAnalysis,
    });
  } catch (error) {
    console.error("[summary] Generation failed", error);
    return NextResponse.json({ error: "Summary generation failed." }, { status: 500 });
  }
}

// Get the existing summary for a document.
export async function GET(_request: Request, context: { params: Promise<{ documentId: string }> }) {
  try {
    const userId = await getUserId();
    if (!userId) {
      return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    }
    const supabase = createSupabaseAdminClient();
    const { documentId } = await context.params;

    const { data: document, error: docError } = await supabase
      .from("documents")
      .select("id, summary")
      .eq("id", documentId)
      .eq("user_id", userId)
      .single();

    if (docError || !document) {
      return NextResponse.json({ error: "Document not found." }, { status: 404 });
    }

    return NextResponse.json({
      summary: document.summary,
    });
  } catch (error) {
    console.error("[summary] Fetch failed", error);
    return NextResponse.json({ error: "Failed to fetch summary." }, { status: 500 });
  }
}
