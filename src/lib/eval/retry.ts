// Transient errors worth retrying: model overload, rate limits, network blips.
const TRANSIENT =
  /(\b429\b|\b500\b|\b503\b|high demand|overloaded|rate.?limit|temporarily|unavailable|ECONNRESET|ETIMEDOUT|fetch failed|deadline)/i;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Retry an async operation with exponential backoff + jitter, but only for
// transient failures. Non-transient errors (bad request, auth) throw immediately.
export async function withRetry<T>(fn: () => Promise<T>, label: string, retries = 4): Promise<T> {
  let attempt = 0;
  for (;;) {
    try {
      return await fn();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (attempt >= retries || !TRANSIENT.test(msg)) throw err;

      const delay = 2000 * 2 ** attempt + Math.floor(Math.random() * 500);
      console.warn(
        `[eval] transient error on ${label} (attempt ${attempt + 1}/${retries}), ` +
          `retrying in ${delay}ms: ${msg.slice(0, 120)}`,
      );
      await sleep(delay);
      attempt++;
    }
  }
}
