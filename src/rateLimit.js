const RATE = Number(process.env.RATE_LIMIT_PER_MIN || 5);
const WINDOW_MS = 60_000;

// Map<userId, number[]> — array of timestamps of recent requests
const buckets = new Map();

export function checkAndConsume(userId, nowMs = Date.now()) {
  const windowStart = nowMs - WINDOW_MS;

  const timestamps = buckets.get(userId) || [];

  const filtered = timestamps.filter(t => t > windowStart);

  const ok = filtered.length < RATE;
  if (ok) {
    filtered.push(nowMs);
  }

  buckets.set(userId, filtered);

  const remaining = Math.max(RATE - filtered.length, 0);
  // Reset time
  const resetMs = filtered.length > 0 ? filtered[0] + WINDOW_MS : nowMs + WINDOW_MS;

  return { ok, remaining, resetMs };
}
