import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

export interface GlossaryEntry {
  term: string;
  definition: string;
  category: string;
  relatedTerms: string[];
  examples: string[];
}

const __dirname = dirname(fileURLToPath(import.meta.url));
const glossaryPath = resolve(__dirname, "../data/glossary.json");
const glossary: GlossaryEntry[] = JSON.parse(readFileSync(glossaryPath, "utf-8"));

// Simple fuzzy matching: Levenshtein distance for short strings.
function levenshtein(a: string, b: string): number {
  const matrix: number[][] = [];
  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      const cost = b[i - 1] === a[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost,
      );
    }
  }
  return matrix[b.length][a.length];
}

// Look up a term with fuzzy matching.
export function lookupTerm(query: string): GlossaryEntry | null {
  const normalized = query.toLowerCase().trim();

  // Exact match
  const exact = glossary.find((e) => e.term === normalized);
  if (exact) return exact;

  // Substring match
  const substring = glossary.find(
    (e) => e.term.includes(normalized) || normalized.includes(e.term),
  );
  if (substring) return substring;

  // Fuzzy match (distance <= 2)
  let best: GlossaryEntry | null = null;
  let bestDistance = Infinity;
  for (const entry of glossary) {
    const dist = levenshtein(normalized, entry.term);
    if (dist < bestDistance && dist <= 2) {
      bestDistance = dist;
      best = entry;
    }
  }

  return best;
}

// List all terms in a given category.
export function listTermsByCategory(category: string): GlossaryEntry[] {
  const normalized = category.toLowerCase().trim();
  return glossary.filter((e) => e.category === normalized);
}

// Get all unique categories.
export function getCategories(): string[] {
  return [...new Set(glossary.map((e) => e.category))].sort();
}
