export async function lookupIpInfo(ip) {
  const response = await fetch(`/api/ipinfo?ip=${encodeURIComponent(ip)}`, {
    headers: { accept: 'application/json' }
  });

  const body = await response.json();
  if (!response.ok) {
    throw new Error(body.error || 'IPinfo lookup failed');
  }

  return body;
}
