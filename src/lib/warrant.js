import { sanitizeText } from './validation.js';

export const WARRANT_STATUS = {
  PENDING: 'Pending',
  ACTIVE: 'Active',
  EXPIRED: 'Expired',
  REVOKED: 'Revoked'
};

export const WARRANT_DURATION_OPTIONS = [
  { id: '1h', label: '1 hour', hours: 1 },
  { id: '6h', label: '6 hours', hours: 6 },
  { id: 'night', label: '1 night', hours: 12 },
  { id: 'custom', label: 'Custom' }
];

export function toDateInputValue(date = new Date()) {
  const pad = (value) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function parseWarrantDate(value) {
  if (!value) return null;
  const normalized = String(value).trim();
  const date = /^\d{4}-\d{2}-\d{2}$/.test(normalized)
    ? new Date(`${normalized}T23:59:59`)
    : new Date(normalized);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function getWarrantStatus(warrant, now = new Date()) {
  if (!warrant) return WARRANT_STATUS.PENDING;
  if (warrant.status === WARRANT_STATUS.REVOKED || warrant.status === 'revoked') return WARRANT_STATUS.REVOKED;

  const start = parseWarrantDate(warrant.accessStartTime || warrant.startTime);
  const end = parseWarrantDate(warrant.accessEndTime || warrant.expiresAt);

  if (end && end <= now) return WARRANT_STATUS.EXPIRED;
  if (start && start > now) return WARRANT_STATUS.PENDING;
  if (start && end && start <= now && end > now) return WARRANT_STATUS.ACTIVE;
  return warrant.status || WARRANT_STATUS.PENDING;
}

export function isWarrantActive(warrant, now = new Date()) {
  return getWarrantStatus(warrant, now) === WARRANT_STATUS.ACTIVE;
}

export function formatWarrantDate(value) {
  const date = parseWarrantDate(value);
  return date ? date.toLocaleString() : '-';
}

export function makeWarrantFromDuration(current, durationId) {
  const start = parseWarrantDate(current.accessStartTime) || new Date();
  const option = WARRANT_DURATION_OPTIONS.find((item) => item.id === durationId);
  if (!option?.hours) return current;
  const end = new Date(start.getTime() + option.hours * 60 * 60 * 1000);
  return {
    ...current,
    durationMode: durationId,
    accessStartTime: toDateInputValue(start),
    accessEndTime: toDateInputValue(end)
  };
}

export function validateWarrantAccess(input = {}, now = new Date()) {
  const warrantNumber = sanitizeText(input.warrantNumber || input.number);
  const approvedBy = sanitizeText(input.approvedBy);
  const legalBasisNote = sanitizeText(input.legalBasisNote);
  const courtOrderFileName = sanitizeText(input.courtOrderFileName || input.courtOrderFile?.name || '');
  const start = parseWarrantDate(input.accessStartTime || input.startTime);
  const end = parseWarrantDate(input.accessEndTime || input.expiresAt);

  if (!warrantNumber) return { ok: false, code: 'numberRequired', message: 'Warrant number is required.' };
  if (!courtOrderFileName) return { ok: false, code: 'fileRequired', message: 'Court order file is required.' };
  if (!start) return { ok: false, code: 'startRequired', message: 'Access start date and time are required.' };
  if (!end) return { ok: false, code: 'endRequired', message: 'Access end date and time are required.' };
  if (end <= start) return { ok: false, code: 'endAfterStart', message: 'Access end time must be after the start time.' };
  if (end <= now) return { ok: false, code: 'alreadyExpired', message: 'This warrant has already expired.' };
  if (!approvedBy) return { ok: false, code: 'approvedByRequired', message: 'Approved by is required.' };
  if (!legalBasisNote) return { ok: false, code: 'legalBasisRequired', message: 'Legal basis note is required.' };

  const warrant = {
    number: warrantNumber,
    warrantNumber,
    courtOrderFileName,
    accessStartTime: start.toISOString(),
    accessEndTime: end.toISOString(),
    expiresAt: end.toISOString(),
    approvedBy,
    legalBasisNote,
    status: start > now ? WARRANT_STATUS.PENDING : WARRANT_STATUS.ACTIVE
  };

  return { ok: true, warrant };
}
