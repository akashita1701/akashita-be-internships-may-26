// src/rateLimit.js
const RATE = Number(process.env.RATE_LIMIT_PER_MIN || 5);
const WINDOW_MS = 60_000;

// Map<userId, number[]> — array of timestamps of recent requests
const buckets = new Map();

export function checkAndConsume(userId, nowMs = Date.now()) {
  const windowStart = nowMs - WINDOW_MS;

  // Get or initialize the timestamps array
  const timestamps = buckets.get(userId) || [];

  // Remove timestamps outside the current window (sliding window)
  const filtered = timestamps.filter(t => t > windowStart);

  const ok = filtered.length < RATE;
  if (ok) {
    filtered.push(nowMs);
  }

  buckets.set(userId, filtered);

  const remaining = Math.max(RATE - filtered.length, 0);
  // Reset time = when the oldest request in the window will expire
  const resetMs = filtered.length > 0 ? filtered[0] + WINDOW_MS : nowMs + WINDOW_MS;

  return { ok, remaining, resetMs };
}
