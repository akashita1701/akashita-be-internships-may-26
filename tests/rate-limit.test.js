test('rate limit: concurrent burst should not exceed limit', async () => {
  const proc = spawn('node', ['src/server.js'], { env: { ...process.env, API_KEY: 'k', PORT: '9093', RATE_LIMIT_PER_MIN: '5' } });
  await wait(400);

  const base = 'http://localhost:9093';

  // Fire 10 requests concurrently
  const results = await Promise.all(
    Array.from({ length: 10 }, (_, i) =>
      postStatus(`${base}/v1/signals`, {
        headers: { 'x-api-key': 'k' },
        body: { userId: 'u2', type: 'note', payload: String(i) }
      })
    )
  );

  const counts = results.reduce((acc, c) => (acc[c] = (acc[c] || 0) + 1, acc), {});
  assert.ok(counts[200] <= 5, `Expected at most 5 successes, got ${counts[200]}`);
  assert.ok(counts[429] >= 5, `Expected at least 5 rate-limited, got ${counts[429]}`);
  proc.kill();
});
