import { sanitizeText } from './validation.js';

function escapeCell(value) {
  const clean = sanitizeText(value);
  return /[",\n]/.test(clean) ? `"${clean.replace(/"/g, '""')}"` : clean;
}

export function toCSV(rows) {
  return rows.map((row) => row.map(escapeCell).join(',')).join('\n');
}

export function downloadCSV(filename, rows) {
  const blob = new Blob([toCSV(rows)], { type: 'text/csv;charset=utf-8' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
}
