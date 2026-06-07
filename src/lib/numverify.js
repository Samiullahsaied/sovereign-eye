export async function validatePhoneWithNumverify(phone, countryCode = '') {
  const params = new URLSearchParams({ phone });
  if (countryCode) params.set('country_code', countryCode);

  const response = await fetch(`/api/numverify?${params.toString()}`, {
    headers: { accept: 'application/json' }
  });

  const contentType = response.headers?.get?.('content-type') || '';
  if (!contentType.toLowerCase().includes('application/json')) {
    throw new Error('Phone lookup service returned a non-JSON response. Confirm /api/numverify is deployed on Cloudflare.');
  }

  let body;
  try {
    body = await response.json();
  } catch {
    throw new Error('Phone lookup service returned invalid JSON.');
  }

  if (!response.ok) {
    throw new Error(body.error || body.message || 'Phone validation failed');
  }

  return body;
}
