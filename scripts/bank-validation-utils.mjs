import { readFileSync } from 'node:fs';
import promptNormalization from '../shared/prompt-normalization.js';

export const REQUIRED_ROWS_PER_CATEGORY = 120;
export const REQUIRED_UNIQUE_STEMS_PER_CATEGORY = 120;
export const EXPECTED_CATEGORIES = 7;
export const { normalizePromptStem, findPromptWrapperMatch } = promptNormalization;

export const BANK_PATH = new URL('../bank.json', import.meta.url);
export const REVIEW_METADATA_PATH = new URL('../reports/bank-fact-review.json', import.meta.url);
export const KNOWN_ISSUES_PATH = new URL('../reports/bank-known-issues.json', import.meta.url);

export function readJson(url) {
  return JSON.parse(readFileSync(url, 'utf8'));
}

export function loadBank() {
  return readJson(BANK_PATH);
}

export function loadReviewMetadata() {
  return readJson(REVIEW_METADATA_PATH);
}

export function loadKnownIssues() {
  return readJson(KNOWN_ISSUES_PATH);
}

export function normalizeText(value) {
  return String(value ?? '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
    .toLowerCase();
}

export function tokenizeText(value) {
  return normalizeText(value).split(/\s+/).filter(Boolean);
}

export function uniqueNormalizedOptions(options = []) {
  return new Set(options.map((option) => normalizeText(option)).filter(Boolean));
}

export function buildQuestionKey(category, question, answer) {
  return `${String(category || '').trim().toLowerCase()}::${normalizePromptStem(question)}::${normalizeText(answer)}`;
}

export function buildReviewIndex(reviewMetadata) {
  const factReviews = reviewMetadata?.fact_reviews || [];
  return new Map(
    factReviews.map((entry) => [
      buildQuestionKey(entry.category, entry.prompt_stem, entry.expected_answer),
      entry,
    ]),
  );
}

export function collectBankRows(bank) {
  const rows = [];
  for (const [category, questions] of Object.entries(bank)) {
    if (!Array.isArray(questions)) continue;
    questions.forEach((question, index) => rows.push({ category, index, question }));
  }
  return rows;
}

export function explanationSupportsAnswer(questionRow) {
  const explanation = String(questionRow?.explanation || '');
  const prompt = String(questionRow?.question || '');
  const options = Array.isArray(questionRow?.options) ? questionRow.options : [];
  const correctAnswer = options[questionRow?.correct];
  if (!correctAnswer) {
    return { ok: false, reason: 'missing-correct-answer' };
  }

  const explanationTokens = new Set(tokenizeText(explanation));
  const normalizedExplanation = normalizeText(explanation);
  const answerTokens = tokenizeText(correctAnswer);
  const significantAnswerTokens = answerTokens.filter((token) => token.length >= 3);
  const matchedAnswerTokens = significantAnswerTokens.filter((token) => explanationTokens.has(token));
  const answerAcronym = correctAnswer === correctAnswer.toUpperCase() && /^[A-Z]{2,6}$/.test(correctAnswer)
    ? correctAnswer.toLowerCase()
    : null;
  const explanationInitialism = String(explanation.match(/\b[A-Z][a-z]+/g) || [])
    .split(',')
    .map((part) => part.trim()[0]?.toLowerCase() || '')
    .join('');
  const surnameMentioned = answerTokens.length >= 2 && normalizedExplanation.includes(answerTokens[answerTokens.length - 1]);
  const givenNameMentioned = answerTokens.length >= 2 && normalizedExplanation.includes(answerTokens[0]);
  const keyTokenMentioned = significantAnswerTokens.length > 0 && matchedAnswerTokens.length >= 1;
  const answerMentioned = normalizedExplanation.includes(normalizeText(correctAnswer))
    || (significantAnswerTokens.length > 0 && matchedAnswerTokens.length >= Math.ceil(significantAnswerTokens.length / 2))
    || (answerAcronym && explanationInitialism.includes(answerAcronym))
    || surnameMentioned
    || givenNameMentioned
    || keyTokenMentioned;

  const supportMarkers = [
    'because',
    'since',
    'as',
    'due',
    'refers',
    'means',
    'named',
    'located',
    'capital',
    'written',
    'founded',
    'forged',
    'translates',
    'symbol',
    'stands',
    'serves',
    'begins',
    'called',
    'famous',
  ];
  const hasSupportMarker = supportMarkers.some((marker) => explanationTokens.has(marker));
  const hasRelationalPattern = [
    /\bis the capital(?: city)? of\b/i,
    /\btranslates to\b/i,
    /\bis the standard chemical symbol for\b/i,
    /\bstands on the banks of\b/i,
    /\bis located in\b/i,
    /\bis associated with\b/i,
    /\bmost associated with\b/i,
    /\bis commonly called\b/i,
    /\bserves as\b/i,
    /\bbegins at\b/i,
    /\bbelongs to\b/i,
    /\bis renowned for\b/i,
    /\bis famous for\b/i,
    /\bis .* largest\b/i,
    /\bis .* smallest\b/i,
    /\bis .* deepest\b/i,
    /\bis .* closest\b/i,
    /\bis .* most populous\b/i,
    /\bis .* leading\b/i,
    /\bis .* chief\b/i,
  ].some((pattern) => pattern.test(explanation));

  const distractors = options.filter((_, index) => index !== questionRow.correct);
  const distractorMentions = distractors.filter((option) => {
    const normalizedOption = normalizeText(option);
    return normalizedOption && normalizedOption.length >= 8 && normalizedExplanation.includes(normalizedOption);
  });

  const hasContrastLanguage = /\b(unlike|rather than|instead of|less correct|more correct|whereas|not\b|while the others|among the options|correct because)\b/i.test(explanation);
  const explanationWordCount = tokenizeText(explanation).length;
  const explanationIsDetailedEnough = explanationWordCount >= 4;
  const promptNeedsReasoning = /\bwhy\b|\bapproximate\b|\bmost\b|\blargest\b|\bsmallest\b|\bclosest\b|\bdeepest\b|\bearliest\b|\bfamous for\b/i.test(prompt);

  if (!answerMentioned) {
    return { ok: false, reason: 'answer-not-supported' };
  }

  if (distractorMentions.length >= 2 && !hasContrastLanguage) {
    return { ok: false, reason: 'distractors-mentioned-without-comparison' };
  }

  if (!explanationIsDetailedEnough) {
    return { ok: false, reason: 'explanation-too-thin' };
  }

  if (promptNeedsReasoning && !hasSupportMarker && !hasRelationalPattern && !hasContrastLanguage) {
    return { ok: false, reason: 'explanation-too-thin' };
  }

  if (!hasSupportMarker && !hasRelationalPattern && !hasContrastLanguage && explanationWordCount < 5) {
    return { ok: false, reason: 'explanation-too-thin' };
  }

  return { ok: true, reason: distractorMentions.length > 0 ? 'supported-with-distractor-context' : 'supported-answer' };
}

export function summarizeReviewCoverage(bank, reviewIndex) {
  let reviewedRows = 0;
  let totalRows = 0;
  for (const { category, question } of collectBankRows(bank)) {
    const expectedAnswer = question?.options?.[question?.correct];
    if (!expectedAnswer) continue;
    totalRows += 1;
    if (reviewIndex.has(buildQuestionKey(category, question.question, expectedAnswer))) {
      reviewedRows += 1;
    }
  }
  return {
    reviewedRows,
    totalRows,
    fullyReviewed: totalRows > 0 && reviewedRows === totalRows,
  };
}
