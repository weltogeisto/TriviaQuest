import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import {
  buildQuestionKey,
  buildReviewIndex,
  explanationSupportsAnswer,
  findPromptWrapperMatch,
  loadBank,
  loadKnownIssues,
  loadReviewMetadata,
  normalizePromptStem,
  summarizeReviewCoverage,
} from './bank-validation-utils.mjs';

const bank = loadBank();
const reviewMetadata = loadReviewMetadata();
const reviewIndex = buildReviewIndex(reviewMetadata);
const knownIssues = loadKnownIssues();
const today = new Date().toISOString().slice(0, 10);

function loadPackageScripts() {
  return JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')).scripts || {};
}

function issueHit(issueList, category, question, answer) {
  return (issueList || []).find((entry) => (
    entry.category === category
    && entry.prompt_stem === normalizePromptStem(question)
    && String(entry.expected_answer || '').trim().toLowerCase() === String(answer || '').trim().toLowerCase()
  )) || null;
}

let totalExactDuplicates = 0;
let totalNormalizedCollisions = 0;
let totalWrapperHits = 0;
let totalWeakExplanations = 0;
let totalKnownIssueHits = 0;

const byCategory = {};

console.log('Bank audit:');
for (const [category, questions] of Object.entries(bank)) {
  const exact = new Set();
  const normalizedCounts = new Map();
  let wrapperHits = 0;
  let exactDuplicates = 0;
  let weakExplanations = 0;
  let knownIssueHits = 0;

  for (const q of questions) {
    const prompt = String(q?.question || '').trim();
    const exactKey = prompt.toLowerCase();
    if (exact.has(exactKey)) exactDuplicates += 1;
    exact.add(exactKey);

    if (findPromptWrapperMatch(prompt)) wrapperHits += 1;

    const normalized = normalizePromptStem(prompt);
    normalizedCounts.set(normalized, (normalizedCounts.get(normalized) || 0) + 1);

    const explanationResult = explanationSupportsAnswer(q);
    if (!explanationResult.ok) weakExplanations += 1;

    const answer = q?.options?.[q?.correct];
    if (issueHit(knownIssues.ambiguous, category, prompt, answer) || issueHit(knownIssues.disputed, category, prompt, answer)) {
      knownIssueHits += 1;
    }
  }

  const normalizedCollisions = [...normalizedCounts.values()].filter((count) => count > 1).length;
  totalExactDuplicates += exactDuplicates;
  totalNormalizedCollisions += normalizedCollisions;
  totalWrapperHits += wrapperHits;
  totalWeakExplanations += weakExplanations;
  totalKnownIssueHits += knownIssueHits;

  byCategory[category] = {
    rows: questions.length,
    exact_duplicate_prompts: exactDuplicates,
    normalized_stem_collisions: normalizedCollisions,
    wrapper_variant_prompts: wrapperHits,
    explanation_quality_failures: weakExplanations,
    known_issue_hits: knownIssueHits,
  };

  console.log(`- ${category}: ${questions.length} rows, ${exactDuplicates} exact duplicate prompts, ${normalizedCollisions} normalized-stem collisions, ${wrapperHits} wrapper prompts, ${weakExplanations} explanation-quality failures, ${knownIssueHits} known-issue hits`);
}

const reviewCoverage = summarizeReviewCoverage(bank, reviewIndex);
const fullyFactReviewed = reviewCoverage.fullyReviewed;
const internallyConsistent = totalExactDuplicates === 0
  && totalNormalizedCollisions === 0
  && totalWrapperHits === 0
  && totalWeakExplanations === 0
  && totalKnownIssueHits === 0;

const packageScripts = loadPackageScripts();
const report = {
  audit_date: today,
  status: internallyConsistent ? (fullyFactReviewed ? 'FACT_REVIEWED_PASS' : 'INTERNALLY_CONSISTENT_PASS') : 'FAIL',
  scope: {
    categories: Object.keys(bank).length,
    rows_per_category: 120,
    total_rows: Object.values(bank).reduce((sum, questions) => sum + questions.length, 0),
  },
  method: {
    executed_commands: [
      `node scripts/validate-bank.mjs`,
      `node scripts/audit-bank.mjs`,
    ],
    npm_scripts: packageScripts,
    notes: [
      'Validation now checks shipped bank.json directly for schema/integrity, duplicate/normalization, explanation quality, and known-issue failures.',
      fullyFactReviewed
        ? 'All rows have matching manual fact-review metadata entries, so the bank can be described as fact-reviewed.'
        : 'The bank is internally consistent, but not every row has passed the stricter manual fact-review stage yet.',
    ],
  },
  summary: {
    result: internallyConsistent ? (fullyFactReviewed ? 'FACT_REVIEWED_PASS' : 'INTERNALLY_CONSISTENT_PASS') : 'FAIL',
    internally_consistent: internallyConsistent,
    fact_review_passed: fullyFactReviewed,
    fact_review_coverage: reviewCoverage,
    categories: byCategory,
    known_issue_catalog_sizes: {
      ambiguous: (knownIssues.ambiguous || []).length,
      disputed: (knownIssues.disputed || []).length,
    },
  },
  reviewed_fact_keys: reviewMetadata.fact_reviews.map((entry) => buildQuestionKey(entry.category, entry.prompt_stem, entry.expected_answer)),
};

const reportPath = new URL(`../reports/bank-quality-audit-${today}.json`, import.meta.url);
writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);

console.log(`Audit totals: ${totalExactDuplicates} exact duplicate prompts, ${totalNormalizedCollisions} normalized-stem collisions, ${totalWrapperHits} wrapper prompts, ${totalWeakExplanations} explanation-quality failures, ${totalKnownIssueHits} known-issue hits.`);
console.log(`Fact review coverage: ${reviewCoverage.reviewedRows}/${reviewCoverage.totalRows} rows.`);
console.log(`Wrote ${fileURLToPath(reportPath)}.`);
