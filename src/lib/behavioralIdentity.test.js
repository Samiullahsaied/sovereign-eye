import { describe, expect, it } from 'vitest';
import {
  IDENTITY_WARNING,
  SAFE_SAMPLE_IDENTITIES,
  buildGraphEdges,
  calculateIdentitySimilarity,
  createAssistantExplanation,
  similarityLevel
} from './behavioralIdentity.js';

describe('behavioral identity analysis', () => {
  it('calculates non-decisive similarity scores for two or more identities', () => {
    const result = calculateIdentitySimilarity(SAFE_SAMPLE_IDENTITIES.slice(0, 2));

    expect(result.overall_similarity_score).toBeGreaterThan(0);
    expect(result.level).toMatch(/similarity|review/i);
    expect(result).toMatchObject({
      typing_similarity: expect.any(Number),
      writing_style_similarity: expect.any(Number),
      activity_time_similarity: expect.any(Number),
      device_pattern_similarity: expect.any(Number),
      network_signal_similarity: expect.any(Number)
    });
    expect(result.confidence_label).toMatch(/confidence/i);
  });

  it('uses bounded similarity labels', () => {
    expect(similarityLevel(75)).toBe('High similarity');
    expect(similarityLevel(55)).toBe('Medium similarity');
    expect(similarityLevel(10)).toBe('Low similarity');
    expect(similarityLevel(0)).toBe('Needs human review');
  });

  it('builds graph edges with percentage labels', () => {
    const edges = buildGraphEdges(SAFE_SAMPLE_IDENTITIES);

    expect(edges).toHaveLength(3);
    expect(edges[0]).toMatchObject({
      source: expect.any(String),
      target: expect.any(String),
      score: expect.any(Number),
      level: expect.any(String)
    });
  });

  it('keeps assistant output analytical and requires human review', () => {
    const result = calculateIdentitySimilarity(SAFE_SAMPLE_IDENTITIES.slice(0, 2));
    const explanation = createAssistantExplanation(result);
    const visibleText = [
      IDENTITY_WARNING,
      explanation.summary,
      explanation.uncertainty,
      explanation.recommendedNextStep,
      explanation.requiredHumanReview
    ].join(' ');

    expect(explanation.requiredHumanReview).toContain('Required');
    expect(visibleText).not.toMatch(/same person|confirmed identity|criminal|guilty/i);
  });
});
