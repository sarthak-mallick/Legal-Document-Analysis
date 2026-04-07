"use client";

import { useCallback, useState } from "react";

interface SearchResult {
  documentId: string;
  filename: string;
  documentType: string | null;
  matches: {
    content: string;
    sectionTitle: string | null;
    pageNumber: number | null;
    similarity: number;
  }[];
}

// Search bar that queries across all uploaded documents.
export function DocumentSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);

  const handleSearch = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!query.trim()) return;

      setSearching(true);
      setSearched(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query.trim())}`);
        if (res.ok) {
          const data = await res.json();
          setResults(data.results ?? []);
        }
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    },
    [query],
  );

  return (
    <div className="space-y-3">
      <form onSubmit={handleSearch} className="flex gap-2">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search across all documents..."
          className="flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-primary dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
        />
        <button
          type="submit"
          disabled={searching || !query.trim()}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:bg-primary/90 disabled:opacity-50"
        >
          {searching ? "Searching..." : "Search"}
        </button>
      </form>

      {searched && results.length === 0 && !searching && (
        <p className="text-sm text-slate-400">No matching documents found.</p>
      )}

      {results.length > 0 && (
        <div className="space-y-3">
          {results.map((doc) => (
            <div
              key={doc.documentId}
              className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800"
            >
              <div className="mb-2 flex items-center gap-2">
                <span className="font-medium text-foreground">{doc.filename}</span>
                {doc.documentType && (
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600 dark:bg-slate-700 dark:text-slate-300">
                    {doc.documentType.replace(/_/g, " ")}
                  </span>
                )}
              </div>
              {doc.matches.slice(0, 2).map((match, i) => (
                <div key={i} className="mt-1 text-xs text-muted-foreground">
                  <span className="font-medium">
                    {match.sectionTitle ?? "Section"}, Page {match.pageNumber ?? "?"}
                  </span>
                  {" — "}
                  {match.content.slice(0, 150)}...
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
