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

  questions.forEach((q, idx) => {
    const valid = q
      && typeof q.question === 'string'
      && q.question.trim()
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

    const promptKey = q.question.trim().toLowerCase();
    if (seenExact.has(promptKey)) {
      console.error(`Duplicate prompt in ${category}[${idx}]: ${q.question}`);
      errorCount += 1;
    }
    seenExact.add(promptKey);
  });

  const uniquePromptCount = seenExact.size;
  summaries.push({ category, rowCount: questions.length, uniquePromptCount });

  if (questions.length !== EXACT_ROWS_PER_CATEGORY) {
    console.error(`Category ${category} has ${questions.length} rows; expected exactly ${EXACT_ROWS_PER_CATEGORY}`);
    errorCount += 1;
  }

  if (uniquePromptCount !== EXACT_UNIQUE_PROMPTS_PER_CATEGORY) {
    console.error(
      `Category ${category} has ${uniquePromptCount} unique prompts; expected exactly ${EXACT_UNIQUE_PROMPTS_PER_CATEGORY}`,
    );
    errorCount += 1;
  }
}

if (Object.keys(bank).length !== EXPECTED_CATEGORIES) {
  console.error(`Bank has ${Object.keys(bank).length} categories; expected exactly ${EXPECTED_CATEGORIES}`);
  errorCount += 1;
}

if (errorCount > 0) process.exit(1);
const totalRows = summaries.reduce((sum, { rowCount }) => sum + rowCount, 0);
const totalUniquePrompts = summaries.reduce((sum, { uniquePromptCount }) => sum + uniquePromptCount, 0);
console.log('Bank OK:');
for (const { category, rowCount, uniquePromptCount } of summaries) {
  console.log(`- ${category}: ${rowCount} rows, ${uniquePromptCount} unique prompts`);
}
console.log(`Total: ${Object.keys(bank).length} categories, ${totalRows} rows, ${totalUniquePrompts} unique prompts validated.`);
