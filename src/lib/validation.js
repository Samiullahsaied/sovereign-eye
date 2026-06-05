export function sanitizeText(value) {
  return String(value ?? '')
    .replace(/<[^>]*>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function validateWarrant({ number, expiresAt }) {
  const cleanNumber = sanitizeText(number);

  if (!cleanNumber) {
    return { ok: false, message: 'حکم نمبر اړین دی.' };
  }

  if (!expiresAt) {
    return { ok: false, message: 'د حکم د پای نېټه اړینه ده.' };
  }

  const expiry = new Date(`${expiresAt}T23:59:59`);
  if (Number.isNaN(expiry.getTime())) {
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
