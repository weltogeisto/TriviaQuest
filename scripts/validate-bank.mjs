import { readFileSync } from 'node:fs';

const REQUIRED_ROWS_PER_CATEGORY = 120;
const REQUIRED_UNIQUE_STEMS_PER_CATEGORY = 120;
const MAX_ALLOWED_VARIANTS_PER_STEM = 1;
const PRACTICE_VARIANT_SUFFIX = /\s*\(Practice Variant\s+\d+\)\s*$/i;
const WRAPPER_PREFIXES = [
  /^\s*Identify the correct answer for this prompt:\s*/i,
  /^\s*Choose the option that best answers this question:\s*/i,
];

const bank = JSON.parse(readFileSync(new URL('../bank.json', import.meta.url), 'utf8'));

function normalizeStem(text) {
  let normalized = String(text || '').trim().toLowerCase();
  normalized = normalized.replace(PRACTICE_VARIANT_SUFFIX, '').trim();
  for (const prefix of WRAPPER_PREFIXES) {
    normalized = normalized.replace(prefix, '').trim();
  }
  normalized = normalized
    .replace(/([!?.,:;])\1+/g, '$1')
    .replace(/\s*([!?.,:;])\s*/g, '$1 ')
    .replace(/\s+/g, ' ')
    .trim();
  return normalized;
}

let errorCount = 0;
const summaries = [];

for (const [category, questions] of Object.entries(bank)) {
  if (!Array.isArray(questions)) {
    console.error(`Category ${category} is not an array of questions`);
    errorCount += 1;
    continue;
  }

  const seenExact = new Set();
  const stemCounts = new Map();

  questions.forEach((q, idx) => {
    const valid = q
      && typeof q.question === 'string'
      && Array.isArray(q.options)
      && q.options.length === 4
      && Number.isInteger(q.correct)
      && q.correct >= 0
      && q.correct <= 3;

    if (!valid) {
      console.error(`Invalid question schema in ${category}[${idx}]`);
      errorCount += 1;
      return;
    }

    const exactQuestionText = q.question.trim();
    if (seenExact.has(exactQuestionText)) {
      console.error(`Exact duplicate question in ${category}[${idx}]: ${q.question}`);
      errorCount += 1;
    }
    seenExact.add(exactQuestionText);

    const normalizedStem = normalizeStem(q.question);
    stemCounts.set(normalizedStem, (stemCounts.get(normalizedStem) || 0) + 1);
  });

  const uniqueStemCount = stemCounts.size;
  summaries.push({ category, rowCount: questions.length, uniqueStemCount });

  if (questions.length !== REQUIRED_ROWS_PER_CATEGORY) {
    console.error(`Category ${category} has ${questions.length} rows; expected exactly ${REQUIRED_ROWS_PER_CATEGORY}`);
    errorCount += 1;
  }

  if (uniqueStemCount !== REQUIRED_UNIQUE_STEMS_PER_CATEGORY) {
    console.error(
      `Category ${category} has ${uniqueStemCount} unique normalized prompts; expected exactly ${REQUIRED_UNIQUE_STEMS_PER_CATEGORY} for shipped gameplay`,
    );
    errorCount += 1;
  }

  for (const [normalizedStem, count] of stemCounts.entries()) {
    if (count > MAX_ALLOWED_VARIANTS_PER_STEM) {
      console.error(
        `Category ${category} repeats normalized stem "${normalizedStem}" across ${count} rows; allowed maximum is ${MAX_ALLOWED_VARIANTS_PER_STEM}`,
      );
      errorCount += 1;
    }
  }
}

if (errorCount > 0) process.exit(1);
const totalRows = summaries.reduce((sum, { rowCount }) => sum + rowCount, 0);
const totalUniqueStems = summaries.reduce((sum, { uniqueStemCount }) => sum + uniqueStemCount, 0);
const expectedTotalRows = summaries.length * REQUIRED_ROWS_PER_CATEGORY;
const expectedTotalUniqueStems = summaries.length * REQUIRED_UNIQUE_STEMS_PER_CATEGORY;
console.log('Bank OK:');
for (const { category, rowCount, uniqueStemCount } of summaries) {
  console.log(`- ${category}: ${rowCount}/${REQUIRED_ROWS_PER_CATEGORY} rows, ${uniqueStemCount}/${REQUIRED_UNIQUE_STEMS_PER_CATEGORY} unique normalized prompts`);
}
console.log(`Total: ${Object.keys(bank).length} categories, ${totalRows}/${expectedTotalRows} rows, ${totalUniqueStems}/${expectedTotalUniqueStems} unique normalized prompts validated.`);
