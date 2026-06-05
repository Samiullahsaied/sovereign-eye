export async function validatePhoneWithNumverify(phone, countryCode = '') {
  const params = new URLSearchParams({ phone });
  if (countryCode) params.set('country_code', countryCode);

  const response = await fetch(`/api/numverify?${params.toString()}`, {
    headers: { accept: 'application/json' }
  });

  const body = await response.json();
  if (!response.ok) {
    throw new Error(body.error || 'Phone validation failed');
  }

  return body;
}
