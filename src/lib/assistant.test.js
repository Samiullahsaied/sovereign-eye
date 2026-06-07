import { describe, expect, it } from 'vitest';
import { runPermissionFirstAssistant } from './assistant.js';

describe('permission-first assistant', () => {
  it('summarizes without taking automatic action', () => {
    const result = runPermissionFirstAssistant('case', 'Review new evidence.', {
      warrant: {
        accessStartTime: '2026-06-07T08:00:00Z',
        accessEndTime: '2026-06-07T14:00:00Z'
      }
    });

    expect(result.summary).toContain('Analyze case');
    expect(result.requiredHumanApproval).toContain('Administrator approval');
    expect(result.canActAutomatically).toBe(false);
  });

  it('marks warrant checks as high risk when access is not active', () => {
    const result = runPermissionFirstAssistant('warrant', '', {
      warrant: {
        accessStartTime: '2026-06-07T08:00:00Z',
        accessEndTime: '2026-06-07T09:00:00Z'
      }
    });

    expect(result.riskLevel).toBe('High');
    expect(result.recommendedNextStep).toContain('valid warrant');
  });
});
