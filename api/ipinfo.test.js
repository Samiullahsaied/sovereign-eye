import { describe, expect, it, vi } from 'vitest';
import handler from './ipinfo.js';

function createMockResponse() {
  return {
    statusCode: 200,
    headers: {},
    body: '',
    setHeader(name, value) {
      this.headers[name.toLowerCase()] = value;
    },
    end(value) {
      this.body = value;
    }
  };
}

describe('Vercel IPinfo API route', () => {
  it('rejects non-GET requests before provider lookup', async () => {
    const res = createMockResponse();
    await handler({ method: 'POST', url: '/api/ipinfo?ip=8.8.8.8' }, res);

    expect(res.statusCode).toBe(405);
    expect(JSON.parse(res.body)).toEqual({ error: 'Method not allowed' });
  });

  it('does not expose backend token in the response body', async () => {
    const originalFetch = globalThis.fetch;
    const originalToken = process.env.IPINFO_TOKEN;
    process.env.IPINFO_TOKEN = 'vercel-server-secret';
    globalThis.fetch = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        ip: '8.8.8.8',
        city: 'Mountain View',
        country: 'US',
        loc: '37.386,-122.0838'
      })
    }));

    const res = createMockResponse();
    await handler({ method: 'GET', url: '/api/ipinfo?ip=8.8.8.8' }, res);

    expect(globalThis.fetch).toHaveBeenCalledWith(expect.stringContaining('token=vercel-server-secret'), expect.any(Object));
    expect(res.statusCode).toBe(200);
    expect(res.body).not.toContain('vercel-server-secret');
    expect(JSON.parse(res.body)).toMatchObject({ ip: '8.8.8.8', country: 'US' });

    globalThis.fetch = originalFetch;
    if (originalToken === undefined) {
      delete process.env.IPINFO_TOKEN;
    } else {
      process.env.IPINFO_TOKEN = originalToken;
    }
  });
});
