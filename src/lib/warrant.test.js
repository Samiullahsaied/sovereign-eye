import { describe, expect, it } from 'vitest';
import {
  WARRANT_STATUS,
  getWarrantStatus,
  isWarrantActive,
  makeWarrantFromDuration,
  toDateInputValue,
  validateWarrantAccess
} from './warrant.js';

describe('warrant access control', () => {
  it('requires legal warrant fields and accepts normal production dates', () => {
    const result = validateWarrantAccess({
      warrantNumber: 'W-2026-009',
      courtOrderFileName: 'court-order.pdf',
      accessStartTime: '2026-09-23T08:00',
      accessEndTime: '2026-09-23T14:00',
      approvedBy: 'Legal Supervisor',
      legalBasisNote: 'Court-approved investigative access.'
    }, new Date('2026-06-07T00:00:00Z'));

    expect(result.ok).toBe(true);
    expect(result.warrant.status).toBe(WARRANT_STATUS.PENDING);
    expect(result.warrant.number).toBe('W-2026-009');
  });

  it('computes active, expired, revoked, and pending status from exact times', () => {
    const warrant = {
      accessStartTime: '2026-06-07T08:00:00Z',
      accessEndTime: '2026-06-07T14:00:00Z'
    };

    expect(getWarrantStatus(warrant, new Date('2026-06-07T07:59:00Z'))).toBe(WARRANT_STATUS.PENDING);
    expect(getWarrantStatus(warrant, new Date('2026-06-07T09:00:00Z'))).toBe(WARRANT_STATUS.ACTIVE);
    expect(isWarrantActive(warrant, new Date('2026-06-07T09:00:00Z'))).toBe(true);
    expect(getWarrantStatus(warrant, new Date('2026-06-07T14:00:00Z'))).toBe(WARRANT_STATUS.EXPIRED);
    expect(getWarrantStatus({ ...warrant, status: WARRANT_STATUS.REVOKED }, new Date('2026-06-07T09:00:00Z'))).toBe(WARRANT_STATUS.REVOKED);
  });

  it('creates exact one-hour and six-hour warrant windows', () => {
    const start = new Date('2026-06-07T08:30:00');
    const oneHour = makeWarrantFromDuration({ accessStartTime: toDateInputValue(start) }, '1h');
    const sixHours = makeWarrantFromDuration({ accessStartTime: toDateInputValue(start) }, '6h');

    expect(new Date(oneHour.accessEndTime).getTime() - new Date(oneHour.accessStartTime).getTime()).toBe(60 * 60 * 1000);
    expect(new Date(sixHours.accessEndTime).getTime() - new Date(sixHours.accessStartTime).getTime()).toBe(6 * 60 * 60 * 1000);
  });
});
