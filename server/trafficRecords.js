import { createSupabaseAdminClient } from './supabaseAdmin.js';

const DEFAULT_TEST_RECORD = {
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
  metadata: {
    insertedBy: '/api/test-traffic-record'
  }
};

async function readJsonBody(req) {
  if (!req || typeof req.on !== 'function') return {};

  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', (chunk) => {
      raw += chunk;
      if (raw.length > 100_000) {
        reject(new Error('Request body too large.'));
      }
    });
    req.on('end', () => {
      if (!raw) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(raw));
      } catch {
        reject(new Error('Invalid JSON body.'));
      }
    });
    req.on('error', reject);
  });
}

function normalizeRecord(input = {}) {
  return {
    ...DEFAULT_TEST_RECORD,
    ...input,
    metadata: {
      ...DEFAULT_TEST_RECORD.metadata,
      ...(input.metadata || {})
    }
  };
}

export async function handleTestTrafficRecordRequest({ method = 'POST', req, body, env = process.env } = {}) {
  if (method !== 'POST') {
    return { status: 405, body: { error: 'Method not allowed' } };
  }

  const { client, error: clientError } = createSupabaseAdminClient(env);
  if (clientError) {
    return { status: 503, body: { error: clientError } };
  }

  let parsedBody = body || {};
  if (!body && req) {
    try {
      parsedBody = await readJsonBody(req);
    } catch (error) {
      return { status: 400, body: { error: error.message } };
    }
  }

  const record = normalizeRecord(parsedBody);
  const { data, error } = await client
    .from('traffic_records')
    .insert(record)
    .select('*')
    .single();

  if (error) {
    return { status: 500, body: { error: error.message } };
  }

  await Promise.all([
    client.from('alerts').insert({
      traffic_record_id: data.id,
      level: data.vpn || data.proxy || data.tor ? 'warn' : 'info',
      message: `Traffic record received: ${data.ip} (${data.city || 'unknown city'}, ${data.country || 'unknown country'})`,
      metadata: { source: data.source }
    }),
    client.from('dashboard_stats').upsert({
      key: 'last_traffic_record',
      value: {
        ip: data.ip,
        city: data.city,
        country: data.country,
        observed_at: data.observed_at
      },
      updated_at: new Date().toISOString()
    })
  ]);

  return { status: 200, body: { ok: true, traffic_record: data } };
}
