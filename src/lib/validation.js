export function sanitizeText(value) {
  return String(value ?? '')
    .replace(/<[^>]*>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function parseDateInput(value) {
  if (!value) return null;
  const normalized = String(value).trim();
  const date = /^\d{4}-\d{2}-\d{2}$/.test(normalized)
    ? new Date(`${normalized}T23:59:59`)
    : new Date(normalized);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function validateWarrant({ number, expiresAt }) {
  const cleanNumber = sanitizeText(number);

  if (!cleanNumber) {
    return { ok: false, message: 'حکم نمبر اړین دی.' };
  }

  if (!expiresAt) {
    return { ok: false, message: 'د حکم د پای نېټه اړینه ده.' };
  }

  const expiry = parseDateInput(expiresAt);
  if (!expiry) {
    return { ok: false, message: 'د پای نېټه سمه نه ده.' };
  }

  if (expiry < new Date()) {
    return { ok: false, message: 'حکم تېر شوی دی؛ نوی قانوني سند اړین دی.' };
  }

  return { ok: true, warrant: { number: cleanNumber, expiresAt } };
}

export function validateRequired(value, fieldName) {
  return sanitizeText(value)
    ? { ok: true }
    : { ok: false, message: `${fieldName} اړین دی.` };
}
