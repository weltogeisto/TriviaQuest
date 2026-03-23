import {
  EXPECTED_CATEGORIES,
  REQUIRED_ROWS_PER_CATEGORY,
  REQUIRED_UNIQUE_STEMS_PER_CATEGORY,
  buildQuestionKey,
  buildReviewIndex,
  explanationSupportsAnswer,
  findPromptWrapperMatch,
  loadBank,
  loadKnownIssues,
  loadReviewMetadata,
  normalizePromptStem,
  normalizeText,
  uniqueNormalizedOptions,
} from './bank-validation-utils.mjs';

const bank = loadBank();
const reviewMetadata = loadReviewMetadata();
const reviewIndex = buildReviewIndex(reviewMetadata);
const knownIssues = loadKnownIssues();

let errorCount = 0;
const summaries = [];

function fail(message) {
  console.error(message);
  errorCount += 1;
}

function checkKnownIssueList(issueList, type, category, q, idx, correctOption) {
  for (const entry of issueList) {
    if (entry.category !== category) continue;
    if (normalizePromptStem(q.question) !== entry.prompt_stem) continue;
    if (normalizeText(correctOption) !== normalizeText(entry.expected_answer)) continue;
    fail(`${type} row still present in ${category}[${idx}]: ${q.question} (${entry.reason})`);
  }
}

for (const [category, questions] of Object.entries(bank)) {
  if (!Array.isArray(questions)) {
    fail(`Category ${category} is not an array of questions`);
    continue;
  }

  const seenExact = new Set();
  const seenNormalized = new Map();

  questions.forEach((q, idx) => {
    const valid = q
      && typeof q.question === 'string'
      && q.question.trim()
      && Array.isArray(q.options)
      && q.options.length === 4
      && q.options.every((option) => typeof option === 'string' && option.trim())
      && Number.isInteger(q.correct)
      && q.correct >= 0
      && q.correct <= 3
      && typeof q.explanation === 'string'
      && q.explanation.trim();

    if (!valid) {
      fail(`Invalid question schema in ${category}[${idx}]`);
      return;
    }

    const promptKey = q.question.trim().toLowerCase();
    if (category === 'wortschatz') {
      const bareTranslationMatch = q.question.match(BARE_TRANSLATION_PROMPT_RE);
      if (bareTranslationMatch && AMBIGUOUS_WORTSCHATZ_TERMS.has(bareTranslationMatch[1])) {
        console.error(`Ambiguous wortschatz item must use sentence context in ${category}[${idx}]: ${q.question}`);
        errorCount += 1;
      }
    }

    if (seenExact.has(promptKey)) {
      fail(`Duplicate prompt in ${category}[${idx}]: ${q.question}`);
    }
    seenExact.add(promptKey);

    const normalizedStem = normalizePromptStem(q.question);
    const normalizedStemCount = (seenNormalized.get(normalizedStem) || 0) + 1;
    seenNormalized.set(normalizedStem, normalizedStemCount);
    if (normalizedStemCount > 1) {
      fail(`Normalized prompt collision in ${category}[${idx}]: ${q.question}`);
    }

    if (findPromptWrapperMatch(q.question)) {
      fail(`Question uses a wrapper prefix and must be rewritten in ${category}[${idx}]: ${q.question}`);
    }

    const uniqueOptions = uniqueNormalizedOptions(q.options);
    if (uniqueOptions.size !== q.options.length) {
      fail(`Options are duplicated after normalization in ${category}[${idx}]: ${q.question}`);
    }

    const correctOption = q.options[q.correct];
    if (!correctOption?.trim()) {
      fail(`Correct option is empty in ${category}[${idx}]: ${q.question}`);
      return;
    }

    const explanationCheck = explanationSupportsAnswer(q);
    if (!explanationCheck.ok) {
      fail(`Explanation quality check failed (${explanationCheck.reason}) in ${category}[${idx}]: ${q.question}`);
    }

    checkKnownIssueList(knownIssues?.ambiguous || [], 'Known ambiguous', category, q, idx, correctOption);
    checkKnownIssueList(knownIssues?.disputed || [], 'Known disputed', category, q, idx, correctOption);

    const reviewKey = buildQuestionKey(category, q.question, correctOption);
    const reviewEntry = reviewIndex.get(reviewKey);
    if (reviewEntry && reviewEntry.status !== 'verified') {
      fail(`Fact review entry is not verified for ${category}[${idx}]: ${q.question}`);
    }
  });

  const uniquePromptCount = new Set(questions.map((q) => normalizePromptStem(q.question))).size;
  summaries.push({ category, rowCount: questions.length, uniquePromptCount });

  if (questions.length !== REQUIRED_ROWS_PER_CATEGORY) {
    fail(`Category ${category} has ${questions.length} rows; expected exactly ${REQUIRED_ROWS_PER_CATEGORY}`);
  }

  if (uniquePromptCount !== REQUIRED_UNIQUE_STEMS_PER_CATEGORY) {
    fail(`Category ${category} has ${uniquePromptCount} unique prompts; expected exactly ${REQUIRED_UNIQUE_STEMS_PER_CATEGORY}`);
  }
}

if (Object.keys(bank).length !== EXPECTED_CATEGORIES) {
  fail(`Bank has ${Object.keys(bank).length} categories; expected exactly ${EXPECTED_CATEGORIES}`);
}

if (errorCount > 0) process.exit(1);
const totalRows = summaries.reduce((sum, { rowCount }) => sum + rowCount, 0);
const totalUniquePrompts = summaries.reduce((sum, { uniquePromptCount }) => sum + uniquePromptCount, 0);
console.log('Bank OK:');
for (const { category, rowCount, uniquePromptCount } of summaries) {
  console.log(`- ${category}: ${rowCount} rows, ${uniquePromptCount} unique prompts`);
}
console.log(`Total: ${Object.keys(bank).length} categories, ${totalRows} rows, ${totalUniquePrompts} unique prompts validated.`);
console.log(`Manual fact reviews recorded: ${reviewMetadata.fact_reviews.length}.`);
