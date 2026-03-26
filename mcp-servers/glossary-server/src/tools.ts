import { lookupTerm, listTermsByCategory, getCategories } from "./glossary-data.js";

export function handleLookupTerm(args: { term: string }): string {
  const entry = lookupTerm(args.term);
  if (!entry) {
    return JSON.stringify({
      found: false,
      message: `No glossary entry found for "${args.term}". Try a different spelling or related term.`,
    });
  }

  return JSON.stringify({
    found: true,
    term: entry.term,
    definition: entry.definition,
    category: entry.category,
    relatedTerms: entry.relatedTerms,
    examples: entry.examples,
  });
}

export function handleListTermsByCategory(args: { category: string }): string {
  const entries = listTermsByCategory(args.category);
  if (entries.length === 0) {
    const categories = getCategories();
    return JSON.stringify({
      found: false,
      message: `No terms found in category "${args.category}". Available categories: ${categories.join(", ")}`,
    });
  }

  return JSON.stringify({
    category: args.category,
    count: entries.length,
    terms: entries.map((e) => ({ term: e.term, definition: e.definition })),
  });
}
