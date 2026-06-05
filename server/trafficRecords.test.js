import { describe, expect, it, vi } from 'vitest';
import { handleTestTrafficRecordRequest } from './trafficRecords.js';

function makeTableMock() {
  const chain = {
    insert: vi.fn(() => chain),
    upsert: vi.fn(() => Promise.resolve({ data: null, error: null })),
    select: vi.fn(() => chain),
    single: vi.fn(() => Promise.resolve({
      data: {
        id: 'record-1',
        ip: '8.8.8.8',
        city: 'Mountain View',
        country: 'US',
        vpn: false,
        proxy: false,
        tor: false,
        source: 'backend_test',
        observed_at: '2026-06-04T00:00:00Z'
      },
      error: null
    }))
  };
  return chain;
}

vi.mock('./supabaseAdmin.js', () => ({
  createSupabaseAdminClient: vi.fn((env) => {
    if (!env.SUPABASE_SERVICE_ROLE_KEY) {
      return { client: null, error: 'SUPABASE_SERVICE_ROLE_KEY and VITE_SUPABASE_URL/SUPABASE_URL are required for backend Supabase writes.' };
    }
    const table = makeTableMock();
    return {
      client: {
        from: vi.fn(() => table)
      },
      error: ''
    };
  })
}));

describe('test traffic record backend endpoint', () => {
  it('refuses backend writes when the service role key is missing', async () => {
    const result = await handleTestTrafficRecordRequest({
      method: 'POST',
      body: {},
      env: { VITE_SUPABASE_URL: 'https://example.supabase.co' }
    });

    expect(result.status).toBe(503);
    expect(result.body.error).toMatch(/SUPABASE_SERVICE_ROLE_KEY/);
  });

  it('inserts a default test traffic record when backend Supabase credentials exist', async () => {
    const result = await handleTestTrafficRecordRequest({
      method: 'POST',
      body: {},
      env: {
        VITE_SUPABASE_URL: 'https://example.supabase.co',
        SUPABASE_SERVICE_ROLE_KEY: 'service-role'
      }
    });

    expect(result.status).toBe(200);
    expect(result.body.ok).toBe(true);
    expect(result.body.traffic_record.ip).toBe('8.8.8.8');
  });
});
