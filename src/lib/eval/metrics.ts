// Retrieval metrics computed against the single known-relevant source chunk.
// (Each synthesized question is derived from exactly one chunk, so recall@k and
// hit-rate coincide; MRR captures how highly that chunk was ranked.)
export function retrievalMetrics(retrievedChunkIds: string[], sourceChunkId: string) {
  const rank = retrievedChunkIds.indexOf(sourceChunkId);
  const hit = rank !== -1;
  return {
    hit,
    reciprocalRank: hit ? 1 / (rank + 1) : 0,
  };
}

export function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

// Round to 3 decimals for reporting.
export function round(value: number): number {
  return Math.round(value * 1000) / 1000;
}
