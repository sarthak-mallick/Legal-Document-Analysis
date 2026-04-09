"use client";

import { useCallback, useState } from "react";
import { Search } from "lucide-react";

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
      <form onSubmit={handleSearch} className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search across all documents..."
          className="flex h-9 w-full rounded-md border border-input bg-transparent pl-9 pr-20 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        />
        <button
          type="submit"
          disabled={searching || !query.trim()}
          className="absolute right-1 top-1/2 inline-flex h-7 -translate-y-1/2 items-center rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
        >
          {searching ? "..." : "Search"}
        </button>
      </form>

      {searched && results.length === 0 && !searching && (
        <p className="text-sm text-muted-foreground">No matching documents found.</p>
      )}

      {results.length > 0 && (
        <div className="space-y-2">
          {results.map((doc) => (
            <div key={doc.documentId} className="rounded-lg border border-border bg-card p-4">
              <div className="mb-2 flex items-center gap-2">
                <span className="text-sm font-medium text-foreground">{doc.filename}</span>
                {doc.documentType && (
                  <span className="rounded-md border border-border px-1.5 py-0.5 text-xs text-muted-foreground">
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
