const PREFIXES = [
  { prefix: '93', country: 'افغانستان', carrier: 'AWCC' },
  { prefix: '92', country: 'پاکستان', carrier: 'Jazz' },
  { prefix: '98', country: 'ایران', carrier: 'Irancell' },
  { prefix: '90', country: 'ترکیې', carrier: 'Turkcell' },
  { prefix: '1', country: 'امریکا', carrier: 'T-Mobile' }
];

export function normalizePhoneNumber(value) {
  return String(value ?? '')
    .replace(/^00/, '')
    .replace(/[^\d]/g, '');
}

export function classifyPhoneNumber(value) {
  const normalized = normalizePhoneNumber(value);
  const matched = PREFIXES.find((item) => normalized.startsWith(item.prefix));

  return {
    normalized,
    country: matched?.country ?? 'نامعلوم',
    carrier: matched?.carrier ?? 'نامعلوم',
    isKnown: Boolean(matched)
  };
}
