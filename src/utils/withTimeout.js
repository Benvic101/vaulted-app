// Shared fetch timeout (Mission 12).
// When the network is fully offline, a Supabase query can hang forever —
// it never resolves or rejects, so page-level error handling never runs
// and list pages stay stuck on "Loading...".
// This races the query against a timer and, on timeout, resolves with the
// same { data, error } shape Supabase uses, so callers can keep their
// existing `const { data, error } = await ...` pattern and the error flows
// into the normal ListError handling.

const DEFAULT_TIMEOUT_MS = 15000

export default function withTimeout(query, timeoutMs = DEFAULT_TIMEOUT_MS, label = "Request") {
  let timer
  const timeout = new Promise((resolve) => {
    timer = setTimeout(
      () => {
        console.log(`[withTimeout] ${label}: timer fired after ${timeoutMs}ms`)
        resolve({
          data: null,
          error: new Error(`${label} timed out — check your connection and try again.`),
        })
      },
      timeoutMs
    )
  })
  return Promise.race([query, timeout]).finally(() => clearTimeout(timer))
}
