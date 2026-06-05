const IP_QUERY_PATTERN = /^[a-zA-Z0-9:.%-]{1,128}$/;

export function parseIpInfoRequest(url) {
  const requestUrl = new URL(url, 'http://localhost');
  const ip = requestUrl.searchParams.get('ip')?.trim() || '';

  if (!ip) {
    return { ok: false, status: 400, body: { error: 'ip query parameter is required' } };
  }

  if (!IP_QUERY_PATTERN.test(ip)) {
    return { ok: false, status: 400, body: { error: 'ip query parameter is invalid' } };
  }

  return { ok: true, ip };
}

export function normalizeIpInfoResponse(data) {
  const [lat, lng] = typeof data.loc === 'string'
    ? data.loc.split(',').map((value) => Number(value))
    : [null, null];

  return {
    ip: data.ip ?? '',
    city: data.city ?? '',
    region: data.region ?? '',
    country: data.country ?? '',
    org: data.org ?? '',
    timezone: data.timezone ?? '',
    loc: Number.isFinite(lat) && Number.isFinite(lng) ? [lat, lng] : null,
    privacy: {
      vpn: Boolean(data.privacy?.vpn),
      proxy: Boolean(data.privacy?.proxy),
      tor: Boolean(data.privacy?.tor),
      relay: Boolean(data.privacy?.relay),
      hosting: Boolean(data.privacy?.hosting)
    }
  };
}

export async function handleIpInfoRequest({ url, env = process.env, fetchImpl = fetch }) {
  const parsed = parseIpInfoRequest(url);
  if (!parsed.ok) {
    return parsed;
  }

  const token = env.IPINFO_TOKEN;
  if (!token) {
    return { ok: false, status: 503, body: { error: 'IPinfo backend token is not configured' } };
  }

  const response = await fetchImpl(`https://ipinfo.io/${encodeURIComponent(parsed.ip)}/json?token=${encodeURIComponent(token)}`, {
    headers: { accept: 'application/json' }
  });

  if (!response.ok) {
    return { ok: false, status: response.status, body: { error: 'IPinfo lookup failed' } };
  }

  const data = await response.json();
  return { ok: true, status: 200, body: normalizeIpInfoResponse(data) };
}

export async function writeJsonResponse(res, result) {
  res.statusCode = result.status;
  res.setHeader('content-type', 'application/json; charset=utf-8');
  res.setHeader('cache-control', 'no-store');
  res.end(JSON.stringify(result.body));
}
