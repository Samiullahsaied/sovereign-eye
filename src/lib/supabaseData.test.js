import { describe, expect, it, vi } from 'vitest';
import { loadOperationalData } from './supabaseData.js';

function queryResult(data) {
  const chain = {
    select: vi.fn(() => chain),
    order: vi.fn(() => chain),
    limit: vi.fn(() => Promise.resolve({ data, error: null })),
    neq: vi.fn(() => chain)
  };
  return chain;
}

describe('Supabase operational data mapper', () => {
  it('loads live traffic records for dashboard maps, tables, and charts', async () => {
    const tables = {
      orders: queryResult([]),
      audit_logs: queryResult([]),
      evidence: queryResult([]),
      status: queryResult([]),
      settings: queryResult([]),
      user_profiles: queryResult([]),
      traffic_records: queryResult([{
        id: 'traffic-1',
        ip: '8.8.8.8',
        country: 'US',
        region: 'California',
        city: 'Mountain View',
        org: 'AS15169 Google LLC',
        latitude: 37.4056,
        longitude: -122.0775,
        vpn: false,
        proxy: false,
        tor: false,
        relay: false,
        hosting: false,
        risk: 'normal',
        source: 'backend_test',
        metadata: {},
        observed_at: '2026-06-04T00:00:00Z',
        created_at: '2026-06-04T00:00:00Z'
      }]),
      alerts: queryResult([]),
      dashboard_stats: queryResult([])
    };

    const client = {
      from: vi.fn((table) => tables[table])
    };

    const data = await loadOperationalData(client);

    expect(data.trafficRecords).toHaveLength(1);
    expect(data.trafficRecords[0]).toMatchObject({
      id: 'traffic-1',
      ip: '8.8.8.8',
      country: 'US',
      city: 'Mountain View',
      loc: [37.4056, -122.0775],
      vpn: false,
      risk: 'normal'
    });
  });
});
