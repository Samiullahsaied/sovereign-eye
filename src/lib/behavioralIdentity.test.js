import { describe, expect, it } from 'vitest';
import {
  IDENTITY_WARNING,
  buildGraphEdges,
  calculateIdentitySimilarity,
  createAssistantExplanation,
  similarityLevel
} from './behavioralIdentity.js';

const TEST_IDENTITIES = [
  {
    id: 'identity-a',
    account_name: 'Account Alpha',
    platform: 'Internal Source',
    username: 'alpha',
    device_hint: 'Android browser',
    typing_profile_id: 'typing-01',
    activity_times: '20:00,21:00,22:00',
    language_style_notes: 'Short operational phrases, formal Pashto, repeated time references.',
    known_case_id: 'CASE-001'
  },
  {
    id: 'identity-b',
    account_name: 'Account Bravo',
    platform: 'Internal Source',
    username: 'bravo',
    device_hint: 'Android browser',
    typing_profile_id: 'typing-02',
    activity_times: '20:30,21:15,23:00',
    language_style_notes: 'Formal Pashto wording, short sentences, repeated time references.',
    known_case_id: 'CASE-001'
  },
  {
    id: 'identity-c',
    account_name: 'Account Charlie',
    platform: 'Internal Source',
    username: 'charlie',
    device_hint: 'Desktop browser',
    typing_profile_id: 'typing-03',
    activity_times: '08:00,13:00,18:00',
    language_style_notes: 'Longer mixed-language notes and less frequent time references.',
    known_case_id: 'CASE-002'
  }
];

describe('behavioral identity analysis', () => {
  it('calculates non-decisive similarity scores for two or more identities', () => {
    const result = calculateIdentitySimilarity(TEST_IDENTITIES.slice(0, 2));

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
    const edges = buildGraphEdges(TEST_IDENTITIES);

    expect(edges).toHaveLength(3);
    expect(edges[0]).toMatchObject({
      source: expect.any(String),
      target: expect.any(String),
      score: expect.any(Number),
      level: expect.any(String)
    });
  });

  it('keeps assistant output analytical and requires human review', () => {
    const result = calculateIdentitySimilarity(TEST_IDENTITIES.slice(0, 2));
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
