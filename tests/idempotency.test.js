test('idempotency: concurrent requests with same key return same resource', async () => {
  const proc = spawn('node', ['src/server.js'], { env: { ...process.env, API_KEY: 'k', PORT: '9094', RATE_LIMIT_PER_MIN: '100' } });
  await wait(400);

  const base = 'http://localhost:9094';
  const idem = 'concurrent-key';

  // Fire 5 concurrent requests 
  const results = await Promise.all(
    Array.from({ length: 5 }, () =>
      postJson(`${base}/v1/signals`, {
        headers: { 'x-api-key': 'k', 'Idempotency-Key': idem },
        body: { userId: 'u3', type: 'note', payload: 'concurrent' }
      })
    )
  );

  // All should return the same id
  const ids = results.map(r => r.id);
  assert.ok(ids.every(id => id === ids[0]), `All responses should have the same id. Got: ${JSON.stringify(ids)}`);
  proc.kill();
});
