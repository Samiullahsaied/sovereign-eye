export const IDENTITY_WARNING = 'This is an analytical similarity estimate only. Final judgment requires legal investigation, evidence review, and authorized human approval.';

export const SAFE_SAMPLE_IDENTITIES = [
  {
    id: 'sample-a',
    account_name: 'Sample Account Alpha',
    platform: 'Public Forum',
    username: 'alpha_sample',
    device_hint: 'Android browser',
    typing_profile_id: 'typing-sample-01',
    activity_times: '20:00,21:00,22:00',
    language_style_notes: 'Short operational phrases, formal Pashto, repeated time references.',
    known_case_id: 'CASE-SAMPLE-001',
    dataMode: 'sample'
  },
  {
    id: 'sample-b',
    account_name: 'Sample Account Bravo',
    platform: 'Messaging Channel',
    username: 'bravo_sample',
    device_hint: 'Android browser',
    typing_profile_id: 'typing-sample-02',
    activity_times: '20:30,21:15,23:00',
    language_style_notes: 'Formal Pashto wording, short sentences, repeated time references.',
    known_case_id: 'CASE-SAMPLE-001',
    dataMode: 'sample'
  },
  {
    id: 'sample-c',
    account_name: 'Sample Account Charlie',
    platform: 'Social Platform',
    username: 'charlie_sample',
    device_hint: 'Desktop browser',
    typing_profile_id: 'typing-sample-03',
    activity_times: '08:00,13:00,18:00',
    language_style_notes: 'Longer mixed-language notes and less frequent time references.',
    known_case_id: 'CASE-SAMPLE-002',
    dataMode: 'sample'
  }
];

function clampScore(value) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function tokenize(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter(Boolean);
}

function jaccardSimilarity(a, b) {
  const left = new Set(tokenize(a));
  const right = new Set(tokenize(b));
  if (!left.size && !right.size) return 0;
  const overlap = [...left].filter((item) => right.has(item)).length;
  const union = new Set([...left, ...right]).size;
  return union ? (overlap / union) * 100 : 0;
}

function parseActivityHours(value) {
  return String(value || '')
    .split(/[,\s]+/)
    .map((item) => {
      const match = item.match(/^(\d{1,2})(?::\d{2})?$/);
      if (!match) return null;
      const hour = Number(match[1]);
      return hour >= 0 && hour <= 23 ? hour : null;
    })
    .filter((item) => item !== null);
}

function activitySimilarity(a, b) {
  const left = parseActivityHours(a);
  const right = parseActivityHours(b);
  if (!left.length || !right.length) return 0;
  const closeMatches = left.filter((hour) => right.some((other) => Math.abs(hour - other) <= 1 || Math.abs(hour - other) >= 23)).length;
  return (closeMatches / Math.max(left.length, right.length)) * 100;
}

function exactOrTokenSimilarity(a, b) {
  const left = String(a || '').trim().toLowerCase();
  const right = String(b || '').trim().toLowerCase();
  if (!left || !right) return 0;
  if (left === right) return 100;
  return jaccardSimilarity(left, right);
}

export function calculateIdentitySimilarity(identities) {
  const selected = identities.filter(Boolean);
  if (selected.length < 2) {
    return {
      typing_similarity: 0,
      writing_style_similarity: 0,
      activity_time_similarity: 0,
      device_pattern_similarity: 0,
      network_signal_similarity: 0,
      overall_similarity_score: 0,
      confidence_label: 'Insufficient signal confidence',
      level: 'Needs human review',
      reasons: ['Select at least two identities for comparison.']
    };
  }

  const pairScores = [];
  for (let i = 0; i < selected.length; i += 1) {
    for (let j = i + 1; j < selected.length; j += 1) {
      const left = selected[i];
      const right = selected[j];
      const typing = exactOrTokenSimilarity(left.typing_profile_id, right.typing_profile_id);
      const writing = jaccardSimilarity(left.language_style_notes, right.language_style_notes);
      const activity = activitySimilarity(left.activity_times, right.activity_times);
      const device = exactOrTokenSimilarity(left.device_hint, right.device_hint);
      const network = left.known_case_id && right.known_case_id && left.known_case_id === right.known_case_id ? 70 : 30;
      pairScores.push({ typing, writing, activity, device, network });
    }
  }

  const average = (key) => pairScores.reduce((sum, item) => sum + item[key], 0) / pairScores.length;
  const typing_similarity = clampScore(average('typing'));
  const writing_style_similarity = clampScore(average('writing'));
  const activity_time_similarity = clampScore(average('activity'));
  const device_pattern_similarity = clampScore(average('device'));
  const network_signal_similarity = clampScore(average('network'));
  const overall_similarity_score = clampScore(
    typing_similarity * 0.22 +
    writing_style_similarity * 0.24 +
    activity_time_similarity * 0.18 +
    device_pattern_similarity * 0.18 +
    network_signal_similarity * 0.18
  );

  const level = similarityLevel(overall_similarity_score);
  const confidence_label = confidenceLabel(overall_similarity_score);
  const reasons = buildSimilarityReasons({
    typing_similarity,
    writing_style_similarity,
    activity_time_similarity,
    device_pattern_similarity,
    network_signal_similarity
  });

  return {
    typing_similarity,
    writing_style_similarity,
    activity_time_similarity,
    device_pattern_similarity,
    network_signal_similarity,
    overall_similarity_score,
    confidence_label,
    level,
    reasons
  };
}

export function similarityLevel(score) {
  if (score >= 70) return 'High similarity';
  if (score >= 40) return 'Medium similarity';
  if (score > 0) return 'Low similarity';
  return 'Needs human review';
}

export function confidenceLabel(score) {
  if (score >= 70) return 'Elevated analytical confidence';
  if (score >= 40) return 'Moderate analytical confidence';
  if (score > 0) return 'Limited analytical confidence';
  return 'Insufficient signal confidence';
}

function buildSimilarityReasons(scores) {
  const reasons = [];
  if (scores.typing_similarity >= 60) reasons.push('Typing profile identifiers or patterns are close enough to require review.');
  if (scores.writing_style_similarity >= 45) reasons.push('Language style notes share repeated vocabulary or structure.');
  if (scores.activity_time_similarity >= 50) reasons.push('Activity windows overlap within a narrow time range.');
  if (scores.device_pattern_similarity >= 60) reasons.push('Device hints show a comparable access pattern.');
  if (scores.network_signal_similarity >= 60) reasons.push('Case or network context overlaps and should be checked against evidence.');
  if (!reasons.length) reasons.push('Signals are limited or weak; preserve the comparison for analyst review only.');
  return reasons;
}

export function buildGraphEdges(identities) {
  const edges = [];
  for (let i = 0; i < identities.length; i += 1) {
    for (let j = i + 1; j < identities.length; j += 1) {
      const score = calculateIdentitySimilarity([identities[i], identities[j]]).overall_similarity_score;
      edges.push({
        id: `${identities[i].id}-${identities[j].id}`,
        source: identities[i].id,
        target: identities[j].id,
        score,
        level: similarityLevel(score)
      });
    }
  }
  return edges;
}

export function createAssistantExplanation(result) {
  return {
    summary: `The selected identities show ${result.level.toLowerCase()} with an overall estimate of ${result.overall_similarity_score}%.`,
    supportingSignals: result.reasons,
    uncertainty: 'Behavioral signals are indirect and can be affected by shared devices, copied language, time zones, or incomplete records.',
    recommendedNextStep: 'Attach analyst notes, compare against admissible evidence, and request authorized review before any operational step.',
    requiredHumanReview: 'Required. This module cannot make a final identity determination.'
  };
}
