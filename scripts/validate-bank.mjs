import { readFileSync } from 'node:fs';
import promptNormalization from '../shared/prompt-normalization.js';
import { buildBank } from './rebuild-bank.mjs';

const REQUIRED_ROWS_PER_CATEGORY = 120;
const REQUIRED_UNIQUE_STEMS_PER_CATEGORY = 120;
const EXPECTED_CATEGORIES = 7;
const { normalizePromptStem } = promptNormalization;

const bank = JSON.parse(readFileSync(new URL('../bank.json', import.meta.url), 'utf8'));
const canonicalBank = buildBank();

function normalizeText(value) {
  return String(value ?? '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
    .toLowerCase();
}

function explanationMentionsAnswer(explanation, answer) {
  const normalizedAnswer = normalizeText(answer);
  if (!normalizedAnswer) return true;
  return normalizeText(explanation).includes(normalizedAnswer);
}

let errorCount = 0;
const summaries = [];

if (JSON.stringify(bank) !== JSON.stringify(canonicalBank)) {
  console.error('bank.json does not exactly match the canonical output from scripts/rebuild-bank.mjs');
  errorCount += 1;
}

for (const [category, questions] of Object.entries(bank)) {
  const canonicalQuestions = canonicalBank[category];

  if (!Array.isArray(questions)) {
    console.error(`Category ${category} is not an array of questions`);
    errorCount += 1;
    continue;
  }

  if (!Array.isArray(canonicalQuestions)) {
    console.error(`Category ${category} is not present in the canonical generated bank`);
    errorCount += 1;
    continue;
  }

  const seenExact = new Set();
  const canonicalByQuestion = new Map(canonicalQuestions.map((question) => [question.question, question]));
  const canonicalStemSet = new Set(canonicalQuestions.map((question) => normalizePromptStem(question.question)));

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

    const correctOption = q.options[q.correct];
    if (typeof correctOption !== 'string' || !correctOption.trim()) {
      console.error(`Correct option is empty in ${category}[${idx}]: ${q.question}`);
      errorCount += 1;
    }

    const normalizedStem = normalizePromptStem(q.question);
    if (!canonicalStemSet.has(normalizedStem)) {
      console.error(`Question stem is missing from canonical source set in ${category}[${idx}]: ${q.question}`);
      errorCount += 1;
      return;
    }

    const canonicalQuestion = canonicalByQuestion.get(q.question);
    if (!canonicalQuestion) {
      console.error(`Question text drifted from canonical source in ${category}[${idx}]: ${q.question}`);
      errorCount += 1;
      return;
    }

    const expectedAnswer = canonicalQuestion.options[canonicalQuestion.correct];
    if (
      explanationMentionsAnswer(canonicalQuestion.explanation, expectedAnswer)
      && !explanationMentionsAnswer(q.explanation, expectedAnswer)
    ) {
      console.error(`Explanation does not reference canonical answer in ${category}[${idx}]: ${q.question}`);
      errorCount += 1;
    }
  });

  const uniquePromptCount = new Set(questions.map((q) => normalizePromptStem(q.question))).size;
  summaries.push({ category, rowCount: questions.length, uniquePromptCount });

  if (questions.length !== REQUIRED_ROWS_PER_CATEGORY) {
    console.error(`Category ${category} has ${questions.length} rows; expected exactly ${REQUIRED_ROWS_PER_CATEGORY}`);
    errorCount += 1;
  }

  if (uniquePromptCount !== REQUIRED_UNIQUE_STEMS_PER_CATEGORY) {
    console.error(
      `Category ${category} has ${uniquePromptCount} unique prompts; expected exactly ${REQUIRED_UNIQUE_STEMS_PER_CATEGORY}`,
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
