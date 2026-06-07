import { describe, expect, it } from 'vitest';
import { onRequest } from './ipinfo.js';

describe('Cloudflare IPinfo function', () => {
  it('returns JSON when the backend token is missing', async () => {
    const response = await onRequest({
      request: new Request('https://example.com/api/ipinfo?ip=8.8.8.8'),
      env: {}
    });

    expect(response.status).toBe(503);
    expect(response.headers.get('content-type')).toContain('application/json');
    await expect(response.json()).resolves.toMatchObject({
      error: 'IPinfo backend token is not configured'
    });
  });

  it('returns JSON for unsupported methods', async () => {
    const response = await onRequest({
      request: new Request('https://example.com/api/ipinfo?ip=8.8.8.8', { method: 'POST' }),
      env: {}
    });

    expect(response.status).toBe(405);
    expect(response.headers.get('content-type')).toContain('application/json');
    await expect(response.json()).resolves.toMatchObject({
      error: 'Method not allowed'
    });
  });
});
