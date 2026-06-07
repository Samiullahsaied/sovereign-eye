export async function lookupIpInfo(ip) {
  const response = await fetch(`/api/ipinfo?ip=${encodeURIComponent(ip)}`, {
    headers: { accept: 'application/json' }
  });

  const contentType = response.headers?.get?.('content-type') || '';
  if (!contentType.toLowerCase().includes('application/json')) {
    throw new Error('IPinfo lookup service returned a non-JSON response. Confirm /api/ipinfo is deployed on Cloudflare.');
  }

  let body;
  try {
    body = await response.json();
  } catch {
    throw new Error('IPinfo lookup service returned invalid JSON.');
  }

  if (!response.ok) {
    throw new Error(body.error || body.message || 'IPinfo lookup failed');
  }

  return body;
}
