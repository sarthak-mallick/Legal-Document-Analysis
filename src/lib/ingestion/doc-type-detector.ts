import { getLLM } from "@/lib/langchain/model";
import type { ParsedDocument } from "@/lib/ingestion/types";

export type DocumentType =
  | "insurance_policy"
  | "lease_agreement"
  | "employment_contract"
  | "nda"
  | "terms_of_service"
  | "other";

export interface DocumentTypeResult {
  documentType: DocumentType;
  title: string | null;
  issuingParty: string | null;
  effectiveDate: string | null;
}

const VALID_TYPES: DocumentType[] = [
  "insurance_policy",
  "lease_agreement",
  "employment_contract",
  "nda",
  "terms_of_service",
  "other",
];

// Classify the document type by sending the first few pages to Gemini.
export async function detectDocumentType(
  parsedDocument: ParsedDocument,
): Promise<DocumentTypeResult> {
  console.info("[ingestion] Detecting document type");

  const firstPages = parsedDocument.pages
    .slice(0, 3)
    .map((p) => p.text)
    .join("\n\n---\n\n");

  const llm = getLLM();

  try {
    const response = await llm.invoke([
      {
        role: "system",
        content: `You are a legal document classifier. Analyze the provided text and classify it. Respond with ONLY valid JSON (no markdown fences) in this exact format:
{"documentType":"<type>","title":"<title or null>","issuingParty":"<party or null>","effectiveDate":"<date or null>"}

Valid documentType values: insurance_policy, lease_agreement, employment_contract, nda, terms_of_service, other`,
      },
      {
        role: "user",
        content: `Classify this document:\n\n${firstPages}`,
      },
    ]);

    const content =
      typeof response.content === "string"
        ? response.content.trim()
        : String(response.content).trim();

    // Strip markdown fences if present
    const jsonStr = content.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
    const parsed = JSON.parse(jsonStr) as Record<string, unknown>;

    const documentType = VALID_TYPES.includes(parsed.documentType as DocumentType)
      ? (parsed.documentType as DocumentType)
      : "other";

    return {
      documentType,
      title: typeof parsed.title === "string" ? parsed.title : null,
      issuingParty: typeof parsed.issuingParty === "string" ? parsed.issuingParty : null,
      effectiveDate: typeof parsed.effectiveDate === "string" ? parsed.effectiveDate : null,
    };
  } catch (error) {
    console.error("[ingestion] Document type detection failed, defaulting to 'other'", error);
    return {
      documentType: "other",
      title: null,
      issuingParty: null,
      effectiveDate: null,
    };
  }
}
