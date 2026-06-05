import { describe, expect, it, vi } from 'vitest';
import { lookupIpInfo } from './ipinfo.js';

describe('frontend IPinfo client', () => {
  it('calls only the backend endpoint and never accepts a browser token', async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({ ip: '8.8.8.8', country: 'US' })
    }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(lookupIpInfo('8.8.8.8')).resolves.toMatchObject({ country: 'US' });
    expect(fetchMock).toHaveBeenCalledWith('/api/ipinfo?ip=8.8.8.8', {
      headers: { accept: 'application/json' }
    });
    expect(fetchMock.mock.calls[0][0]).not.toContain('token');
  });
});
