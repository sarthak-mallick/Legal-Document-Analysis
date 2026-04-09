# Manual Testing Checklist

## Chat Q&A

### Simple factual query

- [x] Ask a straightforward question about a single section
- [x] Verify citations appear as cards, not inline text

### Table extraction

- [x] Ask about tabular data (e.g., premium amounts, benefit values)

### Multi-section query

- [x] Ask: "What are the exclusions and how do they relate to the coverage limits?"
- [x] Verify agent debug trace shows `queryType: "multi_section"`
- [x] Verify sub-query expansion fires (multiple retrieval rounds)
- [x] Response addresses both parts with citations from different sections

### Follow-up questions

- [x] After a multi-section query, ask a contextual follow-up (e.g., "Can you elaborate on the third exclusion?")
- [x] Verify the agent resolves implicit context from conversation history

### Streaming

- [x] Tokens appear incrementally during synthesis (not all at once)
- [x] If Gemini streaming fails, fallback sends the full response

### Multi-document RAG

- [x] Upload a second document (ideally similar type, e.g., another insurance policy)
- [x] Select both documents in the DocumentSelector sidebar
- [x] Ask cross-document questions:
  - "Compare the exclusions in both documents"
  - "Which policy has a higher sum assured?"
  - "What are the differences in premium terms between the two policies?"
- [x] Verify agent debug trace shows `queryType: "cross_document"`
- [x] Verify the `compare` node is visited (check `nodesVisited` in debug)
- [x] Response groups information by document with correct citations

## Document Upload & Parsing

### Per-page parsing (unpdf)

- [x] Delete existing document and re-upload
- [x] Verify chunks have varied `page_number` values in Supabase
- [x] Verify `section_title` fields are populated (carry-forward working)

## Summary & Analysis

### Summary generation

- [x] Summary displays as readable markdown (no raw JSON)
- [x] Risk flags render as styled cards
- [x] Gap analysis renders as coverage matrix with status indicators
- [x] No duplicate sources (footer stripped, only citation cards shown)
