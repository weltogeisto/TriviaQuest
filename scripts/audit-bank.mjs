import { readFileSync } from 'node:fs';

const PRACTICE_VARIANT_SUFFIX = /\s*\(Practice Variant\s+\d+\)\s*$/i;
const WRAPPER_PREFIXES = [
  /^\s*Identify the correct answer for this prompt:\s*/i,
  /^\s*Choose the option that best answers this question:\s*/i,
];

const bank = JSON.parse(readFileSync(new URL('../bank.json', import.meta.url), 'utf8'));

function normalizeStem(text) {
  let normalized = String(text || '').trim().toLowerCase();
  normalized = normalized.replace(PRACTICE_VARIANT_SUFFIX, '').trim();
  for (const prefix of WRAPPER_PREFIXES) normalized = normalized.replace(prefix, '').trim();
  return normalized
    .replace(/([!?.,:;])\1+/g, '$1')
    .replace(/\s*([!?.,:;])\s*/g, '$1 ')
    .replace(/\s+/g, ' ')
    .trim();
}

let totalExactDuplicates = 0;
let totalNormalizedCollisions = 0;
let totalWrapperHits = 0;

console.log('Bank audit:');
for (const [category, questions] of Object.entries(bank)) {
  const exact = new Set();
  const normalizedCounts = new Map();
  let wrapperHits = 0;
  let exactDuplicates = 0;

  for (const q of questions) {
    const prompt = String(q?.question || '').trim();
    const exactKey = prompt.toLowerCase();
    if (exact.has(exactKey)) exactDuplicates += 1;
    exact.add(exactKey);

    if (WRAPPER_PREFIXES.some((prefix) => prefix.test(prompt)) || PRACTICE_VARIANT_SUFFIX.test(prompt)) {
      wrapperHits += 1;
    }

    const normalized = normalizeStem(prompt);
    normalizedCounts.set(normalized, (normalizedCounts.get(normalized) || 0) + 1);
  }

  const normalizedCollisions = [...normalizedCounts.values()].filter((count) => count > 1).length;
  totalExactDuplicates += exactDuplicates;
  totalNormalizedCollisions += normalizedCollisions;
  totalWrapperHits += wrapperHits;

  console.log(`- ${category}: ${questions.length} rows, ${exactDuplicates} exact duplicate prompts, ${normalizedCollisions} normalized-stem collisions, ${wrapperHits} wrapper/variant prompts`);
}
console.log(`Audit totals: ${totalExactDuplicates} exact duplicate prompts, ${totalNormalizedCollisions} normalized-stem collisions, ${totalWrapperHits} wrapper/variant prompts.`);
