import { readFileSync } from 'node:fs';
import promptNormalization from '../shared/prompt-normalization.js';

const REQUIRED_ROWS_PER_CATEGORY = 120;
const REQUIRED_UNIQUE_STEMS_PER_CATEGORY = 120;
const MAX_ALLOWED_VARIANTS_PER_STEM = 1;
const {
  findPromptWrapperMatch,
  normalizePromptStem,
} = promptNormalization;

const bank = JSON.parse(readFileSync(new URL('../bank.json', import.meta.url), 'utf8'));

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

    const wrapperMatch = findPromptWrapperMatch(q.question);
    if (wrapperMatch) {
      console.error(
        `Banned wrapper pattern "${wrapperMatch.name}" in ${category}[${idx}]: ${q.question}`,
      );
      errorCount += 1;
    }

    const normalizedStem = normalizePromptStem(q.question);
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
