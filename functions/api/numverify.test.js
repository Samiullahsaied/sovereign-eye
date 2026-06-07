import { describe, expect, it } from 'vitest';
import { onRequest } from './numverify.js';

describe('Cloudflare Numverify function', () => {
  it('returns JSON when the provider key is missing', async () => {
    const response = await onRequest({
      request: new Request('https://example.com/api/numverify?phone=%2B14158586273'),
      env: {}
    });

    expect(response.status).toBe(503);
    expect(response.headers.get('content-type')).toContain('application/json');
    await expect(response.json()).resolves.toMatchObject({
      ok: false,
      error: 'NUMVERIFY_API_KEY missing'
    });
  });

  it('returns JSON for unsupported methods', async () => {
    const response = await onRequest({
      request: new Request('https://example.com/api/numverify?phone=%2B14158586273', { method: 'POST' }),
      env: {}
    });

    expect(response.status).toBe(405);
    expect(response.headers.get('content-type')).toContain('application/json');
    await expect(response.json()).resolves.toMatchObject({
      ok: false,
      error: 'Method not allowed'
    });
  });
});
