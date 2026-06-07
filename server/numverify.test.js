import { describe, expect, it, vi } from 'vitest';
import { handleNumverifyRequest } from './numverify.js';

describe('Numverify backend endpoint', () => {
  it('is optional and disabled when NUMVERIFY_API_KEY is missing', async () => {
    const result = await handleNumverifyRequest({
      url: '/api/numverify?phone=%2B14158586273',
      env: {}
    });

    expect(result.status).toBe(503);
    expect(result.body).toMatchObject({
      ok: false,
      error: 'NUMVERIFY_API_KEY missing',
      enabled: false,
      message: expect.stringContaining('not configured')
    });
  });

  it('normalizes a valid phone number response without exposing the API key', async () => {
    const fetchImpl = vi.fn(async (url) => ({
      ok: true,
      json: async () => ({
        valid: true,
        number: '14158586273',
        local_format: '4158586273',
        international_format: '+14158586273',
        country_prefix: '+1',
        country_code: 'US',
        country_name: 'United States of America',
        location: 'Novato',
        carrier: 'AT&T Mobility LLC',
        line_type: 'mobile'
      }),
      url
    }));

    const result = await handleNumverifyRequest({
      url: '/api/numverify?phone=%2B14158586273',
      env: { NUMVERIFY_API_KEY: 'secret-key' },
      fetchImpl
    });

    expect(result.status).toBe(200);
    expect(result.body).toMatchObject({
      enabled: true,
      valid: true,
      countryName: 'United States of America',
      carrier: 'AT&T Mobility LLC',
      lineType: 'mobile'
    });
    expect(JSON.stringify(result.body)).not.toContain('secret-key');
    expect(fetchImpl.mock.calls[0][0]).toContain('access_key=secret-key');
  });

  it('returns invalid phone data when Numverify says the number is invalid', async () => {
    const result = await handleNumverifyRequest({
      url: '/api/numverify?phone=12345',
      env: { NUMVERIFY_API_KEY: 'secret-key' },
      fetchImpl: vi.fn(async () => ({
        ok: true,
        json: async () => ({
          valid: false,
          number: '12345',
          country_name: '',
          carrier: '',
          line_type: null
        })
      }))
    });

    expect(result.status).toBe(200);
    expect(result.body).toMatchObject({
      enabled: true,
      valid: false,
      carrier: '',
      lineType: ''
    });
  });

  it('shows a clear quota exceeded message', async () => {
    const result = await handleNumverifyRequest({
      url: '/api/numverify?phone=%2B14158586273',
      env: { NUMVERIFY_API_KEY: 'secret-key' },
      fetchImpl: vi.fn(async () => ({
        ok: false,
        status: 429,
        json: async () => ({
          success: false,
          error: {
            code: 429,
            type: 'usage_limit_reached',
            info: 'Monthly API request volume reached.'
          }
        })
      }))
    });

    expect(result.status).toBe(429);
    expect(result.body.error).toBe('Numverify quota exceeded. Phone validation is temporarily unavailable.');
  });
});
