import { describe, expect, it } from 'vitest';
import { runPermissionFirstAssistant } from './assistant.js';

describe('permission-first assistant', () => {
  it('summarizes without taking automatic action', () => {
    const result = runPermissionFirstAssistant('case_analysis', 'Review new evidence.', {
      warrant: {
        accessStartTime: '2026-06-07T08:00:00Z',
        accessEndTime: '2026-06-07T14:00:00Z'
      },
      auditLog: [{ id: 'audit-1', action: 'Login', detail: 'Operator login' }],
      evidence: [{ id: 'evidence-1', action: 'Evidence note', detail: 'Reviewed file' }]
    });

    expect(result.summary).toContain('Case Analysis');
    expect(result.confidenceLevel).toBe('Low');
    expect(result.evidenceSourcesUsed.map((item) => item.label)).toContain('Audit records');
    expect(result.requiredHumanApproval).toContain('Administrator approval');
    expect(result.canActAutomatically).toBe(false);
  });

  it('marks warrant checks as high risk when access is not active', () => {
    const result = runPermissionFirstAssistant('timeline_analysis', '', {
      warrant: {
        accessStartTime: '2026-06-07T08:00:00Z',
        accessEndTime: '2026-06-07T09:00:00Z'
      },
      alerts: [{ id: 'alert-1', message: 'Critical access warning', level: 'critical' }]
    });

    expect(result.riskAssessment.level).toBe('High');
    expect(result.recommendedNextSteps.join(' ')).toContain('legal access window');
  });
});
