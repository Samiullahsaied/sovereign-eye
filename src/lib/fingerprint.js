import { sanitizeText } from './validation.js';

export function createTypingFingerprint(text) {
  const clean = sanitizeText(text);
  if (clean.length < 10) {
    return null;
  }

  return {
    length: clean.length,
    words: clean.split(/\s+/).filter(Boolean).length,
    letters: clean.replace(/\s/g, '').length,
    averageWordLength: Number(
      (clean.replace(/\s/g, '').length / clean.split(/\s+/).filter(Boolean).length).toFixed(2)
    )
  };
}

export function compareTypingFingerprint(sample, candidateText) {
  if (!sample) return 0;
  const candidate = createTypingFingerprint(candidateText);
  if (!candidate) return 0;

  const lengthScore = 1 - Math.min(1, Math.abs(sample.length - candidate.length) / Math.max(sample.length, candidate.length));
  const wordScore = 1 - Math.min(1, Math.abs(sample.words - candidate.words) / Math.max(sample.words, candidate.words));
  const letterScore = 1 - Math.min(1, Math.abs(sample.letters - candidate.letters) / Math.max(sample.letters, candidate.letters));

  return Math.max(0, Math.round(((lengthScore + wordScore + letterScore) / 3) * 100));
}
