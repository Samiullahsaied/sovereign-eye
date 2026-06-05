import { describe, expect, it, vi } from 'vitest';
import { validatePhoneWithNumverify } from './numverify.js';

describe('frontend Numverify client', () => {
  it('calls only the backend endpoint and never accepts a browser API key', async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        enabled: true,
        valid: true,
        countryName: 'United States of America',
        carrier: 'AT&T Mobility LLC',
        lineType: 'mobile'
      })
    }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(validatePhoneWithNumverify('+14158586273')).resolves.toMatchObject({
      valid: true,
      carrier: 'AT&T Mobility LLC'
    });
    expect(fetchMock).toHaveBeenCalledWith('/api/numverify?phone=%2B14158586273', {
      headers: { accept: 'application/json' }
    });
    expect(fetchMock.mock.calls[0][0]).not.toContain('access_key');
    expect(fetchMock.mock.calls[0][0]).not.toContain('NUMVERIFY_API_KEY');
  });

  it('throws the backend quota message for quota failures', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: false,
      json: async () => ({ error: 'Numverify quota exceeded. Phone validation is temporarily unavailable.' })
    })));

    await expect(validatePhoneWithNumverify('+14158586273')).rejects.toThrow('Numverify quota exceeded');
  });
});
