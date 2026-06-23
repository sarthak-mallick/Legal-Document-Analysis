import { mkdirSync, writeFileSync } from "fs";
import { dirname, resolve } from "path";

import { ChatGoogleGenerativeAI } from "@langchain/google-genai";

import { getRequiredEnv } from "@/lib/env";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { EvalQuestion } from "@/lib/eval/types";

export const DATASET_PATH = resolve(process.cwd(), "src/lib/eval/dataset.json");

const NUM_QUESTIONS = Number(process.env.EVAL_NUM_QUESTIONS ?? 15);
const CANDIDATE_LIMIT = 300;
const MIN_CHUNK_CHARS = 250;

interface ChunkRow {
  id: string;
  document_id: string;
  content: string;
}

let cachedGen: ChatGoogleGenerativeAI | null = null;
function getGenerator() {
  if (!cachedGen) {
    cachedGen = new ChatGoogleGenerativeAI({
      apiKey: getRequiredEnv("GEMINI_API_KEY"),
      model: process.env.GEMINI_CHAT_MODEL || "gemini-2.5-flash",
      temperature: 0.4,
    });
  }
  return cachedGen;
}

// Round-robin across documents so the dataset isn't dominated by one document.
function sampleAcrossDocuments(rows: ChunkRow[], count: number): ChunkRow[] {
  const byDoc = new Map<string, ChunkRow[]>();
  for (const row of rows) {
    if (row.content.trim().length < MIN_CHUNK_CHARS) continue;
    const list = byDoc.get(row.document_id) ?? [];
    list.push(row);
    byDoc.set(row.document_id, list);
  }

  const buckets = [...byDoc.values()];
  const picked: ChunkRow[] = [];
  let i = 0;
  while (picked.length < count && buckets.some((b) => b.length > 0)) {
    const bucket = buckets[i % buckets.length];
    const next = bucket.shift();
    if (next) picked.push(next);
    i++;
  }
  return picked;
}

function parseQa(raw: string): { question: string; answer: string } | null {
  const cleaned = raw
    .replace(/```json/gi, "")
    .replace(/```/g, "")
    .trim();
  try {
    const parsed = JSON.parse(cleaned);
    if (parsed.question && parsed.answer) {
      return { question: String(parsed.question), answer: String(parsed.answer) };
    }
  } catch {
    /* ignore */
  }
  return null;
}

// Generate a golden Q/A set by sampling stored chunks and asking Gemini to write a
// question answerable from each chunk plus the correct answer. The source chunk
// becomes the ground-truth relevant chunk for retrieval metrics.
export async function generateDataset(): Promise<EvalQuestion[]> {
  const supabase = createSupabaseAdminClient();

  const { data: chunkRows, error } = await supabase
    .from("document_chunks")
    .select("id, document_id, content")
    .eq("chunk_type", "text")
    .limit(CANDIDATE_LIMIT);

  if (error) throw new Error(`Failed to load chunks: ${error.message}`);
  if (!chunkRows || chunkRows.length === 0) {
    throw new Error(
      "No document_chunks found. Ingest at least one document before generating an eval set.",
    );
  }

  const sample = sampleAcrossDocuments(chunkRows as ChunkRow[], NUM_QUESTIONS);
  const generator = getGenerator();
  const questions: EvalQuestion[] = [];

  for (const chunk of sample) {
    const prompt = `You are building an evaluation set for a legal-document question-answering system.
Read the excerpt and write ONE specific, natural question a user might ask that is fully answerable using ONLY this excerpt, along with the correct, concise answer.
Avoid yes/no questions. Do not reference "the excerpt" in the question.

EXCERPT:
${chunk.content.slice(0, 2000)}

Respond with ONLY JSON: {"question": "...", "answer": "..."}`;

    try {
      const response = await generator.invoke(prompt);
      const raw =
        typeof response.content === "string" ? response.content : String(response.content);
      const qa = parseQa(raw);
      if (!qa) continue;

      questions.push({
        id: `q${questions.length + 1}`,
        question: qa.question,
        referenceAnswer: qa.answer,
        sourceChunkId: chunk.id,
        sourceDocumentId: chunk.document_id,
        documentIds: [chunk.document_id],
      });
    } catch (err) {
      console.warn(`[eval] Skipped a chunk during generation: ${(err as Error).message}`);
    }
  }

  if (questions.length === 0) {
    throw new Error("Generation produced no questions — check API key and model access.");
  }

  mkdirSync(dirname(DATASET_PATH), { recursive: true });
  writeFileSync(DATASET_PATH, JSON.stringify(questions, null, 2), "utf8");
  console.info(`[eval] Wrote ${questions.length} questions to ${DATASET_PATH}`);

  return questions;
}
