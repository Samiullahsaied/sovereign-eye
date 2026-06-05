import { describe, expect, it } from 'vitest';
import { compareTypingFingerprint, createTypingFingerprint } from './fingerprint.js';

describe('typing fingerprint helpers', () => {
  it('creates a stable fingerprint for valid text', () => {
    const first = createTypingFingerprint('دا یو اوږد نمونه متن دی');
    const second = createTypingFingerprint('دا یو اوږد نمونه متن دی');
    expect(first).toEqual(second);
    expect(first).toMatchObject({ length: 23, words: 6 });
  });

  it('scores similar text higher than very different text', () => {
    const sample = createTypingFingerprint('دا یو اوږد نمونه متن دی');
    expect(compareTypingFingerprint(sample, 'دا یو اوږد نمونه متن دی')).toBeGreaterThan(90);
    expect(compareTypingFingerprint(sample, 'short')).toBeLessThan(60);
  });
});
