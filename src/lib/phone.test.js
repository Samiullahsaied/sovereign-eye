import { describe, expect, it } from 'vitest';
import { classifyPhoneNumber } from './phone.js';

describe('phone classification helper', () => {
  it('normalizes common prefixes and identifies known carriers', () => {
    expect(classifyPhoneNumber('+93 700 000 000')).toMatchObject({
      normalized: '93700000000',
      country: 'افغانستان',
      carrier: 'AWCC'
    });
    expect(classifyPhoneNumber('001 555 0100')).toMatchObject({
      normalized: '15550100',
      country: 'امریکا'
    });
  });

  it('returns an explicit unknown state for unsupported numbers', () => {
    expect(classifyPhoneNumber('777')).toMatchObject({
      country: 'نامعلوم',
      carrier: 'نامعلوم'
    });
  });
});
