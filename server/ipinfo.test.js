import { describe, expect, it, vi } from 'vitest';
import { handleIpInfoRequest, normalizeIpInfoResponse, parseIpInfoRequest } from './ipinfo.js';

describe('IPinfo backend endpoint helpers', () => {
  it('requires a valid ip query parameter', () => {
    expect(parseIpInfoRequest('/api/ipinfo')).toMatchObject({
      ok: false,
      status: 400
    });
    expect(parseIpInfoRequest('/api/ipinfo?ip=<script>')).toMatchObject({
      ok: false,
      status: 400
    });
    expect(parseIpInfoRequest('/api/ipinfo?ip=8.8.8.8')).toMatchObject({
      ok: true,
      ip: '8.8.8.8'
    });
  });

  it('uses only the server-side IPINFO_TOKEN and never returns it', async () => {
    const fetchImpl = vi.fn(async (url) => ({
      ok: true,
      status: 200,
      json: async () => ({
        ip: '8.8.8.8',
        city: 'Mountain View',
        region: 'California',
        country: 'US',
        loc: '37.3860,-122.0838',
        privacy: { vpn: false, proxy: false, tor: false }
      })
    }));

    const result = await handleIpInfoRequest({
      url: '/api/ipinfo?ip=8.8.8.8',
      env: { IPINFO_TOKEN: 'server-secret-token' },
      fetchImpl
    });

    expect(fetchImpl).toHaveBeenCalledWith(expect.stringContaining('token=server-secret-token'), expect.any(Object));
    expect(JSON.stringify(result.body)).not.toContain('server-secret-token');
    expect(result).toMatchObject({
      ok: true,
      status: 200,
      body: {
        ip: '8.8.8.8',
        city: 'Mountain View',
        loc: [37.386, -122.0838]
      }
    });
  });

  it('returns a clear server error when the token is not configured', async () => {
    const result = await handleIpInfoRequest({
      url: '/api/ipinfo?ip=8.8.8.8',
      env: {},
      fetchImpl: vi.fn()
    });

    expect(result).toMatchObject({
      ok: false,
      status: 503,
      body: { error: 'IPinfo backend token is not configured' }
    });
  });

  it('normalizes privacy flags without exposing raw provider payload', () => {
    expect(normalizeIpInfoResponse({
      ip: '1.1.1.1',
      loc: '1,2',
      privacy: { vpn: true, proxy: false, tor: false, relay: true, hosting: true },
      token: 'must-not-pass-through'
    })).toEqual({
      ip: '1.1.1.1',
      city: '',
      region: '',
      country: '',
      org: '',
      timezone: '',
      loc: [1, 2],
      privacy: { vpn: true, proxy: false, tor: false, relay: true, hosting: true }
    });
  });
});
