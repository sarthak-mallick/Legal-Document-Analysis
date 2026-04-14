import type { AgentStateType, AgentUpdateType, QueryType } from "@/lib/agent/state";

// Heuristic patterns for each query type — no LLM call needed.

const GENERAL_RE =
  /^(hi|hello|hey|thanks?|thank you|ok(ay)?|sure|got it|bye|good\s+(morning|afternoon|evening))\b/i;

const CROSS_DOC_RE =
  /\b(compar|differ|versus|vs\.?\b|which\s+(document|policy|contract|agreement|one)|across\s+(document|polic|contract)|both\s+(document|polic|contract)|between\s+(the\s+|my\s+)?(document|polic|contract|two))/i;

const TERM_EXPLAIN_RE = /\b(define\s|explain\s|meaning\s+of\s|what\s+does\s+.{2,40}\s+mean)/i;

// "What is X?" where X doesn't reference a specific document value → likely a concept question.
const WHAT_IS_RE = /^what\s+(is|are)\s+/i;
const DOC_SPECIFIC_RE =
  /\b(my|the|this|our)\s+(policy|contract|document|agreement|coverage|deductible|premium|rent|salary|bonus|term|period|limit)\b/i;

const TABLE_LOOKUP_RE =
  /\b(coverage\s+limit|deductible|premium|how\s+much|what\s+amount|rate|schedule\s+of|sum\s+insured|benefit\s+amount|limit\s+of\s+liability|co-?pay|out\s+of\s+pocket|maximum\s+.{0,20}(amount|limit|coverage)|minimum\s+.{0,20}(amount|limit|coverage))\b/i;

const MULTI_SECTION_RE =
  /\b(am\s+i\s+covered|does\s+(my|the)\s+(policy|contract|agreement)\s+cover|what\s+happens\s+if|under\s+what\s+(condition|circumstance)|what\s+are\s+(all|my)\s+(right|obligation|responsibilit))\b/i;

// Classify the user's query using keyword heuristics (no LLM call).
export function classifyQuery(state: AgentStateType): AgentUpdateType {
  const q = (state.rewrittenQuery ?? state.query).trim();
  const ql = q.toLowerCase();

  let queryType: QueryType = "simple_factual";

  if (GENERAL_RE.test(ql) || q.length < 5) {
    queryType = "general";
  } else if (state.documentIds.length > 1 && CROSS_DOC_RE.test(ql)) {
    queryType = "cross_document";
  } else if (TERM_EXPLAIN_RE.test(ql)) {
    queryType = "term_explanation";
  } else if (WHAT_IS_RE.test(ql) && !DOC_SPECIFIC_RE.test(ql) && q.length < 60) {
    queryType = "term_explanation";
  } else if (TABLE_LOOKUP_RE.test(ql)) {
    queryType = "table_lookup";
  } else if (MULTI_SECTION_RE.test(ql) || (ql.includes(" and ") && q.length > 60)) {
    queryType = "multi_section";
  }

  console.info("[agent:classify] Query classified (heuristic)", { queryType });

  return {
    queryType,
    nodesVisited: ["classifyQuery"],
  };
}
