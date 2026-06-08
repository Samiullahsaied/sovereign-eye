import { readdirSync, readFileSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const ROOT = fileURLToPath(new URL('../src', import.meta.url));
const SKIP_DIRS = new Set(['i18n', 'test']);
const FILE_RE = /\.(jsx|js)$/;
const BAD_TEXT_RE = /(Ø|Ù|Ú|Û|Â|�|\?{3,})/;
const HARDCODED_RE = /(title|placeholder|aria-label)=["'][^"'{]+["']|>\s*[A-Za-z][^<{]*\s*</;
const ALLOWED = [
  /Sovereign Eye/,
  /\bAI\b/,
  /\bIP\b/,
  /\bVPN\b/,
  /\bAPI\b/,
  /\bCSV\b/,
  /\bSupabase\b/,
  /\bCloudflare\b/,
  /\bCartoDB\b/,
  /\bTypingDNA\b/,
  /Country name:/,
  /Country code:/,
  /International format:/,
  /Local format:/,
  /Carrier:/,
  /Line type:/,
  /Validity:/,
  /Location:/,
  /Unknown/,
  /Valid/,
  /Invalid/,
  /Local only/,
  /import /,
  /export /,
  /const /,
  /function /
];

function walk(dir) {
  const results = [];
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    const stat = statSync(path);
    if (stat.isDirectory()) {
      if (!SKIP_DIRS.has(entry)) results.push(...walk(path));
    } else if (FILE_RE.test(entry)) {
      results.push(path);
    }
  }
  return results;
}

const problems = [];
for (const file of walk(ROOT)) {
  const text = readFileSync(file, 'utf8');
  text.split(/\r?\n/).forEach((line, index) => {
    if (BAD_TEXT_RE.test(line)) {
      problems.push(`${file}:${index + 1}: corrupted UTF-8 marker`);
      return;
    }
    if (HARDCODED_RE.test(line) && !ALLOWED.some((pattern) => pattern.test(line)) && !line.includes('t(')) {
      problems.push(`${file}:${index + 1}: possible hardcoded visible text`);
    }
  });
}

if (problems.length) {
  console.error(problems.join('\n'));
  process.exit(1);
}

console.log('i18n visible-label scan passed.');
