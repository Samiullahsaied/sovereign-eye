const PHONE_QUERY_PATTERN = /^[+\d\s().-]{3,40}$/;

export function parseNumverifyRequest(url) {
  const requestUrl = new URL(url, 'http://localhost');
  const phone = requestUrl.searchParams.get('phone')?.trim() || '';
  const countryCode = requestUrl.searchParams.get('country_code')?.trim().toUpperCase() || '';

  if (!phone) {
    return { ok: false, status: 400, body: { error: 'phone query parameter is required' } };
  }

  if (!PHONE_QUERY_PATTERN.test(phone)) {
    return { ok: false, status: 400, body: { error: 'phone query parameter is invalid' } };
  }

  if (countryCode && !/^[A-Z]{2}$/.test(countryCode)) {
    return { ok: false, status: 400, body: { error: 'country_code must be a 2-letter ISO code' } };
  }

  return { ok: true, phone, countryCode };
}

export function normalizeNumverifyResponse(data) {
  return {
    enabled: true,
    valid: Boolean(data.valid),
    number: data.number || '',
    localFormat: data.local_format || '',
    internationalFormat: data.international_format || '',
    countryPrefix: data.country_prefix || '',
    countryCode: data.country_code || '',
    countryName: data.country_name || '',
    location: data.location || '',
    carrier: data.carrier || '',
    lineType: data.line_type || ''
  };
}

function normalizeNumverifyError(data, fallback = 'Phone validation failed') {
  const type = data?.error?.type || '';
  const code = data?.error?.code;
  if (type === 'usage_limit_reached' || code === 429) {
    return 'Numverify quota exceeded. Phone validation is temporarily unavailable.';
  }
  if (type === 'invalid_access_key') {
    return 'Numverify API key is invalid. Check backend environment configuration.';
  }
  return data?.error?.info || fallback;
}

export async function handleNumverifyRequest({ url, env = process.env, fetchImpl = fetch } = {}) {
  const parsed = parseNumverifyRequest(url);
  if (!parsed.ok) {
    return parsed;
  }

  const key = env.NUMVERIFY_API_KEY;
  if (!key) {
    return {
      ok: true,
      status: 200,
      body: {
        enabled: false,
        message: 'Numverify is not configured. Local phone classification is being used.'
      }
    };
  }

  const endpoint = new URL('https://apilayer.net/api/validate');
  endpoint.searchParams.set('access_key', key);
  endpoint.searchParams.set('number', parsed.phone);
  endpoint.searchParams.set('format', '1');
  if (parsed.countryCode) endpoint.searchParams.set('country_code', parsed.countryCode);

  const response = await fetchImpl(endpoint.toString(), {
    headers: { accept: 'application/json' }
  });

  let data = {};
  try {
    data = await response.json();
  } catch {
    data = {};
  }

  if (!response.ok || data.success === false || data.error) {
    return {
      ok: false,
      status: data?.error?.type === 'usage_limit_reached' || data?.error?.code === 429 ? 429 : response.status || 502,
      body: { error: normalizeNumverifyError(data, 'Numverify lookup failed') }
    };
  }

  return { ok: true, status: 200, body: normalizeNumverifyResponse(data) };
}
