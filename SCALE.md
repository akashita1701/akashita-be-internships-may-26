# Scale Plan 
## Data model / indexes:
- `signals` table with `(user_id, created_at)` composite index already in place — fast per-user listing.
- Add `idempotency_key` index (already UNIQUE) for O(1) dedup lookups.
- For 10k RPS, migrate from SQLite to PostgreSQL with connection pooling (pg-pool, min 10 / max 50 connections per instance).

## Idempotency across instances:
- Move idempotency store to Redis (SETNX with TTL of 24h).
- On POST: `SET idempotency:{key} {serialized_response} NX EX 86400`.
- If key exists, return cached response — no DB write needed.
- This makes idempotency O(1) and multi-instance safe.

## Rate limiting across instances:
- Replace in-memory Map with Redis sliding window using a Lua script:
  - `ZADD {userId}:rl {nowMs} {uuid}` + `ZREMRANGEBYSCORE` + `ZCARD` in one atomic Lua script.
  - Set key TTL to 60s.
- This is atomic, cluster-safe, and works across 100+ instances.

## Observability (logs / metrics / alerts):
- Structured JSON logs (already using Fastify logger).
- Export Prometheus metrics: request rate, p50/p95/p99 latency, 4xx/5xx rates, DB pool wait time, cache hit/miss ratio.
- Alert on: p99 > 500ms, error rate > 1%, Redis connection failures, DB pool exhaustion.
- Distributed tracing via OpenTelemetry → Jaeger/Tempo.

## Failure modes:
- **DB down:** Retry with exponential backoff + jitter (implemented). After 3 failures, circuit breaker opens for 5s, returns 503. Alert fires immediately.
- **Redis down:** Fall back to DB-only idempotency check (degraded, but safe). Rate limiter falls back to in-memory per instance (leaks some requests, acceptable for short outages).
- **Partial outages:** Health endpoint `/healthz` checks DB and Redis connectivity. Load balancer removes unhealthy pods within one check interval.

