import { describe, expect, it } from 'vitest';
import { sanitizeText, validateWarrant } from './validation.js';

describe('validation helpers', () => {
  it('requires a warrant number and future expiry date', () => {
    expect(validateWarrant({ number: '', expiresAt: '2026-12-31' }).ok).toBe(false);
    expect(validateWarrant({ number: 'W-2026-001', expiresAt: '2020-01-01' }).ok).toBe(false);
    expect(validateWarrant({ number: 'W-2026-001', expiresAt: '2026-12-31' }).ok).toBe(true);
  });

  it('removes markup from user-controlled text before rendering/export', () => {
    expect(sanitizeText('<img src=x onerror=alert(1)>Ahmad')).toBe('Ahmad');
  });
});
